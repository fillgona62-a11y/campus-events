/**
 * 用户模型：users 表 SQL 封装。所有查询参数化，防 SQL 注入。
 * v2 扩展：email / email_verified / failed_login_count / locked_until 读写，
 * 按邮箱查人、登录失败计数与锁定（F12）、改密/重置时清零锁定态。
 */
const db = require('../db/connection');

/** 去除敏感字段后的公开用户结构（永不含 password_hash） */
function toPublic(user) {
  if (!user) return null;
  return {
    id: user.id,
    student_id: user.student_id,
    name: user.name,
    phone: user.phone,
    role: user.role,
    status: user.status,
    email: user.email || null,
    email_verified: user.email_verified || 0,
  };
}

function findByStudentId(studentId) {
  return db.prepare('SELECT * FROM users WHERE student_id = ?').get(studentId);
}

function findById(id) {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id);
}

/** 按绑定邮箱查人（F2 找回密码 / F3 邮箱唯一性） */
function findByEmail(email) {
  if (!email) return null;
  return db.prepare('SELECT * FROM users WHERE email = ?').get(email);
}

/**
 * 创建用户（v2：支持注册时直接带 email，email_verified=1）
 * @param {{student_id:string,name:string,phone:string|null,password_hash:string,role?:string,email?:string|null}} data
 */
function create(data) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO users (student_id, name, phone, password_hash, role, status, email, email_verified, created_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?, ?)`
    )
    .run(
      data.student_id,
      data.name,
      data.phone || null,
      data.password_hash,
      data.role || 'user',
      data.email || null,
      data.email ? 1 : 0,
      now
    );
  return findById(info.lastInsertRowid);
}

/** 完善个人资料（姓名/手机号） */
function updateProfile(id, { name, phone }) {
  db.prepare('UPDATE users SET name = COALESCE(?, name), phone = ? WHERE id = ?').run(
    name ?? null,
    phone ?? null,
    id
  );
  return findById(id);
}

/** 禁用/启用账号 */
function setStatus(id, status) {
  db.prepare('UPDATE users SET status = ? WHERE id = ?').run(status, id);
}

/** 绑定/更换邮箱（F3 联动，需登录） */
function updateEmail(id, email) {
  db.prepare('UPDATE users SET email = ?, email_verified = 1 WHERE id = ?').run(email, id);
  return findById(id);
}

/** 更新密码哈希，并清零登录失败计数与锁定态（F1/F2/F12 联动） */
function updatePasswordHash(id, passwordHash) {
  db.prepare(
    'UPDATE users SET password_hash = ?, failed_login_count = 0, locked_until = NULL WHERE id = ?'
  ).run(passwordHash, id);
  return findById(id);
}

/**
 * 登录失败 +1；达到上限写 locked_until = now + lockMinutes 并清零计数。
 * @returns {{failed_count:number, locked:boolean}}
 */
function recordLoginFailure(user, lockMinutes, maxAttempts) {
  const failedCount = (user.failed_login_count || 0) + 1;
  if (failedCount >= maxAttempts) {
    const lockedUntil = new Date(Date.now() + lockMinutes * 60 * 1000).toISOString();
    db.prepare(
      'UPDATE users SET failed_login_count = 0, locked_until = ? WHERE id = ?'
    ).run(lockedUntil, user.id);
    return { failed_count: failedCount, locked: true };
  }
  db.prepare('UPDATE users SET failed_login_count = ? WHERE id = ?').run(failedCount, user.id);
  return { failed_count: failedCount, locked: false };
}

/** 登录成功：清零失败计数与锁定态 */
function clearLoginFailures(id) {
  db.prepare('UPDATE users SET failed_login_count = 0, locked_until = NULL WHERE id = ?').run(id);
}

/**
 * 管理端用户列表（关键字模糊匹配学号/姓名）
 */
function list({ keyword, page, page_size }) {
  const where = keyword ? 'WHERE student_id LIKE ? OR name LIKE ?' : '';
  const params = keyword ? [`%${keyword}%`, `%${keyword}%`] : [];
  const total = db.prepare(`SELECT COUNT(*) AS c FROM users ${where}`).get(...params).c;
  const list = db
    .prepare(
      `SELECT id, student_id, name, phone, email, role, status, created_at
       FROM users ${where} ORDER BY id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 用户总数（数据概览用） */
function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM users').get().c;
}

/** 按姓名批量查用户（@提及用；仅活跃用户） */
function findByNames(names) {
  if (!Array.isArray(names) || !names.length) return [];
  const uniq = [...new Set(names)];
  const placeholders = uniq.map(() => '?').join(',');
  return db
    .prepare(`SELECT id, name FROM users WHERE name IN (${placeholders}) AND status = 'active'`)
    .all(...uniq);
}

module.exports = {
  toPublic,
  findByNames,
  findByStudentId,
  findById,
  findByEmail,
  create,
  updateProfile,
  setStatus,
  updateEmail,
  updatePasswordHash,
  recordLoginFailure,
  clearLoginFailures,
  list,
  count,
};
