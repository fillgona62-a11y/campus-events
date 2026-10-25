/**
 * 签到核销服务（F4）：
 * - 口令生成/查看：活动开始后可操作，一活动一口令（6 位数字，重复生成覆盖旧值）。
 * - 核销校验链（按序）：时间窗 → 口令 → 已报名（approved）→ 未核销。
 * - 核销统计：approved 总数 / 已核销 / 未核销。
 */
const crypto = require('crypto');
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const userModel = require('../models/userModel');
const { ApiError } = require('../utils/response');
const { ERR, REG_STATUS, isAdminRole } = require('../utils/constants');

/** 生成 6 位数字核销口令 */
function randomCode() {
  return String(crypto.randomInt(100000, 999999));
}

/**
 * 生成/重生成核销口令（发布者/管理员；活动开始后可生成）。
 * @returns {{checkin_code:string}}
 */
function generateCode(operator, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  assertEventManagePermission(operator, event);
  assertEventStarted(event);
  const code = randomCode();
  eventModel.setCheckinCode(eventId, code);
  return { checkin_code: code };
}

/**
 * 查看核销口令（发布者/管理员；活动开始后可查看）。
 * @returns {{checkin_code:string|null}}
 */
function getCode(operator, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  assertEventManagePermission(operator, event);
  assertEventStarted(event);
  return { checkin_code: event.checkin_code || null };
}

/**
 * 核销：学号 + 口令。校验链按序执行：**授权（发布者/管理员）→ 时间窗 → 口令 →
 * 已报名（approved）→ 未核销**，全部满足才落库。
 * @param {object} operator 当前登录用户（req.user，限活动发布者或管理员）
 * @param {number} eventId
 * @param {{student_id:string, code:string}} payload
 * @returns {{student_id:string, name:string, checked_in_at:string}}
 */
function checkin(operator, eventId, { student_id, code }) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');

  // 0. 授权优先：仅活动发布者或管理员可核销（设计 §5.3-⑫）
  assertEventManagePermission(operator, event);

  // 1. 时间窗：开始前不可核销，结束后不可核销
  const now = new Date().toISOString();
  if (now < event.start_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动未开始，暂不能核销', 409);
  }
  if (now > event.end_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动已结束，无法核销', 409);
  }

  // 2. 口令：存在且与入参一致
  if (!event.checkin_code || event.checkin_code !== code) {
    throw new ApiError(ERR.CHECKIN_CODE_WRONG, '核销口令不正确', 400);
  }

  // 3. 学号对应用户存在，且该活动报名状态为 approved
  const user = userModel.findByStudentId(student_id);
  const registration =
    user && registrationModel.findByEventAndUser(eventId, user.id);
  if (!registration || registration.status !== REG_STATUS.APPROVED) {
    throw new ApiError(ERR.NOT_REGISTERED, '该学号未成功报名此活动', 409);
  }

  // 4. 未核销
  if (registration.checked_in === 1) {
    throw new ApiError(ERR.ALREADY_CHECKED_IN, '该同学已核销，请勿重复操作', 409);
  }

  const checkedInAt = new Date().toISOString();
  registrationModel.markCheckedIn(registration.id, checkedInAt);
  return { student_id: user.student_id, name: user.name, checked_in_at: checkedInAt };
}

/**
 * 核销统计：approved 总数 / 已核销 / 未核销（发布者/管理员）。
 */
function stats(operator, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  assertEventManagePermission(operator, event);
  const approvedCount = registrationModel.countByEventAndStatus(eventId, REG_STATUS.APPROVED);
  const checkedInCount = registrationModel.countByEventStatusCheckedIn(
    eventId,
    REG_STATUS.APPROVED,
    1
  );
  return {
    approved_count: approvedCount,
    checked_in_count: checkedInCount,
    unchecked_count: approvedCount - checkedInCount,
  };
}

/** 断言操作者为活动发布者或管理员 */
function assertEventManagePermission(operator, event) {
  if (operator.id !== event.organizer_id && !isAdminRole(operator.role)) {
    throw ApiError.forbidden('仅活动发布者或管理员可执行该操作');
  }
}

/** 断言活动已开始（now >= start_time），否则 40911 */
function assertEventStarted(event) {
  const now = new Date().toISOString();
  if (now < event.start_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动未开始，暂不能生成核销口令', 409);
  }
}

module.exports = { generateCode, getCode, checkin, stats };
