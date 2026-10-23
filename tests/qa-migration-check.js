/**
 * QA 迁移幂等演练脚本（一次性验证工具，非产品代码）。
 * 手工构造 v1 旧结构数据库 → 执行 v2 迁移 → 校验：
 *   1. 新列全部补齐（users.email/email_verified/failed_login_count/locked_until 等）
 *   2. 新表建立（email_codes / audit_logs）
 *   3. 历史数据零丢失（v1 用户/活动/报名记录原样保留）
 *   4. 重复执行迁移不报错（幂等）
 * 运行：node scripts/qa-migration-check.js
 */
const fs = require('fs');
const path = require('path');
const os = require('os');

const tmpDir = fs.mkdtempSync(path.join(os.tmpdir(), 'qa-migrate-'));
const dbFile = path.join(tmpDir, 'v1.db');

// 1. 构造 v1 旧库（无任何 v2 字段/表，含历史数据）
// better-sqlite3 安装在 server/node_modules，从 tests/ 运行需显式路径
const v1 = require('../server/node_modules/better-sqlite3');
const db1 = new v1(dbFile);
db1.exec(`
  CREATE TABLE users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    student_id TEXT NOT NULL UNIQUE,
    name TEXT NOT NULL,
    phone TEXT,
    password_hash TEXT NOT NULL,
    role TEXT NOT NULL DEFAULT 'user',
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
  );
  CREATE TABLE categories (id INTEGER PRIMARY KEY AUTOINCREMENT, name TEXT NOT NULL UNIQUE, sort INTEGER NOT NULL DEFAULT 0);
  CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL, category_id INTEGER NOT NULL, cover_url TEXT, location TEXT NOT NULL,
    start_time TEXT NOT NULL, end_time TEXT NOT NULL, signup_deadline TEXT NOT NULL,
    capacity INTEGER NOT NULL DEFAULT 0, approved_count INTEGER NOT NULL DEFAULT 0,
    organizer_id INTEGER NOT NULL, require_approval INTEGER NOT NULL DEFAULT 0,
    description TEXT, status TEXT NOT NULL DEFAULT 'pending', reject_reason TEXT,
    created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE registrations (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL, user_id INTEGER NOT NULL, remark TEXT,
    status TEXT NOT NULL, created_at TEXT NOT NULL, updated_at TEXT NOT NULL
  );
  CREATE TABLE notifications (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL, type TEXT NOT NULL, title TEXT NOT NULL, content TEXT NOT NULL,
    is_read INTEGER NOT NULL DEFAULT 0, created_at TEXT NOT NULL
  );
`);
const now = new Date().toISOString();
db1.prepare(`INSERT INTO users (student_id, name, password_hash, role, status, created_at) VALUES ('v1user', '老用户', 'x', 'user', 'active', ?)`).run(now);
db1.prepare(`INSERT INTO categories (name, sort) VALUES ('讲座', 1)`).run();
db1.prepare(`INSERT INTO events (title, category_id, location, start_time, end_time, signup_deadline, capacity, organizer_id, created_at, updated_at) VALUES ('v1活动', 1, 'A101', ?, ?, ?, 10, 1, ?, ?)`).run(now, now, now, now, now);
db1.prepare(`INSERT INTO registrations (event_id, user_id, status, created_at, updated_at) VALUES (1, 1, 'approved', ?, ?)`).run(now, now);
db1.close();
console.log('[qa] v1 旧库构造完成：' + dbFile);

// 2. 以该库为 DB_PATH 加载 connection（触发 schema.sql + migrate.js）
process.env.DB_PATH = dbFile;
const db2 = require('../server/src/db/connection');

// 3. 校验列与表
const cols = (t) => db2.prepare(`PRAGMA table_info(${t})`).all().map((c) => c.name);
const need = {
  'users': ['email', 'email_verified', 'failed_login_count', 'locked_until'],
  'registrations': ['checked_in', 'checked_in_at'],
  'events': ['checkin_code'],
};
let ok = true;
for (const [t, list] of Object.entries(need)) {
  const have = cols(t);
  for (const c of list) {
    const pass = have.includes(c);
    if (!pass) ok = false;
    console.log(`  ${pass ? 'PASS' : 'FAIL'}  ${t}.${c} 已补齐`);
  }
}
for (const t of ['email_codes', 'audit_logs']) {
  const have = db2.prepare(`SELECT name FROM sqlite_master WHERE type='table' AND name=?`).get(t);
  const pass = Boolean(have);
  if (!pass) ok = false;
  console.log(`  ${pass ? 'PASS' : 'FAIL'}  表 ${t} 已创建`);
}
const idx = db2.prepare(`SELECT name FROM sqlite_master WHERE type='index' AND name='idx_users_email'`).get();
console.log(`  ${idx ? 'PASS' : 'FAIL'}  唯一索引 idx_users_email 已创建`);
if (!idx) ok = false;

// 4. 历史数据保留
const u = db2.prepare(`SELECT * FROM users WHERE student_id='v1user'`).get();
const r = db2.prepare(`SELECT * FROM registrations WHERE id=1`).get();
console.log(`  ${u && u.name === '老用户' ? 'PASS' : 'FAIL'}  v1 用户数据保留`);
console.log(`  ${r && r.status === 'approved' && r.checked_in === 0 ? 'PASS' : 'FAIL'}  v1 报名数据保留（checked_in 默认 0）`);
if (!(u && u.name === '老用户' && r && r.status === 'approved')) ok = false;

// 5. 幂等：再跑一次迁移不报错
try {
  require('../server/src/db/migrate').runMigrations();
  console.log('  PASS  二次执行迁移无报错（幂等）');
} catch (e) {
  ok = false;
  console.log('  FAIL  二次执行迁移报错：' + e.message);
}

// 6. 老用户 email 为空不撞唯一索引：再插一个无邮箱用户
try {
  db2.prepare(`INSERT INTO users (student_id, name, password_hash, created_at) VALUES ('v1user2', '老用户二', 'x', ?)`).run(now);
  console.log('  PASS  多个 NULL 邮箱老用户不冲突（SQLite 唯一索引 NULL 互斥）');
} catch (e) {
  ok = false;
  console.log('  FAIL  NULL 邮箱冲突：' + e.message);
}

console.log(ok ? '\n[qa] 迁移演练全部通过' : '\n[qa] 迁移演练存在问题');
process.exit(ok ? 0 : 1);
