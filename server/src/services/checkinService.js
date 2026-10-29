/**
 * 签到核销服务（v5 定位签到 + v6 蓝牙信标）：
 * - 学生到场后提交自己的实时定位（lat/lng）与扫描到的蓝牙信标 UUID，
 *   服务端校验：时间窗 → 活动已设定位 → 已报名 → 未签到 → 信标匹配（若启用）→ 距离在半径内。
 * - 蓝牙信标（v6）：活动若设置了 beacon_uuid，则签到必须提供匹配的信标，作为「物理到场」硬证明。
 */
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const userModel = require('../models/userModel');
const { ApiError } = require('../utils/response');
const { ERR, REG_STATUS, isAdminRole } = require('../utils/constants');
const { distanceMeters } = require('../utils/geo');

/** 校验蓝牙信标（v6）：活动设置了 beacon_uuid 则必须匹配，否则抛 409 */
function assertBeaconMatch(event, beacon_uuid) {
  if (!event.beacon_uuid) return;
  const normalized = String(beacon_uuid || '').trim().toUpperCase();
  if (normalized !== String(event.beacon_uuid).trim().toUpperCase()) {
    throw new ApiError(
      ERR.CHECKIN_TIME_INVALID,
      '未检测到活动签到信标，请靠近活动现场后重试',
      409
    );
  }
}

/**
 * 学生自助定位 + 信标签到（v6）：本人 token，提交实时定位与扫描到的信标。
 * @param {object} user 当前登录用户（报名学生本人）
 * @param {number} eventId
 * @param {{lat:number, lng:number, beacon_uuid?:string}} payload
 * @returns {{student_id:string, name:string, checked_in_at:string, distance_m:number}}
 */
function selfCheckin(user, eventId, { lat, lng, beacon_uuid }) {
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

  // 5. 蓝牙信标校验（v6）
  assertBeaconMatch(event, beacon_uuid);

  // 6. 定位校验
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
 * 组织者/管理员代签（v6）：输入学号 + 实时定位 + 信标。
 * @param {object} operator 当前登录用户（限活动发布者或管理员）
 * @param {number} eventId
 * @param {{student_id:string, lat:number, lng:number, beacon_uuid?:string}} payload
 */
function checkin(operator, eventId, { student_id, lat, lng, beacon_uuid }) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');

  // 授权
  assertEventManagePermission(operator, event);

  // 时间窗
  const now = new Date().toISOString();
  if (now < event.start_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动未开始，暂不能签到', 409);
  }
  if (now > event.end_time) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '活动已结束，无法签到', 409);
  }

  // 定位坐标
  if (event.lat == null || event.lng == null) {
    throw new ApiError(ERR.CHECKIN_TIME_INVALID, '该活动未设置签到地点，无法定位签到', 409);
  }

  // 已报名
  const user = userModel.findByStudentId(student_id);
  const registration = user && registrationModel.findByEventAndUser(eventId, user.id);
  if (!registration || registration.status !== REG_STATUS.APPROVED) {
    throw new ApiError(ERR.NOT_REGISTERED, '该学号未成功报名此活动', 409);
  }

  // 未核销
  if (registration.checked_in === 1) {
    throw new ApiError(ERR.ALREADY_CHECKED_IN, '该同学已签到，请勿重复操作', 409);
  }

  // 蓝牙信标校验（v6）
  assertBeaconMatch(event, beacon_uuid);

  // 定位校验
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

/** 断言操作者为活动发布者或管理员 */
function assertEventManagePermission(operator, event) {
  if (operator.id !== event.organizer_id && !isAdminRole(operator.role)) {
    throw ApiError.forbidden('仅活动发布者或管理员可执行该操作');
  }
}

module.exports = { checkin, selfCheckin, stats };
