/**
 * 站内信 API。
 */
import client from './client';

/** 分页站内信 → {list,total,page,page_size,unread_count} */
export function listNotifications(params) {
  return client.get('/notifications', { params });
}

/** 标记已读 → {unread_count} */
export function markRead(id) {
  return client.put(`/notifications/${id}/read`);
}

/** 全部已读 → {unread_count} */
export function markAllRead() {
  return client.put('/notifications/read-all');
}
