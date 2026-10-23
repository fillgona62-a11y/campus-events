/**
 * 报名 API：取消、发布者审核、我的报名。
 */
import client from './client';

/** 取消报名 */
export function cancelRegistration(id) {
  return client.post(`/registrations/${id}/cancel`);
}

/** 发布者审核报名：action = 'approve' | 'reject' */
export function reviewRegistration(id, action) {
  return client.put(`/registrations/${id}/review`, { action });
}

/** 手动提升候补（F5，发布者/管理员）→ {registration} */
export function promoteWaitlist(id) {
  return client.put(`/registrations/${id}/waitlist/promote`);
}

/** 移出候补（F5，发布者/管理员）→ null */
export function removeWaitlist(id) {
  return client.post(`/registrations/${id}/waitlist/remove`);
}

/** 我的报名：{tab: 'upcoming'|'past', page, page_size} */
export function myRegistrations(params) {
  return client.get('/my/registrations', { params });
}
