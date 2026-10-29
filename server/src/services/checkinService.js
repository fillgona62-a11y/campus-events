/**
 * 签到核销服务（v5 定位签到）：
 * - 学生到场后提交自己的实时定位（lat/lng），服务端计算与活动地点距离，
 *   在签到半径内（默认 200 米）且已报名成功、未核销，即核销到场。
 * - 校验链（按序）：授权 → 时间窗 → 活动已设定位 → 已报名（approved）→ 未核销 → 距离在半径内。
 *
 * v5 起由「口令 + 扫码」签到彻底替换为「定位」签到：
 * 旧的 checkin_code / 口令相关字段与接口不再使用（保留数据兼容，不删除）。
 */
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const userModel = require('../models/userModel');
const { ApiError } = require('../utils/response');
const { ERR, REG_STATUS, isAdminRole } = require('../utils/constants');
const { distanceMeters } = require('../utils/geo');

/**
 * 学生定位签到（v5）。
 * @param {object} operator 当前登录用户（req.user，限活动发布者或管理员——代签场景）
 * @param {number} eventId
 * @param {{student_id:string, lat:number, lng:number}} payload
 * @returns {{student_id:string, name:string, checked_in_at:string, distance_m:number}}
 */
function checkin(operator, eventId, { student_id, lat, lng }) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');

  // 0. 授权：仅活动发布者或管理员可核销
  assertEventManagePermission(operator, event);

  // 1. 时间窗：开始前/结束后不可核销
  const now = new Date().toISOString();
  if (now < event.start_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动未开始，暂不能签到', 409);
  }
  if (now > event.end_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动已结束，无法签到', 409);
  }

  // 2. 活动须已设置定位坐标
  if (event.lat == null || event.lng == null) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '该活动未设置签到地点，无法定位签到', 409);
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
    throw new ApiError(ERR.ALREADY_CHECKED_IN, '该同学已签到，请勿重复操作', 409);
  }

  // 5. 定位校验：学生位置与活动地点距离须在签到半径内
  const radiusM = (event.checkin_radius || 0.2) * 1000;
  const distance = distanceMeters(event.lat, event.lng, lat, lng);
  if (radiusM > 0 && distance > radiusM) {
    throw new ApiError(
      ERR.CHECKIN_TIME_INVALID,
      `不在签到范围内（距活动地点 ${distance} 米，允许 ${Math.round(radiusM)} 米）`,
      409
    );
  }

  const checkedInAt = new Date().toISOString();
  registrationModel.markCheckedIn(registration.id, checkedInAt);
  return {
    student_id: user.student_id,
    name: user.name,
    checked_in_at: checkedInAt,
    distance_m: distance,
  };
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

/**
 * 学生自助定位签到（v5）：学生用本人 token，提交自己的实时定位即核销本人到场。
 * 无需学号（从登录态取），无需组织者参与。
 * @param {object} user 当前登录用户（req.user，必须是报名学生本人）
 * @param {number} eventId
 * @param {{lat:number, lng:number}} payload
 * @returns {{student_id:string, name:string, checked_in_at:string, distance_m:number}}
 */
function selfCheckin(user, eventId, { lat, lng }) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');

  // 1. 时间窗
  const now = new Date().toISOString();
  if (now < event.start_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动未开始，暂不能签到', 409);
  }
  if (now > event.end_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动已结束，无法签到', 409);
  }

  // 2. 活动须已设置定位坐标
  if (event.lat == null || event.lng == null) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '该活动未设置签到地点，无法定位签到', 409);
  }

  // 3. 本人报名状态为 approved
  const registration = registrationModel.findByEventAndUser(eventId, user.id);
  if (!registration || registration.status !== REG_STATUS.APPROVED) {
    throw new ApiError(ERR.NOT_REGISTERED, '您未成功报名此活动，无法签到', 409);
  }

  // 4. 未核销
  if (registration.checked_in === 1) {
    throw new ApiError(ERR.ALREADY_CHECKED_IN, '您已签到，请勿重复操作', 409);
  }

  // 5. 定位校验
  const radiusM = (event.checkin_radius || 0.2) * 1000;
  const distance = distanceMeters(event.lat, event.lng, lat, lng);
  if (radiusM > 0 && distance > radiusM) {
    throw new ApiError(
      ERR.CHECKIN_TIME_INVALID,
      `不在签到范围内（距活动地点 ${distance} 米，允许 ${Math.round(radiusM)} 米）`,
      409
    );
  }

  const checkedInAt = new Date().toISOString();
  registrationModel.markCheckedIn(registration.id, checkedInAt);
  return {
    student_id: user.student_id,
    name: user.name,
    checked_in_at: checkedInAt,
    distance_m: distance,
  };
}

/** 断言操作者为活动发布者或管理员 */
function assertEventManagePermission(operator, event) {
  if (operator.id !== event.organizer_id && !isAdminRole(operator.role)) {
    throw ApiError.forbidden('仅活动发布者或管理员可执行该操作');
  }
}

module.exports = { checkin, selfCheckin, stats };
