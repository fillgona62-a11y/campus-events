/**
 * 站内信控制器：列表、标记已读、全部已读。
 */
const notificationService = require('../services/notificationService');
const { ApiError, ok } = require('../utils/response');
const { parsePagination, parseId } = require('../middleware/validate');

/** GET /notifications 分页站内信 */
function list(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    const data = notificationService.list(req.user.id, { page, page_size });
    ok(res, {
      ...data,
      unread_count: notificationService.unreadCount(req.user.id),
    });
  } catch (err) {
    next(err);
  }
}

/** PUT /notifications/:id/read 标记已读 */
function markRead(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('通知 ID 不合法');
    notificationService.markRead(req.user.id, id);
    ok(res, { unread_count: notificationService.unreadCount(req.user.id) });
  } catch (err) {
    next(err);
  }
}

/** PUT /notifications/read-all 全部已读 */
function markAllRead(req, res, next) {
  try {
    notificationService.markAllRead(req.user.id);
    ok(res, { unread_count: 0 });
  } catch (err) {
    next(err);
  }
}

module.exports = { list, markRead, markAllRead };
