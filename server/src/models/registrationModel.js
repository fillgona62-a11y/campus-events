/**
 * 报名模型：registrations 表 SQL 封装。
 * UNIQUE(event_id, user_id) 防重复；upsert 支持“取消后重新报名”（状态重置、核销态重置）。
 * v2 扩展：候补顺位计算（SQL 子查询）、核销字段读写、报名趋势统计（UTC+8 归日期）。
 */
const db = require('../db/connection');
const { REG_STATUS } = require('../utils/constants');

function findById(id) {
  return db.prepare('SELECT * FROM registrations WHERE id = ?').get(id);
}

function findByEventAndUser(eventId, userId) {
  return db
    .prepare('SELECT * FROM registrations WHERE event_id = ? AND user_id = ?')
    .get(eventId, userId);
}

/**
 * 写入报名：不存在则 INSERT；已存在（唯一索引冲突）则 UPDATE 状态/备注，
 * 实现“取消后可重新报名”；重新报名时核销态重置为 0。
 */
function upsert({ event_id, user_id, remark, status }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO registrations (event_id, user_id, remark, status, created_at, updated_at)
     VALUES (?, ?, ?, ?, ?, ?)
     ON CONFLICT(event_id, user_id)
     DO UPDATE SET status = excluded.status, remark = excluded.remark,
                   updated_at = excluded.updated_at, checked_in = 0, checked_in_at = NULL`
  ).run(event_id, user_id, remark || null, status, now, now);
  return findByEventAndUser(event_id, user_id);
}

/** 报名状态迁移（由 service 层调用） */
function updateStatus(id, status) {
  const now = new Date().toISOString();
  db.prepare('UPDATE registrations SET status = ?, updated_at = ? WHERE id = ?').run(
    status,
    now,
    id
  );
}

/** 标记已核销（F4，checked_in=1 + 核销时间） */
function markCheckedIn(id, checkedInAt) {
  db.prepare('UPDATE registrations SET checked_in = 1, checked_in_at = ? WHERE id = ?').run(
    checkedInAt,
    id
  );
}

/** 统计活动指定状态报名数 */
function countByEventAndStatus(eventId, status) {
  return db
    .prepare('SELECT COUNT(*) AS c FROM registrations WHERE event_id = ? AND status = ?')
    .get(eventId, status).c;
}

/** 统计活动指定状态 + 指定核销状态的报名数 */
function countByEventStatusCheckedIn(eventId, status, checkedIn) {
  return db
    .prepare(
      'SELECT COUNT(*) AS c FROM registrations WHERE event_id = ? AND status = ? AND checked_in = ?'
    )
    .get(eventId, status, checkedIn).c;
}

/** 候补顺位子查询：同活动 waitlisted 记录按 created_at ASC, id ASC 的排名（第 1 位最早）。
 *  用 CASE 包裹：仅对 waitlisted 行才计算顺位，非候补行直接为 NULL，
 *  避免为大量非候补行执行无意义的相关 COUNT 子查询。 */
const WAITLIST_POSITION_SQL = `CASE WHEN r.status = '${REG_STATUS.WAITLISTED}'
  THEN (
    SELECT COUNT(*) + 1 FROM registrations w
    WHERE w.event_id = r.event_id AND w.status = '${REG_STATUS.WAITLISTED}'
      AND (w.created_at < r.created_at OR (w.created_at = r.created_at AND w.id < r.id))
  )
  ELSE NULL END`;

/**
 * 单活动报名名单（含用户信息），按报名时间升序。
 * v2：支持 checked_in 核销状态筛选；行含 checked_in / checked_in_at；
 * waitlisted 行附 waitlist_position 顺位。
 */
function listByEvent(eventId, { status, checked_in, page, page_size }) {
  const conditions = ['r.event_id = ?'];
  const params = [eventId];
  if (status) {
    conditions.push('r.status = ?');
    params.push(status);
  }
  if (checked_in !== undefined && checked_in !== null) {
    conditions.push('r.checked_in = ?');
    params.push(checked_in ? 1 : 0);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM registrations r ${where}`)
    .get(...params).c;
  const list = db
    .prepare(
      `SELECT r.id, r.remark, r.status, r.created_at, r.checked_in, r.checked_in_at,
              ${WAITLIST_POSITION_SQL} AS waitlist_position,
              u.student_id, u.name, u.phone
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       ${where} ORDER BY r.created_at ASC LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/**
 * 我的报名（含活动摘要）。tab=upcoming 未结束活动 / tab=past 已结束活动。
 */
function listByUser(userId, { tab, page, page_size }) {
  const now = new Date().toISOString();
  const timeCond = tab === 'past' ? 'e.end_time < ?' : 'e.end_time >= ?';
  const where = `WHERE r.user_id = ? AND ${timeCond}`;
  const params = [userId, now];
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM registrations r JOIN events e ON e.id = r.event_id ${where}`
    )
    .get(...params).c;
  const order = tab === 'past' ? 'e.start_time DESC' : 'e.start_time ASC';
  const list = db
    .prepare(
      `SELECT r.id, r.status, r.remark, r.created_at, r.checked_in,
              ${WAITLIST_POSITION_SQL} AS waitlist_position,
              e.id AS event_id, e.title, e.cover_url, e.location,
              e.start_time, e.end_time, e.signup_deadline, e.status AS event_status,
              e.lat, e.lng, e.checkin_radius, e.beacon_uuid
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 导出用：单活动全部报名记录（含核销字段，按报名时间升序） */
function listForExport(eventId) {
  return db
    .prepare(
      `SELECT r.remark, r.status, r.checked_in, r.created_at,
              u.student_id, u.name, u.phone
       FROM registrations r
       JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ?
       ORDER BY r.created_at ASC`
    )
    .all(eventId);
}

/** 某活动指定状态的报名用户 id 列表（取消活动时群发站内信用） */
function listUserIdsByEventAndStatus(eventId, status) {
  return db
    .prepare('SELECT user_id FROM registrations WHERE event_id = ? AND status = ?')
    .all(eventId, status)
    .map((row) => row.user_id);
}

/**
 * 某活动报名成功用户列表（含邮箱，v4 提醒任务用）。
 * 仅返回 approved 且用户有绑定邮箱的记录。
 * @returns {Array<{user_id:number, email:string, name:string}>}
 */
function listApprovedWithEmail(eventId) {
  return db
    .prepare(
      `SELECT r.user_id, u.email, u.name
       FROM registrations r JOIN users u ON u.id = r.user_id
       WHERE r.event_id = ? AND r.status = ? AND u.email IS NOT NULL AND u.email != ''`
    )
    .all(eventId, REG_STATUS.APPROVED);
}

/**
 * 各分类报名人数分布（v4 数据大屏用）：按活动分类聚合已成功报名数。
 * @returns {Array<{category_name:string, count:number}>}
 */
function countByCategory() {
  return db
    .prepare(
      `SELECT c.name AS category_name, COUNT(r.id) AS count
       FROM registrations r
       JOIN events e ON e.id = r.event_id
       JOIN categories c ON c.id = e.category_id
       WHERE r.status IN ('approved', 'waitlisted')
       GROUP BY c.id ORDER BY count DESC`
    )
    .all();
}

/**
 * 取活动最早候补者（递补用）：status='waitlisted' 按 created_at ASC, id ASC 第一条。
 * @returns {object|null}
 */
function findFirstWaitlisted(eventId) {
  return db
    .prepare(
      `SELECT * FROM registrations
       WHERE event_id = ? AND status = ?
       ORDER BY created_at ASC, id ASC LIMIT 1`
    )
    .get(eventId, REG_STATUS.WAITLISTED);
}

/** 当前候补人数（活动详情展示） */
function countWaitlisted(eventId) {
  return db
    .prepare(
      "SELECT COUNT(*) AS c FROM registrations WHERE event_id = ? AND status = 'waitlisted'"
    )
    .get(eventId).c;
}

/**
 * 计算某候补报名的顺位：同活动 waitlisted 中按 created_at ASC, id ASC 的排名（1 起）。
 * @returns {number|null} 非候补记录返回 null
 */
function waitlistPosition(eventId, registrationId) {
  const row = db.prepare('SELECT created_at, status FROM registrations WHERE id = ?').get(registrationId);
  if (!row || row.status !== REG_STATUS.WAITLISTED) return null;
  return db
    .prepare(
      `SELECT COUNT(*) + 1 AS pos FROM registrations
       WHERE event_id = ? AND status = ?
         AND (created_at < ? OR (created_at = ? AND id < ?))`
    )
    .get(eventId, REG_STATUS.WAITLISTED, row.created_at, row.created_at, registrationId).pos;
}

/** 报名总数（数据概览用） */
function count() {
  return db.prepare('SELECT COUNT(*) AS c FROM registrations').get().c;
}

/**
 * 单活动近 N 天报名趋势（F8）：当日创建且 status ∈ pending/approved/waitlisted 计为有效报名，
 * 按北京时间（UTC+8）归日期，无数据日补 0。
 * @param {number} eventId
 * @param {number} days 1~90
 * @returns {{days:Array<{date:string,count:number}>, total:number}}
 */
function trendByEvent(eventId, days) {
  const rows = db
    .prepare(
      `SELECT date(created_at, '+8 hours') AS d, COUNT(*) AS c
       FROM registrations
       WHERE event_id = ?
         AND status IN ('pending', 'approved', 'waitlisted')
         AND date(created_at, '+8 hours') >= date('now', '+8 hours', ?)
       GROUP BY d`
    )
    .all(eventId, `-${days - 1} days`);
  return buildTrendDays(rows, days);
}

/**
 * 全站近 N 天报名趋势（F8）：口径同 trendByEvent。
 * @param {number} days 1~90
 * @returns {{days:Array<{date:string,count:number}>, total:number}}
 */
function trendAll(days) {
  const rows = db
    .prepare(
      `SELECT date(created_at, '+8 hours') AS d, COUNT(*) AS c
       FROM registrations
       WHERE status IN ('pending', 'approved', 'waitlisted')
         AND date(created_at, '+8 hours') >= date('now', '+8 hours', ?)
       GROUP BY d`
    )
    .all(`-${days - 1} days`);
  return buildTrendDays(rows, days);
}

/**
 * 将 SQL 聚合结果补齐为连续日期序列（无数据日补 0）。
 * @param {Array<{d:string,c:number}>} rows
 * @param {number} days
 */
function buildTrendDays(rows, days) {
  const map = new Map(rows.map((r) => [r.d, r.c]));
  const daysArr = [];
  let total = 0;
  for (let i = days - 1; i >= 0; i--) {
    // 以 UTC+8 计算日期字符串，与 SQL 口径一致
    const d = new Date(Date.now() + 8 * 3600e3 - i * 24 * 3600e3)
      .toISOString()
      .slice(0, 10);
    const count = map.get(d) || 0;
    total += count;
    daysArr.push({ date: d, count });
  }
  return { days: daysArr, total };
}

module.exports = {
  findById,
  findByEventAndUser,
  upsert,
  updateStatus,
  markCheckedIn,
  countByEventAndStatus,
  countByEventStatusCheckedIn,
  listByEvent,
  listByUser,
  listForExport,
  listUserIdsByEventAndStatus,
  listApprovedWithEmail,
  countByCategory,
  findFirstWaitlisted,
  countWaitlisted,
  waitlistPosition,
  count,
  trendByEvent,
  trendAll,
};
