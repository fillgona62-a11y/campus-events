/**
 * 活动评价控制器（v4）：提交评价（报名成功用户，活动结束后）、查询评价列表。
 */
const reviewService = require('../services/reviewService');
const { ApiError, ok } = require('../utils/response');
const { parseId } = require('../middleware/validate');

/** POST /events/:id/review 提交评价（需登录） */
function submit(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    const review = reviewService.submit(req.user.id, id, req.body);
    ok(res, { review }, '评价已提交');
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id/reviews 评价列表（公开） */
function list(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    ok(res, reviewService.listByEvent(id));
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id/my-review 我的评价（需登录，详情页判断是否已评） */
function myReview(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    ok(res, { review: reviewService.myReview(req.user.id, id) });
  } catch (err) {
    next(err);
  }
}

module.exports = { submit, list, myReview };
