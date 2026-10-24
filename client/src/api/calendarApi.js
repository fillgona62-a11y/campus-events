/**
 * 日历备注 API（需登录，限本人）。
 */
import client from './client';

/** 某月备注 → { notes: [{id,date,content,updated_at}] } */
export function getNotes(month) {
  return client.get('/calendar/notes', { params: { month } });
}

/** 保存(增/改一体)某日备注 → { note } */
export function saveNote(date, content) {
  return client.post('/calendar/notes', { date, content });
}

/** 删除备注 */
export function deleteNote(id) {
  return client.delete(`/calendar/notes/${id}`);
}
