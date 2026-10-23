/**
 * 核销控制器：口令生成/查看、核销、核销统计（F4）的请求编排。
 * 权限口径与报名名单一致：活动发布者或管理员。
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

/** POST /events/:id/checkin-code 生成/重生成核销口令 */
function generateCode(req, res, next) {
  try {
    const result = checkinService.generateCode(req.user, parseEventId(req.params.id));
    ok(res, result, '核销口令已生成');
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id/checkin-code 查看核销口令 */
function getCode(req, res, next) {
  try {
    const result = checkinService.getCode(req.user, parseEventId(req.params.id));
    ok(res, result, result.checkin_code ? 'ok' : '尚未生成核销口令');
  } catch (err) {
    next(err);
  }
}

/** POST /events/:id/checkin 核销（学号 + 口令；限活动发布者或管理员） */
function checkin(req, res, next) {
  try {
    const result = checkinService.checkin(req.user, parseEventId(req.params.id), {
      student_id: req.body.student_id,
      code: req.body.code,
    });
    ok(res, result, '核销成功');
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

module.exports = { generateCode, getCode, checkin, stats };
