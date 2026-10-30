/**
 * 管理员操作日志模型：audit_logs 表 SQL 封装（只读查询 + 内部写入）。
 * 写入统一走 auditService.log()，本模块不被其他业务直接调用。
 */
const db = require('../db/connection');

/**
 * 插入一条审计日志
 * @param {{admin_id:number, action:string, target_type:string, target_id:number, detail:string|null}} data
 */
function insert({ admin_id, action, target_type, target_id, detail }) {
  const now = new Date().toISOString();
  db.prepare(
    `INSERT INTO audit_logs (admin_id, action, target_type, target_id, detail, created_at)
     VALUES (?, ?, ?, ?, ?, ?)`
  ).run(admin_id, action, target_type, target_id, detail || null, now);
}

/**
 * 分页查询审计日志（按 id DESC）。detail 解析为对象返回（禁存敏感信息）。
 * @param {{action?:string, target_type?:string, start_date?:string, end_date?:string, page:number, page_size:number}} filters
 * start_date/end_date 为 YYYY-MM-DD（按 created_at 的 UTC 日期过滤，含首尾两端）。
 */
function list({ action, target_type, start_date, end_date, page, page_size }) {
  const conditions = ['1=1'];
  const params = [];
  if (action) {
    conditions.push('a.action = ?');
    params.push(action);
  }
  if (target_type) {
    conditions.push('a.target_type = ?');
    params.push(target_type);
  }
  if (start_date) {
    conditions.push('date(a.created_at) >= ?');
    params.push(start_date);
  }
  if (end_date) {
    conditions.push('date(a.created_at) <= ?');
    params.push(end_date);
  }
  const where = `WHERE ${conditions.join(' AND ')}`;
  const total = db.prepare(`SELECT COUNT(*) AS c FROM audit_logs a ${where}`).get(...params).c;
  const rows = db
    .prepare(
      `SELECT a.id, a.action, a.target_type, a.target_id, a.detail, a.created_at,
              u.id AS admin_id, u.student_id AS admin_student_id, u.name AS admin_name
       FROM audit_logs a
       JOIN users u ON u.id = a.admin_id
       ${where} ORDER BY a.id DESC LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  // 出参结构对齐设计契约：admin 嵌套为 {id, student_id, name}，detail 解析为对象
  const list = rows.map((row) => ({
    id: row.id,
    action: row.action,
    admin: { id: row.admin_id, student_id: row.admin_student_id, name: row.admin_name },
    target_type: row.target_type,
    target_id: row.target_id,
    detail: parseDetail(row.detail),
    created_at: row.created_at,
  }));
  return { list, total, page, page_size };
}

/** detail 列（JSON 字符串）解析为对象；解析失败保留原字符串，null 保持 null */
function parseDetail(raw) {
  if (!raw) return null;
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

module.exports = { insert, list };
