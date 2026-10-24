-- 校园活动报名系统数据库 DDL（SQLite）
-- 所有时间字段为 TEXT 存 ISO 8601 UTC 字符串；主键统一 INTEGER PRIMARY KEY AUTOINCREMENT。

-- 用户表：学号为登录账号，全员可发布活动
CREATE TABLE IF NOT EXISTS users (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  student_id    TEXT    NOT NULL UNIQUE,          -- 学号，登录账号
  name          TEXT    NOT NULL,                 -- 姓名（报名名单用）
  phone         TEXT,                             -- 手机号，可后补
  password_hash TEXT    NOT NULL,                 -- bcrypt 哈希
  role          TEXT    NOT NULL DEFAULT 'user',  -- user / admin
  status        TEXT    NOT NULL DEFAULT 'active',-- active / disabled
  created_at    TEXT    NOT NULL,
  -- ===== 增量 v2（老用户为空，不影响；存量库升级走 migrate.js 幂等补齐）=====
  email             TEXT,                             -- 绑定邮箱（可空，唯一索引见 migrate.js）
  email_verified    INTEGER NOT NULL DEFAULT 0,       -- 邮箱是否已验证
  failed_login_count INTEGER NOT NULL DEFAULT 0,      -- 登录失败计数（F12 锁定）
  locked_until      TEXT                               -- 锁定到期时间（ISO UTC，NULL=未锁定）
);

-- 分类表：预置种子数据（讲座/社团/体育/文艺/志愿/其他）
CREATE TABLE IF NOT EXISTS categories (
  id   INTEGER PRIMARY KEY AUTOINCREMENT,
  name TEXT    NOT NULL UNIQUE,
  sort INTEGER NOT NULL DEFAULT 0
);

-- 活动表
CREATE TABLE IF NOT EXISTS events (
  id              INTEGER PRIMARY KEY AUTOINCREMENT,
  title           TEXT    NOT NULL,                  -- ≤80 字
  category_id     INTEGER NOT NULL REFERENCES categories(id),
  cover_url       TEXT,                              -- 封面图路径（/uploads/xxx）
  location        TEXT    NOT NULL,
  start_time      TEXT    NOT NULL,                  -- 活动开始（ISO UTC）
  end_time        TEXT    NOT NULL,                  -- 活动结束（ISO UTC）
  signup_deadline TEXT    NOT NULL,                  -- 报名截止（ISO UTC）
  capacity        INTEGER NOT NULL DEFAULT 0,        -- 人数上限，0=不限
  approved_count  INTEGER NOT NULL DEFAULT 0,        -- 已成功报名数（冗余计数，防超卖判断用）
  organizer_id    INTEGER NOT NULL REFERENCES users(id),
  require_approval INTEGER NOT NULL DEFAULT 0,       -- 0 直接报名 / 1 需审核
  description     TEXT,                              -- 富文本（服务端已白名单过滤）
  status          TEXT    NOT NULL DEFAULT 'pending',-- pending/approved/rejected/offline/cancelled
  reject_reason   TEXT,                              -- 审核拒绝理由
  created_at      TEXT    NOT NULL,
  updated_at      TEXT    NOT NULL,
  -- ===== 增量 v2（存量库升级走 migrate.js 幂等补齐）=====
  checkin_code    TEXT                               -- 核销口令（可空，一活动一口令，F4）
);

-- 报名表：UNIQUE(event_id, user_id) 防重复报名；取消后再报名为状态重置（UPDATE）
CREATE TABLE IF NOT EXISTS registrations (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  event_id   INTEGER NOT NULL REFERENCES events(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  remark     TEXT,                                   -- 报名备注
  status     TEXT    NOT NULL,                       -- pending/approved/rejected/cancelled/waitlisted
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL,
  -- ===== 增量 v2（存量库升级走 migrate.js 幂等补齐）=====
  checked_in    INTEGER NOT NULL DEFAULT 0,          -- 是否已核销（F4）
  checked_in_at TEXT                                 -- 核销时间（ISO UTC）
);

-- 日历备注：用户自建的每日备忘（一日一条，UNIQUE(user_id, date)）
CREATE TABLE IF NOT EXISTS calendar_notes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),
  date       TEXT    NOT NULL,                  -- 本地日期 YYYY-MM-DD
  content    TEXT    NOT NULL,                  -- 备注内容（≤500 字）
  created_at TEXT    NOT NULL,
  updated_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_calendar_notes_user_date ON calendar_notes(user_id, date);

