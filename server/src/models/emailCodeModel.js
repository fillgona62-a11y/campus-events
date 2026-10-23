/**
 * 邮箱验证码模型：email_codes 表 SQL 封装。
 * 业务规则（6 位/5 分钟/60 秒冷却/错误 5 次作废/发新码作废旧码）
 * 只在 emailCodeService 一处实现，其他模块不得直接查 email_codes 表。
 */
const db = require('../db/connection');

/**
 * 发送新码：作废同邮箱同用途全部旧码，写入新码。
 * @returns {object} 新码行（含 code）
 */
function insert({ email, code, purpose, expires_at }) {
  const now = new Date().toISOString();
  const tx = db.transaction(() => {
    db.prepare(
      "UPDATE email_codes SET consumed = 1 WHERE email = ? AND purpose = ? AND consumed = 0"
    ).run(email, purpose);
    const info = db
      .prepare(
        `INSERT INTO email_codes (email, code, purpose, expires_at, consumed, attempts, created_at)
         VALUES (?, ?, ?, ?, 0, 0, ?)`
      )
      .run(email, code, purpose, expires_at, now);
    return db.prepare('SELECT * FROM email_codes WHERE id = ?').get(info.lastInsertRowid);
  });
  return tx();
}

/** 取同邮箱同用途最新一条未作废验证码（null 表示无有效码） */
function findLatestActive(email, purpose) {
  return db
    .prepare(
      `SELECT * FROM email_codes
       WHERE email = ? AND purpose = ? AND consumed = 0
       ORDER BY id DESC LIMIT 1`
    )
    .get(email, purpose);
}

/** 按 id 取验证码行 */
function findById(id) {
  return db.prepare('SELECT * FROM email_codes WHERE id = ?').get(id);
}

/** 校验失败次数 +1；满 maxAttempts 作废该码 */
function increaseAttempts(id, maxAttempts) {
  db.prepare('UPDATE email_codes SET attempts = attempts + 1 WHERE id = ?').run(id);
  const row = findById(id);
  if (row && row.attempts >= maxAttempts) {
    db.prepare('UPDATE email_codes SET consumed = 1 WHERE id = ?').run(id);
  }
}

/** 作废指定验证码（校验成功后消费） */
function consume(id) {
  db.prepare('UPDATE email_codes SET consumed = 1 WHERE id = ?').run(id);
}

module.exports = { insert, findLatestActive, findById, increaseAttempts, consume };
