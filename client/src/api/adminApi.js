/**
 * 管理后台 API（均需管理员权限）。
 */
import client from './client';

/** 数据概览 */
export function overview() {
  return client.get('/admin/overview');
}

/** 全站活动列表：{status?, keyword?, page, page_size} */
export function listEvents(params) {
  return client.get('/admin/events', { params });
}

/** 审核活动：action = 'approve' | 'reject'，reject 需 reason */
export function reviewEvent(id, action, reason) {
  return client.put(`/admin/events/${id}/review`, { action, reason });
}

/** 下架活动 */
export function offlineEvent(id) {
  return client.put(`/admin/events/${id}/offline`);
}

/** 置顶 / 取消置顶活动 → {event}（event.is_pinned 置顶为 1，取消为 0） */
export function pinEvent(id) {
  return client.put(`/admin/events/${id}/pin`);
}

/** 用户列表：{keyword?, page, page_size} */
export function listUsers(params) {
  return client.get('/admin/users', { params });
}

/** 禁用/启用用户：status = 'active' | 'disabled' */
export function setUserStatus(id, status) {
  return client.put(`/admin/users/${id}/status`, { status });
}

/** 管理员重置用户密码（F1）→ {temp_password, user}（临时密码一次性展示） */
export function resetUserPassword(id) {
  return client.put(`/admin/users/${id}/password/reset`);
}

/** 审计日志查询（F6，只读）：{action?, target_type?, start_date?, end_date?, page, page_size} */
export function listAuditLogs(params) {
  return client.get('/admin/audit-logs', { params });
}

/** 全站报名趋势（F8）：{days?} → {days:[{date,count}], total} */
export function overviewTrend(params) {
  return client.get('/admin/overview/trend', { params });
}
