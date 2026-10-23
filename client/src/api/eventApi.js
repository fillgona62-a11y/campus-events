/**
 * 活动 API：分类、列表、详情、发布/编辑/取消、我发布的、名单与导出、报名、封面上传。
 */
import client from './client';

/** 分类列表 → {list} */
export function listCategories() {
  return client.get('/categories');
}

/** 公开活动列表：{keyword?, category_id?, start_from?, start_to?, page, page_size} */
export function listEvents(params) {
  return client.get('/events', { params });
}

/** 活动详情 → {event, my_registration} */
export function getEvent(id) {
  return client.get(`/events/${id}`);
}

/** 发布活动 */
export function createEvent(data) {
  return client.post('/events', data);
}

/** 编辑活动（全量） */
export function updateEvent(id, data) {
  return client.put(`/events/${id}`, data);
}

/** 取消活动 */
export function cancelEvent(id) {
  return client.post(`/events/${id}/cancel`);
}

/** 我发布的活动 */
export function myEvents(params) {
  return client.get('/my/events', { params });
}

/** 活动报名名单：{status?, checked_in?: 0|1, page, page_size} */
export function listRegistrations(id, params) {
  return client.get(`/events/${id}/registrations`, { params });
}

/** 单活动报名趋势（F8）：{days?} → {days:[{date,count}], total} */
export function registrationsTrend(id, params) {
  return client.get(`/events/${id}/registrations/trend`, { params });
}

/** 导出报名名单 CSV（触发浏览器下载；JWT 由请求拦截器自动注入） */
export async function exportRegistrations(id) {
  const response = await client.get(`/events/${id}/registrations/export`, {
    responseType: 'blob',
  });
  const blob = response instanceof Blob ? response : new Blob([response]);
  const url = window.URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = `event_${id}_registrations.csv`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  window.URL.revokeObjectURL(url);
}

/** 报名活动：{remark?} */
export function registerEvent(id, remark) {
  return client.post(`/events/${id}/register`, { remark });
}

/** 上传封面图（multipart）→ {url} */
export function uploadCover(file) {
  const formData = new FormData();
  formData.append('file', file);
  return client.post('/upload', formData, {
    headers: { 'Content-Type': 'multipart/form-data' },
  });
}

// ===== 签到核销（F4，组织者/管理员）=====

/** 生成/重生成核销口令 → {checkin_code} */
export function generateCheckinCode(eventId) {
  return client.post(`/events/${eventId}/checkin-code`);
}

/** 查看核销口令 → {checkin_code} */
export function getCheckinCode(eventId) {
  return client.get(`/events/${eventId}/checkin-code`);
}

/** 核销：{student_id, code} → {student_id, name, checked_in_at} */
export function checkin(eventId, data) {
  return client.post(`/events/${eventId}/checkin`, data);
}

/** 核销统计 → {approved_count, checked_in_count, unchecked_count} */
export function checkinStats(eventId) {
  return client.get(`/events/${eventId}/checkin/stats`);
}
