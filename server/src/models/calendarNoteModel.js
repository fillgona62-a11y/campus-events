/**
 * 日历备注模型：calendar_notes 表 SQL 封装（一日一条，UNIQUE(user_id, date)）。
 */
const db = require('../db/connection');

/** 某用户某月的备注（date LIKE 'YYYY-MM%'），按日期升序 */
function listByUserMonth(userId, month) {
  return db
    .prepare(
      `SELECT id, date, content, updated_at FROM calendar_notes
       WHERE user_id = ? AND date LIKE ? ORDER BY date ASC`
    )
    .all(userId, `${month}-%`);
}

/** 新建或更新某日备注（同 (user_id, date) 已存在则覆盖内容，更新时间） */
function upsert(userId, date, content) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO calendar_notes (user_id, date, content, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?)
     ON CONFLICT(user_id, date) DO UPDATE SET content = excluded.content, updated_at = excluded.updated_at`
  ).run(userId, date, content, now, now);
  return db
    .prepare('SELECT id, date, content, updated_at FROM calendar_notes WHERE user_id = ? AND date = ?')
    .get(userId, date);
}

/** 删除（限本人），返回受影响行数（0 表示不存在或非本人） */
function remove(id, userId) {
  return db.prepare('DELETE FROM calendar_notes WHERE id = ? AND user_id = ?').run(id, userId).changes;
}

module.exports = { listByUserMonth, upsert, remove };
