/**
 * 展示格式化工具：日期时间（UTC ISO → 本地时区）、名额与报名状态展示。
 */
import dayjs from 'dayjs';

/** ISO 时间 → 本地 'YYYY-MM-DD HH:mm' */
export function formatDateTime(iso) {
  if (!iso) return '-';
  return dayjs(iso).format('YYYY-MM-DD HH:mm');
}

/** 活动时间区间展示 */
export function formatTimeRange(start, end) {
  if (!start) return '-';
  const s = dayjs(start);
  const e = dayjs(end);
  if (s.isSame(e, 'day')) {
    return `${s.format('YYYY-MM-DD HH:mm')} ~ ${e.format('HH:mm')}`;
  }
  return `${s.format('YYYY-MM-DD HH:mm')} ~ ${e.format('YYYY-MM-DD HH:mm')}`;
}

/** 剩余名额展示：capacity=0 表示不限 */
export function remainingText(event) {
  if (!event) return '';
  if (event.capacity === 0) return '不限名额';
  const remaining = Math.max(event.capacity - event.approved_count, 0);
  return `剩余 ${remaining}/${event.capacity}`;
}

/** 是否名额已满 */
export function isFull(event) {
  if (!event) return false;
  return event.capacity > 0 && event.approved_count >= event.capacity;
}

/** 是否已过报名截止时间（本地时间与 ISO UTC 可直接比较时刻） */
export function isSignupClosed(event) {
  if (!event) return false;
  return dayjs().isAfter(dayjs(event.signup_deadline));
}

/** 活动是否已结束 */
export function isEventEnded(event) {
  if (!event) return false;
  return dayjs().isAfter(dayjs(event.end_time));
}
