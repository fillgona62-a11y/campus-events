/**
 * StatusBadge.jsx — 状态徽标（清爽风格）
 *
 * 视觉：淡色底 + 同色系文字，无硬边；色义清晰。
 */
import { EVENT_STATUS_MAP, REG_STATUS_MAP, CHECKED_IN_MAP } from '../utils/constants';

/** 状态 → 前景色（淡色底由前景色透明度生成） */
const STATUS_COLOR = {
  pending: '#a8823f',   // 待审核（藤黄）
  approved: '#5f7d5a',  // 已发布/已成功（竹青）
  rejected: '#b3432f',  // 已拒绝（朱砂）
  offline: '#7a756c',   // 已下架（灰墨）
  cancelled: '#7a756c', // 已取消（灰墨）
  waitlisted: '#a8823f',// 候补中（藤黄）
};

const CHECKED_COLOR = {
  1: '#5f7d5a', // 已核销
  0: '#7a756c', // 未核销
};

export default function StatusBadge({ type, status, size = 'small' }) {
  let label;
  if (type === 'checked') {
    label = CHECKED_IN_MAP[status]?.label || '未核销';
  } else {
    const map = type === 'event' ? EVENT_STATUS_MAP : REG_STATUS_MAP;
    label = map[status]?.label || status || '未知';
  }

  const color = type === 'checked' ? (CHECKED_COLOR[status] ?? '#7a756c') : (STATUS_COLOR[status] ?? '#7a756c');

  const medium = size === 'medium';

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-full font-medium leading-none',
        medium ? 'px-2.5 py-1 text-sm' : 'px-2 py-0.5 text-xs',
      ].join(' ')}
      style={{ backgroundColor: `${color}1a`, color }}
    >
      {label}
    </span>
  );
}
