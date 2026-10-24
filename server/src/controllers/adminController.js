/**
 * 管理后台控制器：数据概览、活动审核/下架、用户禁用/启用、
 * 管理员重置用户密码（一次性临时密码）、审计日志查询、全站报名趋势。
 */
const bcrypt = require('bcryptjs');
const userModel = require('../models/userModel');
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const eventService = require('../services/eventService');
const forumService = require('../services/forumService');
const notificationService = require('../services/notificationService');
const auditService = require('../services/auditService');
const { generateTempPassword } = require('../utils/password');
const { ApiError, ok } = require('../utils/response');
const { parsePagination, parseId } = require('../middleware/validate');
const { NOTIFICATION_TYPE, AUDIT_ACTION } = require('../utils/constants');

/** GET /admin/overview 数据概览 */
function overview(req, res, next) {
  try {
    ok(res, {
      total_users: userModel.count(),
      total_events: eventModel.countTotal(), // 现存活动（已上架且未结束，不含下架）
      open_events: eventModel.countOpen(), // 正在报名（报名未截止）
      ongoing_events: eventModel.countOngoing(), // 正在进行（进行中区间）
      pending_events: eventModel.countPending(),
      total_registrations: registrationModel.count(),
    });
  } catch (err) {
    next(err);
  }
}

/** GET /admin/overview/trend 全站近 N 天报名趋势（F8） */
function overviewTrend(req, res, next) {
  try {
    let days = parseInt(req.query.days, 10);
    if (!Number.isInteger(days) || days < 1) days = 30;
    if (days > 90) days = 90;
    ok(res, registrationModel.trendAll(days));
  } catch (err) {
    next(err);
  }
}

/** GET /admin/events 全站活动（全部状态） */
function listEvents(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(
      res,
      eventModel.listAdmin({
        status: req.query.status ? String(req.query.status) : undefined,
        keyword: req.query.keyword ? String(req.query.keyword).trim() : undefined,
        page,
        page_size,
      })
    );
  } catch (err) {
    next(err);
  }
}

/** PUT /admin/events/:id/review 审核活动（approve/reject，reject 需理由） */
function reviewEvent(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    const event = eventService.review(req.user.id, id, req.body.action, req.body.reason);
    ok(res, { event }, req.body.action === 'approve' ? '已通过审核' : '已拒绝该活动');
  } catch (err) {
    next(err);
  }
}

/** PUT /admin/events/:id/offline 下架活动 */
function offlineEvent(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    eventService.offline(req.user.id, id);
    ok(res, null, '活动已下架');
  } catch (err) {
    next(err);
  }
}

/** GET /admin/users 用户列表 */
function listUsers(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(
      res,
      userModel.list({
        keyword: req.query.keyword ? String(req.query.keyword).trim() : undefined,
        page,
        page_size,
      })
    );
  } catch (err) {
    next(err);
  }
}

/** PUT /admin/users/:id/status 禁用/启用（禁用后 JWT 实时校验失败） */
function setUserStatus(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('用户 ID 不合法');
    if (id === req.user.id) throw ApiError.forbidden('不能修改自己的账号状态');
    const target = userModel.findById(id);
    if (!target) throw ApiError.notFound('用户不存在');
    userModel.setStatus(id, req.body.status);
    // 审计日志（F6）：detail 只记录状态迁移，不存敏感信息
    auditService.log(req.user.id, req.body.status === 'disabled' ? AUDIT_ACTION.USER_DISABLE : AUDIT_ACTION.USER_ENABLE, 'user', id, {
      from: target.status,
      to: req.body.status,
    });
    ok(res, { user: userModel.toPublic(userModel.findById(id)) }, '操作成功');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /admin/users/:id/password/reset 管理员重置用户密码（F1）。
 * 禁止重置自己（40301）；生成 12 位临时密码（去易混字符）→ bcrypt 写入 →
 * 清零失败计数与锁定 → 站内信通知用户 → 审计 user_password_reset（禁存临时密码本身）。
 * 出参 temp_password 仅一次性返回，刷新不重现。
 */
function resetUserPassword(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('用户 ID 不合法');
    if (id === req.user.id) {
      throw ApiError.forbidden('不能重置自己的密码，请使用个人资料页修改密码');
    }
    const target = userModel.findById(id);
    if (!target) throw ApiError.notFound('用户不存在');

    const tempPassword = generateTempPassword();
    const passwordHash = bcrypt.hashSync(tempPassword, 10);
    userModel.updatePasswordHash(id, passwordHash);
    notificationService.send(
      id,
      NOTIFICATION_TYPE.PASSWORD_RESET,
      '密码已被管理员重置',
      '您的账号密码已被管理员重置为临时密码，请使用管理员提供的临时密码登录后尽快修改密码。'
    );
    auditService.log(req.user.id, AUDIT_ACTION.USER_PASSWORD_RESET, 'user', id, {
      temp_password_generated: true,
    });
    ok(res, { temp_password: tempPassword, user: userModel.toPublic(userModel.findById(id)) }, '密码已重置，请将临时密码告知用户');
  } catch (err) {
    next(err);
  }
}

/** GET /admin/audit-logs 审计日志查询（F6，只读） */
function listAuditLogs(req, res, next) {
  try {
    const data = auditService.list({
      action: req.query.action,
      target_type: req.query.target_type,
      start_date: req.query.start_date,
      end_date: req.query.end_date,
      page: req.query.page,
      page_size: req.query.page_size,
    });
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

/** DELETE /admin/posts/:id 管理员删帖（软删除 + 审计） */
function deletePost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    forumService.deletePost(req.user, id); // 服务层已允许管理员
    auditService.log(req.user.id, AUDIT_ACTION.FORUM_POST_DELETE, 'post', id, {});
    ok(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

/** DELETE /admin/comments/:id 管理员删评论（软删除 + 审计） */
function deleteComment(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('评论 ID 不合法');
    forumService.deleteComment(req.user, id);
    auditService.log(req.user.id, AUDIT_ACTION.FORUM_COMMENT_DELETE, 'comment', id, {});
    ok(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  overview,
  overviewTrend,
  listEvents,
  reviewEvent,
  offlineEvent,
  listUsers,
  setUserStatus,
  resetUserPassword,
  listAuditLogs,
  deletePost,
  deleteComment,
};
