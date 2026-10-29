/**
 * 活动服务：活动状态机迁移（提交/审核/下架/取消）的唯一入口。
 * 状态机：pending → approved / rejected；approved → offline / cancelled。
 * 编辑已提交活动后重置为 pending 重新审核（防绕过审核改内容）。
 */
const sanitizeHtml = require('sanitize-html');
const eventModel = require('../models/eventModel');
const notificationService = require('./notificationService');
const auditService = require('./auditService');
const registrationModel = require('../models/registrationModel');
const { ApiError } = require('../utils/response');
const {
  ERR,
  EVENT_STATUS,
  NOTIFICATION_TYPE,
  REG_STATUS,
  AUDIT_ACTION,
} = require('../utils/constants');

/**
 * 富文本服务端白名单过滤（防 XSS）。
 * img 仅允许站内 /uploads 路径，防外链图片追踪与恶意加载。
 */
function sanitizeDescription(html) {
  if (!html) return null;
  return sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'img'],
    allowedAttributes: {
      a: ['href', 'target', 'rel'],
      img: ['src', 'alt'],
    },
    allowedSchemes: ['http', 'https'],
    exclusiveFilter: (frame) => {
      // img 的 src 必须是站内 /uploads/ 路径，否则丢弃该标签
      if (frame.tag === 'img') {
        const src = frame.attribs.src || '';
        return !src.startsWith('/uploads/');
      }
      return false;
    },
  });
}

/** 将可解析的时间字符串统一转为 ISO 8601 UTC */
function toIso(timeStr) {
  return new Date(timeStr).toISOString();
}

/** 组装入库 payload：时间统一 UTC ISO，富文本过滤 */
function buildPayload(payload) {
  return {
    title: payload.title,
    category_id: payload.category_id,
    cover_url: payload.cover_url || null,
    location: payload.location,
    start_time: toIso(payload.start_time),
    end_time: toIso(payload.end_time),
    signup_deadline: toIso(payload.signup_deadline),
    capacity: payload.capacity,
    require_approval: payload.require_approval ? 1 : 0,
    description: sanitizeDescription(payload.description),
    lat: payload.lat ?? null,
    lng: payload.lng ?? null,
    checkin_radius: payload.checkin_radius ?? 0.2,
  };
}

/**
 * 创建活动（初始待审核）
 */
function create(organizerId, payload) {
  return eventModel.insert({ ...buildPayload(payload), organizer_id: organizerId });
}

/**
 * 编辑活动：仅发布者本人、活动开始前可改；改后重置 pending 重新审核。
 */
function update(organizerId, eventId, payload) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  if (event.organizer_id !== organizerId) throw ApiError.forbidden('只能编辑自己发布的活动');
  if (event.status === EVENT_STATUS.OFFLINE || event.status === EVENT_STATUS.CANCELLED) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '活动已下架或取消，不可编辑', 409);
  }
  const now = new Date().toISOString();
  if (now >= event.start_time) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '活动已开始，不可修改', 409);
  }
  return eventModel.update(eventId, buildPayload(payload));
}

/**
 * 取消活动：发布者本人；待审核/已发布状态可取消；
 * 取消后向全部报名成功用户发站内信。
 */
function cancel(organizerId, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  if (event.organizer_id !== organizerId) throw ApiError.forbidden('只能取消自己发布的活动');
  if (event.status !== EVENT_STATUS.PENDING && event.status !== EVENT_STATUS.APPROVED) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '当前活动状态不允许取消', 409);
  }
  eventModel.updateStatus(eventId, EVENT_STATUS.CANCELLED);

  // 通知全部报名成功用户
  const userIds = registrationModel.listUserIdsByEventAndStatus(eventId, REG_STATUS.APPROVED);
  notificationService.sendMany(
    userIds,
    NOTIFICATION_TYPE.EVENT_CANCELLED,
    '活动已取消',
    `您报名的活动「${event.title}」已被发布者取消，请留意后续安排。`
  );
}

/**
 * 管理员审核活动：仅 pending 状态可审。
 * approve → approved；reject → rejected（必填理由）。结果站内信通知发布者，并写审计日志（F6）。
 */
function review(adminId, eventId, action, reason) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  if (event.status !== EVENT_STATUS.PENDING) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '该活动不在待审核状态', 409);
  }

  if (action === 'approve') {
    eventModel.updateStatus(eventId, EVENT_STATUS.APPROVED);
    notificationService.send(
      event.organizer_id,
      NOTIFICATION_TYPE.EVENT_APPROVED,
      '活动审核通过',
      `您发布的活动「${event.title}」已审核通过并上线。`
    );
    auditService.log(adminId, AUDIT_ACTION.EVENT_REVIEW_APPROVE, 'event', eventId, null);
  } else {
    eventModel.updateStatus(eventId, EVENT_STATUS.REJECTED, reason);
    notificationService.send(
      event.organizer_id,
      NOTIFICATION_TYPE.EVENT_REJECTED,
      '活动审核未通过',
      `您发布的活动「${event.title}」未通过审核。拒绝理由：${reason}`
    );
    auditService.log(adminId, AUDIT_ACTION.EVENT_REVIEW_REJECT, 'event', eventId, { reason });
  }
  return eventModel.findById(eventId);
}

/**
 * 管理员下架活动：仅 approved 状态可下架；下架后对公众不可见，站内信通知发布者，并写审计日志（F6）。
 */
function offline(adminId, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  if (event.status !== EVENT_STATUS.APPROVED) {
    throw new ApiError(ERR.INVALID_EVENT_STATE, '仅已发布的活动可下架', 409);
  }
  eventModel.updateStatus(eventId, EVENT_STATUS.OFFLINE);
  notificationService.send(
    event.organizer_id,
    NOTIFICATION_TYPE.EVENT_OFFLINE,
    '活动已被下架',
    `您发布的活动「${event.title}」已被管理员下架，如有疑问请联系管理员。`
  );
  auditService.log(adminId, AUDIT_ACTION.EVENT_OFFLINE, 'event', eventId, null);
}

module.exports = { create, update, cancel, review, offline };
