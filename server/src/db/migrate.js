/**
 * 幂等增量迁移（v2）：启动时执行，可重复执行不报错。
 * 策略：PRAGMA table_info 查字段在否 → 不在才 ALTER TABLE ADD COLUMN（带默认值）；
 *       新表与索引一律 IF NOT EXISTS。不重建表、不删数据。
 * 由 connection.js 在 module.exports 赋值之后调用（避开循环依赖）。
 */
const db = require('./connection');

/** 查询表字段是否存在 */
function columnExists(table, column) {
  return db.prepare(`PRAGMA table_info(${table})`).all().some((c) => c.name === column);
}

/** 字段不存在才添加列（幂等） */
function addColumn(table, column, ddl) {
  if (!columnExists(table, column)) {
    db.prepare(`ALTER TABLE ${table} ADD COLUMN ${column} ${ddl}`).run();
    console.log(`[migrate] ${table}.${column} added`);
  }
}

function runMigrations() {
  // users：邮箱与登录锁定（F3/F12）
  addColumn('users', 'email', 'TEXT');
  addColumn('users', 'email_verified', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('users', 'failed_login_count', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('users', 'locked_until', 'TEXT');
  // registrations：核销字段（F4）
  addColumn('registrations', 'checked_in', 'INTEGER NOT NULL DEFAULT 0');
  addColumn('registrations', 'checked_in_at', 'TEXT');
  // events：核销口令（F4）
  addColumn('events', 'checkin_code', 'TEXT');

  // 邮箱唯一索引：SQLite 唯一索引中 NULL 视为互异，多个老用户 email 为空不冲突
  db.exec(`CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email)`);

  // 新表：图形验证码（一次性使用，短期有效，与线上 captchas 表结构一致）
  db.exec(`
    CREATE TABLE IF NOT EXISTS captchas (
      id         TEXT    PRIMARY KEY,
      text       TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      used       INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);
  `);

  // 历史库兼容：早期版本的 email_codes 使用 code_hash / used 字段，
  // 而 v2 使用 code / consumed。结构不符时先把旧表改名归档（数据不丢），
  // 再按新结构建表，避免启动阶段建索引时因缺少 consumed 列崩溃。
  try {
    const cols = db.prepare('PRAGMA table_info(email_codes)').all();
    if (cols.length) {
      const names = cols.map((c) => c.name);
      const isLegacy =
        names.includes('code_hash') ||
        !names.includes('consumed') ||
        !names.includes('code');
      if (isLegacy) {
        const stamp = new Date().toISOString().slice(0, 10).replace(/-/g, '');
        db.exec(`ALTER TABLE email_codes RENAME TO email_codes_legacy_${stamp}`);
        console.log(`[migrate] 旧版 email_codes 已归档为 email_codes_legacy_${stamp}`);
      }
    }
  } catch (err) {
    console.warn('[migrate] email_codes 结构检查跳过：', err.message);
  }

  // 新表：验证码（F3/F2）与审计日志（F6）
  db.exec(`
    CREATE TABLE IF NOT EXISTS email_codes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      email      TEXT    NOT NULL,
      code       TEXT    NOT NULL,
      purpose    TEXT    NOT NULL,
      expires_at TEXT    NOT NULL,
      consumed   INTEGER NOT NULL DEFAULT 0,
      attempts   INTEGER NOT NULL DEFAULT 0,
      created_at TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_email_codes_lookup ON email_codes(email, purpose, consumed);
  `);
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id          INTEGER PRIMARY KEY AUTOINCREMENT,
      admin_id    INTEGER NOT NULL REFERENCES users(id),
      action      TEXT    NOT NULL,
      target_type TEXT    NOT NULL,
      target_id   INTEGER NOT NULL,
      detail      TEXT,
      created_at  TEXT    NOT NULL
    );
    CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
    CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);
  `);

  // 候补递补索引：按 created_at ASC, id ASC 取首位候补
  db.exec(
    `CREATE INDEX IF NOT EXISTS idx_reg_waitlist ON registrations(event_id, status, created_at)`
  );

  // 新表：日历备注（一日一条，UNIQUE(user_id, date)）
  db.exec(`
    CREATE TABLE IF NOT EXISTS calendar_notes (
      id         INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id    INTEGER NOT NULL REFERENCES users(id),
      date       TEXT    NOT NULL,
      content    TEXT    NOT NULL,
      created_at TEXT    NOT NULL,
      updated_at TEXT    NOT NULL
    );
    CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_notes_user_date ON calendar_notes(user_id, date);
  `);

  console.log('[migrate] 增量迁移完成');
}

module.exports = { runMigrations };
