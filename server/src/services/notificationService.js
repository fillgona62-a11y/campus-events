/**
 * 站内信服务：生成与查询站内通知。
 */
const notificationModel = require('../models/notificationModel');

/**
 * 发送站内信
 * @param {number} userId 接收人
 * @param {string} type 通知类型（见 constants NOTIFICATION_TYPE）
 * @param {string} title 标题
 * @param {string} content 内容
 */
function send(userId, type, title, content) {
  return notificationModel.insert({ user_id: userId, type, title, content });
}

/** 批量发送（如活动取消时通知全部报名成功用户） */
function sendMany(userIds, type, title, content) {
  for (const userId of userIds) {
    notificationModel.insert({ user_id: userId, type, title, content });
  }
}

function list(userId, pageParams) {
  return notificationModel.listByUser(userId, pageParams);
}

function markRead(userId, id) {
  return notificationModel.markRead(id, userId);
}

function markAllRead(userId) {
  notificationModel.markAllRead(userId);
}

function unreadCount(userId) {
  return notificationModel.unreadCount(userId);
}

module.exports = { send, sendMany, list, markRead, markAllRead, unreadCount };
