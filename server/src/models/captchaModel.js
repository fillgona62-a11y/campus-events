/**
 * 图形验证码模型：captchas 表 SQL 封装。
 * 验证码一次性使用，校验通过即作废；同时提供清理过期记录的方法。
 */
const crypto = require('crypto');
const db = require('../db/connection');

/** 创建一条验证码记录，返回 { id, text, expires_at } */
function create(ttlSeconds, text) {
  const id = crypto.randomUUID();
  const now = new Date();
  const expiresAt = new Date(now.getTime() + ttlSeconds * 1000).toISOString();
  db.prepare(
    'INSERT INTO captchas (id, text, expires_at, used, created_at) VALUES (?, ?, ?, 0, ?)'
  ).run(id, String(text).toUpperCase(), expiresAt, now.toISOString());
  return { id, text, expires_at: expiresAt };
}

function findById(id) {
  return db.prepare('SELECT * FROM captchas WHERE id = ?').get(id);
}

/** 校验并消费：成功返回 true，失败返回 false（无论原因都不暴露细节） */
function consume(id, input) {
  if (!id || !input) return false;
  const row = findById(id);
  if (!row || row.used === 1) return false;
  if (new Date(row.expires_at).getTime() < Date.now()) return false;
  if (String(input).trim().toUpperCase() !== row.text) return false;
  db.prepare('UPDATE captchas SET used = 1 WHERE id = ?').run(id);
  return true;
}

/** 清理已过期或已使用的记录（可在定时任务中调用） */
function cleanup() {
  const cutoff = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
  db.prepare('DELETE FROM captchas WHERE used = 1 OR expires_at < ?').run(cutoff);
}

module.exports = { create, findById, consume, cleanup };
