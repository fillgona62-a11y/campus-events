/**
 * 报名服务：报名/取消/审核事务逻辑（防超卖防重复核心）+ 候补递补（F5）。
 *
 * 防重复：UNIQUE(event_id, user_id) 数据库兜底 + 服务层前置校验。
 * 防超卖：直接报名、审核通过、递补占用全部在事务内执行单条条件 UPDATE
 *        （capacity=0 或 approved_count+delta ≤ capacity 才生效），
 *        SQLite 单写者串行化天然避免超卖。
 * 名额时机：require_approval=0 报名时立即占名额；require_approval=1 时
 *          名额延迟到发布者 approve 才原子占用。
 * 候补（v2）：直接报名活动满员时不再报错，转入 waitlisted 并返回顺位；
 *          取消 approved 时同事务自动递补最早候补者（占名额失败则保留候补）；
 *          组织者/管理员可手动提升（占名额 + 转正）或移出（转 cancelled）。
 */
const db = require('../db/connection');
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const notificationService = require('./notificationService');
const { ApiError } = require('../utils/response');
const {
  ERR,
  EVENT_STATUS,
  REG_STATUS,
  isAdminRole,
  NOTIFICATION_TYPE,
} = require('../utils/constants');

/**
 * 学生报名活动（整体包事务）。
 * @returns {{registration:object, waitlisted:boolean, waitlist_position:number|null}}
 */
function register(userId, eventId, remark) {
  const tx = db.transaction(() => {
    const event = eventModel.findById(eventId);
    if (!event) throw ApiError.notFound('活动不存在');

    // 活动状态校验：仅已发布活动可报名
    if (event.status !== EVENT_STATUS.APPROVED) {
      throw new ApiError(ERR.INVALID_EVENT_STATE, '活动当前不可报名', 409);
    }
    // 报名截止校验（服务端以 UTC 比较）
    const now = new Date().toISOString();
    if (now >= event.signup_deadline) {
      throw new ApiError(ERR.SIGNUP_CLOSED, '报名已截止', 409);
    }

    // 防重复：已存在待审核/已成功/候补中记录则拒绝
    const existing = registrationModel.findByEventAndUser(eventId, userId);
    if (
      existing &&
      (existing.status === REG_STATUS.PENDING ||
        existing.status === REG_STATUS.APPROVED ||
        existing.status === REG_STATUS.WAITLISTED)
    ) {
      throw new ApiError(ERR.ALREADY_REGISTERED, '已报名，请勿重复提交', 409);
    }

    if (event.require_approval === 1) {
      // 需审核：先入 pending，名额在发布者 approve 时才占用
      const registration = registrationModel.upsert({
        event_id: eventId,
        user_id: userId,
        remark,
        status: REG_STATUS.PENDING,
      });
      return { registration, waitlisted: false, waitlist_position: null };
    }

    // 直接报名：事务内原子占用名额，影响 0 行即名额已满 → 转候补（F5）
    const affected = eventModel.bumpApprovedCount(eventId, 1, true);
    if (affected === 0) {
      const registration = registrationModel.upsert({
        event_id: eventId,
        user_id: userId,
        remark,
        status: REG_STATUS.WAITLISTED,
      });
      const position = registrationModel.waitlistPosition(eventId, registration.id);
      return { registration, waitlisted: true, waitlist_position: position };
    }
    const registration = registrationModel.upsert({
      event_id: eventId,
      user_id: userId,
      remark,
      status: REG_STATUS.APPROVED,
    });
    return { registration, waitlisted: false, waitlist_position: null };
  });

  return tx();
}

/**
 * 取消报名：仅本人、仅报名截止前可取消。
 * - approved：事务内释放名额（-1）+ 取最早候补者条件占名额转 approved（同事务递补）。
 * - waitlisted / pending：直接置 cancelled，不动名额。
 * @returns {{promoted:boolean}}
 */
function cancel(userId, registrationId) {
  let promoted = null;

  const tx = db.transaction(() => {
    const registration = registrationModel.findById(registrationId);
    if (!registration) throw ApiError.notFound('报名记录不存在');
    if (registration.user_id !== userId) throw ApiError.forbidden('只能取消自己的报名');
    if (
      registration.status !== REG_STATUS.PENDING &&
      registration.status !== REG_STATUS.APPROVED &&
      registration.status !== REG_STATUS.WAITLISTED
    ) {
      throw new ApiError(ERR.INVALID_EVENT_STATE, '当前报名状态不可取消', 409);
    }

    const event = eventModel.findById(registration.event_id);
    if (!event) throw ApiError.notFound('活动不存在');
    const now = new Date().toISOString();
    if (now >= event.signup_deadline) {
      throw new ApiError(ERR.SIGNUP_CLOSED, '报名已截止，不可取消', 409);
    }

    if (registration.status === REG_STATUS.APPROVED) {
      // 释放名额（不附带容量检查，直接 -1）
      eventModel.bumpApprovedCount(registration.event_id, -1, false);
      registrationModel.updateStatus(registrationId, REG_STATUS.CANCELLED);

      // 同事务递补：取最早候补者，条件 UPDATE 占名额（失败则保留候补）
      const first = registrationModel.findFirstWaitlisted(registration.event_id);
      if (first) {
        const affected = eventModel.bumpApprovedCount(registration.event_id, 1, true);
        if (affected > 0) {
          registrationModel.updateStatus(first.id, REG_STATUS.APPROVED);
          promoted = { user_id: first.user_id, event_title: event.title };
        }
      }
    } else {
      // 候补中/待审核取消：直接置 cancelled，不动名额
      registrationModel.updateStatus(registrationId, REG_STATUS.CANCELLED);
    }
  });

  tx();

  // 递补成功后站内信通知被递补者（事务外发送，失败不影响取消结果）
  if (promoted) {
    notificationService.send(
      promoted.user_id,
      NOTIFICATION_TYPE.WAITLIST_PROMOTED,
      '候补递补成功',
      `您报名的活动「${promoted.event_title}」已有名额释放，您已从候补名单自动递补为报名成功！`
    );
  }
  return { promoted: Boolean(promoted) };
}

