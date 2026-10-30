/**
 * 审计服务：审计日志写入与查询参数组装。
 * - 写入只走本模块 log()，内部 try/catch：审计失败只 console.error，不阻断主业务。
 * - detail 为 JSON 字符串且禁存密码/验证码/临时密码。
 */
const auditLogModel = require('../models/auditLogModel');
const { PAGINATION } = require('../utils/constants');

/**
 * 写审计日志（失败不抛错，仅记录日志）。
 * @param {number} adminId 操作管理员 id
 * @param {string} action 操作类型（见 AUDIT_ACTION）
 * @param {'event'|'user'} targetType 操作对象类型
 * @param {number} targetId 操作对象 id
 * @param {object|null} detail 明细（JSON 可序列化；禁存敏感信息）
 */
function log(adminId, action, targetType, targetId, detail = null) {
  try {
    auditLogModel.insert({
      admin_id: adminId,
      action,
      target_type: targetType,
      target_id: targetId,
      detail: detail ? JSON.stringify(detail) : null,
    });
  } catch (err) {
    console.error(`[audit] 写入审计日志失败（${action}/${targetType}#${targetId}）：`, err.message);
  }
}

/**
 * 查询审计日志（分页参数在此收敛）。
 * @param {object} query {action?, target_type?, start_date?, end_date?, page?, page_size?}
 */
function list(query = {}) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.page_size, 10);
  if (!Number.isInteger(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  if (pageSize > PAGINATION.MAX_PAGE_SIZE) pageSize = PAGINATION.MAX_PAGE_SIZE;
  return auditLogModel.list({
    action: query.action ? String(query.action) : undefined,
    target_type: query.target_type ? String(query.target_type) : undefined,
    start_date: query.start_date ? String(query.start_date) : undefined,
    end_date: query.end_date ? String(query.end_date) : undefined,
    page,
    page_size: pageSize,
  });
}

module.exports = { log, list };
