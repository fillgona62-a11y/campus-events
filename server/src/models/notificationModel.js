/**
 * 站内信模型：notifications 表 SQL 封装。
 */
const db = require('../db/connection');

function insert({ user_id, type, title, content }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO notifications (user_id, type, title, content, is_read, created_at)
       VALUES (?, ?, ?, ?, 0, ?)`
    )
    .run(user_id, type, title, content, now);
  return db.prepare('SELECT * FROM notifications WHERE id = ?').get(info.lastInsertRowid);
}

/** 我的站内信分页（按时间倒序） */
function listByUser(userId, { page, page_size }) {
  const total = db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ?')
    .get(userId).c;
  const list = db
    .prepare(
      `SELECT id, type, title, content, is_read, created_at
       FROM notifications WHERE user_id = ?
       ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(userId, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 标记单条已读（限本人） */
function markRead(id, userId) {
  return db
    .prepare('UPDATE notifications SET is_read = 1 WHERE id = ? AND user_id = ?')
    .run(id, userId).changes;
}

/** 全部已读 */
function markAllRead(userId) {
  db.prepare('UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0').run(userId);
}

/** 未读数（顶栏角标 / auth/me 用） */
function unreadCount(userId) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM notifications WHERE user_id = ? AND is_read = 0')
    .get(userId).c;
}

module.exports = { insert, listByUser, markRead, markAllRead, unreadCount };