/**
 * 发布者审核报名：仅 require_approval=1 活动的 pending 报名。
 * approve：事务内原子占用名额，满员返回 40903；reject：直接置为已拒绝。
 * 结果站内信通知报名人。
 */
function review(organizerId, registrationId, action) {
  const registration = registrationModel.findById(registrationId);
  if (!registration) throw ApiError.notFound('报名记录不存在');
  const event = eventModel.findById(registration.event_id);
  if (!event) throw ApiError.notFound('活动不存在');
  if (event.organizer_id !== organizerId) {
    throw ApiError.forbidden('仅活动发布者可审核报名');
  }
  if (event.require_approval !== 1) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '该活动未开启报名审核', 409);
  }
  if (registration.status !== REG_STATUS.PENDING) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '该报名不在待审核状态', 409);
  }

  if (action === 'approve') {
    const tx = db.transaction(() => {
      // 审核通过时才原子占用名额
      const affected = eventModel.bumpApprovedCount(registration.event_id, 1, true);
      if (affected === 0) {
        throw new ApiError(ERR.EVENT_FULL, '名额已满，无法通过该报名', 409);
      }
      registrationModel.updateStatus(registrationId, REG_STATUS.APPROVED);
    });
    tx();
    notificationService.send(
      registration.user_id,
      NOTIFICATION_TYPE.REGISTRATION_APPROVED,
      '报名审核通过',
      `您报名的活动「${event.title}」已通过审核，报名成功！活动时间：${event.start_time}`
    );
  } else {
    registrationModel.updateStatus(registrationId, REG_STATUS.REJECTED);
    notificationService.send(
      registration.user_id,
      NOTIFICATION_TYPE.REGISTRATION_REJECTED,
      '报名未通过',
      `很抱歉，您报名的活动「${event.title}」未通过发布者审核。`
    );
  }

  return registrationModel.findById(registrationId);
}

/** 断言操作为活动发布者或管理员 */
function assertEventManagePermission(operator, event) {
  if (operator.id !== event.organizer_id && !isAdminRole(operator.role)) {
    throw ApiError.forbidden('仅活动发布者或管理员可执行该操作');
  }
}

/**
 * 手动提升候补（F5，发布者/管理员）：
 * 校验 status=waitlisted（否则 40905）→ 事务内条件 UPDATE 占名额（失败 40903）
 * → 转 approved → 站内信通知。
 */
function promoteWaitlist(operator, registrationId) {
  let promoted = null;
  const tx = db.transaction(() => {
    const registration = registrationModel.findById(registrationId);
    if (!registration) throw ApiError.notFound('报名记录不存在');
    const event = eventModel.findById(registration.event_id);
    if (!event) throw ApiError.notFound('活动不存在');
    assertEventManagePermission(operator, event);
    if (registration.status !== REG_STATUS.WAITLISTED) {
      throw new ApiError(ERR.INVALID_EVENT_STATE, '该报名不在候补状态', 409);
    }
    const affected = eventModel.bumpApprovedCount(registration.event_id, 1, true);
    if (affected === 0) {
      throw new ApiError(ERR.EVENT_FULL, '名额已满，无法提升', 409);
    }
    registrationModel.updateStatus(registrationId, REG_STATUS.APPROVED);
    promoted = { user_id: registration.user_id, event_title: event.title };
  });
  tx();

  notificationService.send(
    promoted.user_id,
    NOTIFICATION_TYPE.WAITLIST_PROMOTED,
    '候补提升成功',
    `恭喜！您报名的活动「${promoted.event_title}」已由组织者将您从候补名单提升为报名成功！`
  );
  return registrationModel.findById(registrationId);
}

/**
 * 移出候补（F5，发布者/管理员）：
 * 校验 status=waitlisted（否则 40905）→ 置 cancelled（不发站内信）。
 */
function removeWaitlist(operator, registrationId) {
  const registration = registrationModel.findById(registrationId);
  if (!registration) throw ApiError.notFound('报名记录不存在');
  const event = eventModel.findById(registration.event_id);
  if (!event) throw ApiError.notFound('活动不存在');
  assertEventManagePermission(operator, event);
  if (registration.status !== REG_STATUS.WAITLISTED) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '该报名不在候补状态', 409);
  }
  registrationModel.updateStatus(registrationId, REG_STATUS.CANCELLED);
}

module.exports = { register, cancel, review, promoteWaitlist, removeWaitlist };
