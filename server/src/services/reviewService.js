/**
 * 活动评价服务：活动结束后、报名成功（approved）用户可评分 + 留言。
 * 规则：一活动一人一评（重复提交覆盖旧评）；评分 1~5 整数；内容 ≤500 字纯文本。
 */
const reviewModel = require('../models/reviewModel');
const registrationModel = require('../models/registrationModel');
const eventModel = require('../models/eventModel');
const { ApiError } = require('../utils/response');
const { REG_STATUS } = require('../utils/constants');

/** 校验可评价：活动存在且已结束；该用户报名状态为 approved */
function assertCanReview(userId, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  const now = new Date().toISOString();
  if (now < event.end_time) {
    throw new ApiError(40905, '活动尚未结束，结束后才可评价', 409);
  }
  const reg = registrationModel.findByEventAndUser(eventId, userId);
  if (!reg || reg.status !== REG_STATUS.APPROVED) {
    throw ApiError.forbidden('仅报名成功的同学可评价');
  }
  return event;
}

/** 提交评价（覆盖旧评） */
function submit(userId, eventId, { rating, content }) {
  assertCanReview(userId, eventId);
  return reviewModel.upsert({ event_id: eventId, user_id: userId, rating, content });
}

/** 查询某活动的评价列表 + 汇总（公开，无需登录） */
function listByEvent(eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  return {
    summary: reviewModel.summarizeByEvent(eventId),
    list: reviewModel.listByEvent(eventId),
  };
}

/** 我的评价（详情页判断是否已评） */
function myReview(userId, eventId) {
  return reviewModel.findByEventAndUser(eventId, userId);
}

module.exports = { submit, listByEvent, myReview };
