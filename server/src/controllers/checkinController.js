/**
 * 核销控制器（v5 定位签到）：定位签到、核销统计的请求编排。
 * 权限口径与报名名单一致：活动发布者或管理员。
 * v5 起移除口令生成/查看（彻底替换为定位签到）。
 */
const checkinService = require('../services/checkinService');
const { ApiError, ok } = require('../utils/response');
const { parseId } = require('../middleware/validate');

/** 解析路径参数中的活动 id */
function parseEventId(raw) {
  const id = parseId(raw);
  if (!id) throw ApiError.badRequest('活动 ID 不合法');
  return id;
}

/** POST /events/:id/checkin 定位+信标签到（学生学号 + 实时定位；限活动发布者或管理员） */
function checkin(req, res, next) {
  try {
    const result = checkinService.checkin(req.user, parseEventId(req.params.id), {
      student_id: req.body.student_id,
      lat: req.body.lat,
      lng: req.body.lng,
      beacon_uuid: req.body.beacon_uuid,
    });
    ok(res, result, '签到成功');
  } catch (err) {
    next(err);
  }
}

/** POST /events/:id/self-checkin 学生自助定位+信标签到（本人 token + 实时定位） */
function selfCheckin(req, res, next) {
  try {
    const result = checkinService.selfCheckin(req.user, parseEventId(req.params.id), {
      lat: req.body.lat,
      lng: req.body.lng,
      beacon_uuid: req.body.beacon_uuid,
    });
    ok(res, result, '签到成功');
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id/checkin/stats 核销统计 */
function stats(req, res, next) {
  try {
    const result = checkinService.stats(req.user, parseEventId(req.params.id));
    ok(res, result);
  } catch (err) {
    next(err);
  }
}

module.exports = { checkin, selfCheckin, stats };
