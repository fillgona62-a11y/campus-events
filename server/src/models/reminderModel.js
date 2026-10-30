/**
 * 提醒发送记录模型：reminder_logs 表 SQL 封装。
 * UNIQUE(event_id, kind) 保证同一活动的同一种提醒只发一次。
 */
const db = require('../db/connection');

/** 记录一次提醒发送（幂等：重复插入被唯一约束忽略） */
function markSent(eventId, kind) {
  const now = new Date().toISOString();
  return db
    .prepare(
      'INSERT OR IGNORE INTO reminder_logs (event_id, kind, created_at) VALUES (?, ?, ?)'
    )
    .run(eventId, kind, now).changes;
}

/** 是否已发送过某活动的某种提醒 */
function hasSent(eventId, kind) {
  return !!db
    .prepare('SELECT 1 FROM reminder_logs WHERE event_id = ? AND kind = ?')
    .get(eventId, kind);
}

module.exports = { markSent, hasSent };
