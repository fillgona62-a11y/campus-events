/**
 * 活动评价模型：event_reviews 表 SQL 封装（v4）。
 * 一活动一人一评（UNIQUE(event_id, user_id)）；仅活动结束后、报名成功（approved）用户可评。
 */
const db = require('../db/connection');

/** 写入或覆盖评价（UPSERT，重复提交覆盖旧评） */
function upsert({ event_id, user_id, rating, content }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO event_reviews (event_id, user_id, rating, content, created_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(event_id, user_id)
     DO UPDATE SET rating = excluded.rating, content = excluded.content, created_at = excluded.created_at`
  ).run(event_id, user_id, rating, content || null, now);
  return findByEventAndUser(event_id, user_id);
}

function findByEventAndUser(eventId, userId) {
  return db
    .prepare('SELECT * FROM event_reviews WHERE event_id = ? AND user_id = ?')
    .get(eventId, userId);
}

/** 某活动的全部评价（含用户姓名/学号），按时间倒序 */
function listByEvent(eventId) {
  return db
    .prepare(
      `SELECT r.*, u.name AS user_name, u.student_id AS user_student_id
       FROM event_reviews r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ?
       ORDER BY r.created_at DESC, r.id DESC`
    )
    .all(eventId);
}

/** 某活动的平均分与评价数 */
function summarizeByEvent(eventId) {
  const row = db
    .prepare(
      'SELECT COUNT(*) AS count, AVG(rating) AS avg FROM event_reviews WHERE event_id = ?'
    )
    .get(eventId);
  return { count: row.count || 0, avg: row.avg ? Math.round(row.avg * 10) / 10 : 0 };
}

module.exports = { upsert, findByEventAndUser, listByEvent, summarizeByEvent };
