/**
 * 报名控制器：报名、取消、发布者审核、候补提升/移出、我的报名。
 */
const registrationService = require('../services/registrationService');
const registrationModel = require('../models/registrationModel');
const { ApiError, ok } = require('../utils/response');
const { REG_STATUS } = require('../utils/constants');
const { parsePagination, parseId } = require('../middleware/validate');

/** POST /events/:id/register 幂等报名（满员自动转候补，F5） */
function register(req, res, next) {
  try {
    const eventId = parseId(req.params.id);
    if (!eventId) throw ApiError.badRequest('活动 ID 不合法');
    const result = registrationService.register(req.user.id, eventId, req.body.remark);
    let message = '报名成功';
    if (result.waitlisted) {
      message = `已加入候补第 ${result.waitlist_position} 位`;
    } else if (result.registration.status === REG_STATUS.PENDING) {
      message = '报名已提交，等待发布者审核';
    }
    ok(
      res,
      {
        registration: result.registration,
        waitlisted: result.waitlisted,
        waitlist_position: result.waitlist_position,
      },
      message
    );
  } catch (err) {
    next(err);
  }
}

/** POST /registrations/:id/cancel 取消报名（本人，截止前；approved 取消触发递补） */
function cancel(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('报名 ID 不合法');
    const result = registrationService.cancel(req.user.id, id);
    ok(res, { promoted: result.promoted }, result.promoted ? '已取消报名，候补名单已自动递补' : '已取消报名');
  } catch (err) {
    next(err);
  }
}

/** PUT /registrations/:id/review 发布者审核报名 */
function review(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('报名 ID 不合法');
    const registration = registrationService.review(req.user.id, id, req.body.action);
    ok(res, { registration }, req.body.action === 'approve' ? '已通过该报名' : '已拒绝该报名');
  } catch (err) {
    next(err);
  }
}

/** PUT /registrations/:id/waitlist/promote 手动提升候补（F5，发布者/管理员） */
function promoteWaitlist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('报名 ID 不合法');
    const registration = registrationService.promoteWaitlist(req.user, id);
    ok(res, { registration }, '已提升为报名成功');
  } catch (err) {
    next(err);
  }
}

/** POST /registrations/:id/waitlist/remove 移出候补（F5，发布者/管理员） */
function removeWaitlist(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('报名 ID 不合法');
    registrationService.removeWaitlist(req.user, id);
    ok(res, null, '已移出候补名单');
  } catch (err) {
    next(err);
  }
}

/** GET /my/registrations 我的报名（tab=upcoming|past） */
function myRegistrations(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    const tab = req.query.tab === 'past' ? 'past' : 'upcoming';
    ok(res, registrationModel.listByUser(req.user.id, { tab, page, page_size }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  register,
  cancel,
  review,
  promoteWaitlist,
  removeWaitlist,
  myRegistrations,
};
