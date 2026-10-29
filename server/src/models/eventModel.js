/**
 * 活动模型：events 表 SQL 封装。
 * 核心方法 bumpApprovedCount：单条条件 UPDATE 原子占用/释放名额，防超卖。
 */
const db = require('../db/connection');

/** 通用联查列：活动 + 分类名 + 发布者姓名 */
const BASE_SELECT = `
  SELECT e.*, c.name AS category_name, u.name AS organizer_name
  FROM events e
  LEFT JOIN categories c ON c.id = e.category_id
  LEFT JOIN users u ON u.id = e.organizer_id
`;

function findById(id) {
  return db.prepare(`${BASE_SELECT} WHERE e.id = ?`).get(id);
}

/**
 * 公开活动列表：仅 status='approved' 且未结束（end_time > 当前），按开始时间升序。
 * v2：支持 start_from/start_to（ISO 时间，日历页拉整月活动；不传时行为与 v1 一致）。
 * @param {{keyword?:string, category_id?:number, start_from?:string, start_to?:string, page:number, page_size:number}} filters
 */
function listPublic({ keyword, category_id, start_from, start_to, page, page_size }) {
  const now = new Date().toISOString();
  const conditions = ["e.status = 'approved'", 'e.end_time > ?'];
  const params = [now];
  if (keyword) {
    conditions.push('(e.title LIKE ? OR e.location LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  if (category_id) {
    conditions.push('e.category_id = ?');
    params.push(category_id);
  }
  if (start_from) {
    conditions.push('e.start_time >= ?');
    params.push(new Date(start_from).toISOString());
  }
  if (start_to) {
    conditions.push('e.start_time <= ?');
    params.push(new Date(start_to).toISOString());
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM events e ${where}`)
    .get(...params).c;
  const list = db
    .prepare(
      `${BASE_SELECT} ${where} ORDER BY e.is_pinned DESC, e.start_time ASC LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 我发布的活动（含审核状态与报名人数），按创建时间倒序 */
function listByOrganizer(organizerId, { page, page_size }) {
  const where = 'WHERE e.organizer_id = ?';
  const total = db
    .prepare(`SELECT COUNT(*) AS c FROM events e ${where}`)
    .get(organizerId).c;
  const list = db
    .prepare(
      `SELECT e.*, c.name AS category_name,
              (SELECT COUNT(*) FROM registrations r
               WHERE r.event_id = e.id AND r.status = 'pending') AS pending_registrations
       FROM events e
       LEFT JOIN categories c ON c.id = e.category_id
       ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(organizerId, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 管理端活动列表（全部状态），支持状态与关键字筛选 */
function listAdmin({ status, keyword, page, page_size }) {
  const conditions = ['1=1'];
  const params = [];
  if (status) {
    conditions.push('e.status = ?');
    params.push(status);
  }
  if (keyword) {
    conditions.push('(e.title LIKE ? OR u.name LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = db
    .prepare(
      `SELECT COUNT(*) AS c FROM events e LEFT JOIN users u ON u.id = e.organizer_id ${where}`
    )
    .get(...params).c;
  const list = db
    .prepare(
      `${BASE_SELECT} ${where} ORDER BY e.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/**
 * 创建活动（初始 status='pending' 待审核）
 */
function insert(data) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO events
       (title, category_id, cover_url, location, start_time, end_time, signup_deadline,
        capacity, approved_count, organizer_id, require_approval, description, status,
        reject_reason, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, 0, ?, ?, ?, 'pending', NULL, ?, ?)`
    )
    .run(
      data.title,
      data.category_id,
      data.cover_url || null,
      data.location,
      data.start_time,
      data.end_time,
      data.signup_deadline,
      data.capacity,
      data.organizer_id,
      data.require_approval,
      data.description || null,
      now,
      now
    );
  return findById(info.lastInsertRowid);
}

/** 全量更新活动信息（编辑后由 service 层重置为 pending 重新审核） */
function update(id, data) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE events SET
       title = ?, category_id = ?, cover_url = ?, location = ?,
       start_time = ?, end_time = ?, signup_deadline = ?, capacity = ?,
       require_approval = ?, description = ?, status = 'pending', reject_reason = NULL,
       updated_at = ?
     WHERE id = ?`
  ).run(
    data.title,
    data.category_id,
    data.cover_url || null,
    data.location,
    data.start_time,
    data.end_time,
    data.signup_deadline,
    data.capacity,
    data.require_approval,
    data.description || null,
    now,
    id
  );
  return findById(id);
}

/** 状态迁移（活动状态机唯一入口之一，由 service 层调用） */
function updateStatus(id, status, reason = null) {
  const now = new Date().toISOString();
  db.prepare('UPDATE events SET status = ?, reject_reason = ?, updated_at = ? WHERE id = ?').run(
    status,
    reason,
    now,
    id
  );
}

/**
 * 原子调整已成功报名数（防超卖核心）。
 * withCheck=true 时带名额条件：capacity=0（不限）或 approved_count+delta ≤ capacity，
 * 条件不满足则影响 0 行，调用方据此判定“名额已满”。
 * @returns {number} 受影响行数
 */
function bumpApprovedCount(id, delta, withCheck) {
  const now = new Date().toISOString();
  if (withCheck) {
    return db
      .prepare(
        `UPDATE events SET approved_count = approved_count + ?, updated_at = ?
         WHERE id = ? AND (capacity = 0 OR approved_count + ? <= capacity)`
      )
      .run(delta, now, id, delta).changes;
  }
  return db
    .prepare('UPDATE events SET approved_count = approved_count + ?, updated_at = ? WHERE id = ?')
    .run(delta, now, id).changes;
}

/** 数据概览统计（时间均为 ISO UTC 字符串，字典序即时间序，可直接比较） */
// 现存活动：已上架且未结束（排除 待审/拒绝/下架/取消/已结束）——下架不再计入总数
function countTotal() {
  const now = new Date().toISOString();
  return db
    .prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'approved' AND end_time > ?")
    .get(now).c;
}
// 正在报名：已上架且报名未截止（signup_deadline >= now）
function countOpen() {
  const now = new Date().toISOString();
  return db
    .prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'approved' AND signup_deadline >= ?")
    .get(now).c;
}
// 正在进行：已上架且当前落在 [start_time, end_time] 区间
function countOngoing() {
  const now = new Date().toISOString();
  return db
    .prepare(
      "SELECT COUNT(*) AS c FROM events WHERE status = 'approved' AND start_time <= ? AND end_time >= ?"
    )
    .get(now, now).c;
}
function countPending() {
  return db.prepare("SELECT COUNT(*) AS c FROM events WHERE status = 'pending'").get().c;
}

/** 置顶/取消置顶活动（pinned 为真时记录 pinned_at，否则清空） */
function setPinned(id, pinned) {
  const now = new Date().toISOString();
  db.prepare('UPDATE events SET is_pinned = ?, pinned_at = ?, updated_at = ? WHERE id = ?').run(
    pinned ? 1 : 0,
    pinned ? now : null,
    now,
    id
  );
}

/**
 * 热门活动（v4）：已上架且未结束，按 approved_count 降序取前 N 个。
 * 供首页「热门推荐」位使用。
 * @param {number} limit 返回条数（默认 6）
 */
function listHot(limit = 6) {
  const now = new Date().toISOString();
  return db
    .prepare(
      `${BASE_SELECT} WHERE e.status = 'approved' AND e.end_time > ?
       ORDER BY e.approved_count DESC, e.created_at DESC LIMIT ?`
    )
    .all(now, limit);
}

/**
 * 即将开始的活动（v4，提醒任务用）：已上架、开始时间落在 [now, now+windowMinutes] 区间。
 * @param {number} windowMinutes 时间窗（分钟）
 */
function listStartingSoon(windowMinutes) {
  const now = new Date().toISOString();
  const upper = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();
  return db
    .prepare(
      `${BASE_SELECT} WHERE e.status = 'approved' AND e.start_time > ? AND e.start_time <= ?`
    )
    .all(now, upper);
}

/**
 * 报名即将截止的活动（v4，提醒任务用）：已上架、报名截止时间落在 [now, now+windowMinutes]。
 */
function listDeadlineSoon(windowMinutes) {
  const now = new Date().toISOString();
  const upper = new Date(Date.now() + windowMinutes * 60 * 1000).toISOString();
  return db
    .prepare(
      `${BASE_SELECT} WHERE e.status = 'approved' AND e.signup_deadline > ? AND e.signup_deadline <= ?`
    )
    .all(now, upper);
}

module.exports = {
  findById,
  listPublic,
  listByOrganizer,
  listAdmin,
  insert,
  update,
  updateStatus,
  bumpApprovedCount,
  countTotal,
  countOpen,
  countOngoing,
  countPending,
  setPinned,
  listHot,
  listStartingSoon,
  listDeadlineSoon,
};