-- ===== 校园论坛（/forum 分区）=====
-- 帖子表
CREATE TABLE IF NOT EXISTS posts (
  id            INTEGER PRIMARY KEY AUTOINCREMENT,
  author_id     INTEGER NOT NULL REFERENCES users(id),
  title         TEXT    NOT NULL,
  content       TEXT    NOT NULL,                  -- 富文本（服务端白名单净化）
  media         TEXT,                              -- JSON：{images:[/uploads/..], videos:[{type:'upload'|'embed', url, poster?}]}
  topics        TEXT,                              -- 话题标签，逗号分隔
  view_count    INTEGER NOT NULL DEFAULT 0,
  comment_count INTEGER NOT NULL DEFAULT 0,
  like_count    INTEGER NOT NULL DEFAULT 0,
  favorite_count INTEGER NOT NULL DEFAULT 0,
  status        TEXT    NOT NULL DEFAULT 'active', -- active / deleted
  created_at    TEXT    NOT NULL,
  updated_at    TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_posts_author ON posts(author_id, created_at);
CREATE INDEX IF NOT EXISTS idx_posts_created ON posts(status, created_at);

-- 评论/回复表（parent_id=0 为主评论，否则为对某条评论的回复）
CREATE TABLE IF NOT EXISTS comments (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  post_id    INTEGER NOT NULL REFERENCES posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  parent_id  INTEGER NOT NULL DEFAULT 0,
  content    TEXT    NOT NULL,
  status     TEXT    NOT NULL DEFAULT 'active',    -- active / deleted
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_comments_post ON comments(post_id, parent_id, created_at);

-- 帖子点赞（一人一赞，UNIQUE 约束）
CREATE TABLE IF NOT EXISTS post_likes (
  post_id    INTEGER NOT NULL REFERENCES posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_likes_unique ON post_likes(post_id, user_id);

-- 帖子收藏
CREATE TABLE IF NOT EXISTS post_favorites (
  post_id    INTEGER NOT NULL REFERENCES posts(id),
  user_id    INTEGER NOT NULL REFERENCES users(id),
  created_at TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_post_favorites_unique ON post_favorites(post_id, user_id);

-- 关注（follower_id 关注 followee_id）
CREATE TABLE IF NOT EXISTS user_follows (
  follower_id INTEGER NOT NULL REFERENCES users(id),
  followee_id INTEGER NOT NULL REFERENCES users(id),
  created_at  TEXT    NOT NULL
);
CREATE UNIQUE INDEX IF NOT EXISTS idx_user_follows_unique ON user_follows(follower_id, followee_id);
CREATE INDEX IF NOT EXISTS idx_user_follows_followee ON user_follows(followee_id);

-- 站内信表
CREATE TABLE IF NOT EXISTS notifications (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  user_id    INTEGER NOT NULL REFERENCES users(id),  -- 接收人
  type       TEXT    NOT NULL,                       -- registration_approved/registration_rejected/event_approved/event_rejected/event_cancelled/event_offline/password_changed/password_reset/waitlist_promoted
  title      TEXT    NOT NULL,
  content    TEXT    NOT NULL,
  is_read    INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);

-- 图形验证码表（防机器人暴力操作）：一次性使用，短期有效
CREATE TABLE IF NOT EXISTS captchas (
  id         TEXT    PRIMARY KEY,               -- UUID
  text       TEXT    NOT NULL,                  -- 验证码文本（服务端比对，不区分大小写）
  expires_at TEXT    NOT NULL,
  used       INTEGER NOT NULL DEFAULT 0,
  created_at TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_captchas_expires ON captchas(expires_at);

-- 邮箱验证码表（F3/F2/F3 联动共用，purpose 区分用途）
CREATE TABLE IF NOT EXISTS email_codes (
  id         INTEGER PRIMARY KEY AUTOINCREMENT,
  email      TEXT    NOT NULL,                    -- 接收邮箱
  code       TEXT    NOT NULL,                    -- 6 位数字验证码
  purpose    TEXT    NOT NULL,                    -- register / reset_password / bind_email
  expires_at TEXT    NOT NULL,                    -- 过期时间（ISO 8601 UTC）
  consumed   INTEGER NOT NULL DEFAULT 0,          -- 0 未使用 / 1 已使用或已作废
  attempts   INTEGER NOT NULL DEFAULT 0,          -- 校验失败次数（满 5 作废）
  created_at TEXT    NOT NULL
);
-- 注意：idx_email_codes_lookup 不在此处创建。历史库里 email_codes 可能是旧结构
-- （code_hash / used），此时建索引会因缺少 consumed 列而启动崩溃。
-- 该索引统一由 db/migrate.js 在"旧表改名归档 + 建新表"之后创建。

-- 管理员操作日志表（F6，只读）
CREATE TABLE IF NOT EXISTS audit_logs (
  id          INTEGER PRIMARY KEY AUTOINCREMENT,
  admin_id    INTEGER NOT NULL REFERENCES users(id),
  action      TEXT    NOT NULL,                    -- 见 AUDIT_ACTION 常量
  target_type TEXT    NOT NULL,                    -- event / user
  target_id   INTEGER NOT NULL,
  detail      TEXT,                                -- JSON 字符串，禁存敏感信息
  created_at  TEXT    NOT NULL
);
CREATE INDEX IF NOT EXISTS idx_audit_logs_action ON audit_logs(action, created_at);
CREATE INDEX IF NOT EXISTS idx_audit_logs_admin ON audit_logs(admin_id);

-- 索引
CREATE UNIQUE INDEX IF NOT EXISTS idx_users_student_id ON users(student_id);
CREATE INDEX IF NOT EXISTS idx_events_status_start ON events(status, start_time);
CREATE INDEX IF NOT EXISTS idx_events_category ON events(category_id);
CREATE INDEX IF NOT EXISTS idx_events_organizer ON events(organizer_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_reg_event_user ON registrations(event_id, user_id);
CREATE INDEX IF NOT EXISTS idx_reg_user ON registrations(user_id, status);
CREATE INDEX IF NOT EXISTS idx_notifications_user ON notifications(user_id, is_read);

-- 增量索引（v2）：候补递补取首位候补（created_at ASC, id ASC）。
-- 注意：idx_users_email（users.email 唯一索引）不放在本文件——存量库在此处
-- 尚无 email 列，须由 migrate.js 补齐列后再创建（幂等，见 db/migrate.js）。
CREATE INDEX IF NOT EXISTS idx_reg_waitlist ON registrations(event_id, status, created_at);
