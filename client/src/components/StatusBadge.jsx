/**
 * StatusBadge.jsx — 状态徽标（撞色风格）
 *
 * 视觉要点：
 *   1. 不再用 MUI 默认浅色 Chip，改为「撞色实心 + 2px 墨边」的自绘徽标
 *   2. 色义映射：
 *      · 已发布 / 已成功 / 已核销 → 荧光绿系（正向）
 *      · 待审核 / 候补中 → 柔柠黄（等待中）
 *      · 已拒绝 → 樱珞紫（警示）
 *      · 已下架 / 已取消 / 未核销 → 雾霭蓝灰（终止态）
 *   3. type 支持 'event' | 'reg' | 'checked'，size 支持 'small' | 'medium'
 *      （新增 'checked' 为可选扩展，原有 type/status/size 调用方式完全不变）
 *
 * @param {{type: 'event'|'reg'|'checked', status: string|number, size?: 'small'|'medium'}} props
 */
import { EVENT_STATUS_MAP, REG_STATUS_MAP, CHECKED_IN_MAP } from '../utils/constants';
import { CLASH } from '../theme';
import { readableText } from '../utils/clash';

/** 撞色状态映射：key 为状态枚举值，value 为徽标底色 */
const CLASH_STATUS_COLOR = {
  // 活动状态
  pending: CLASH.lemon, // 待审核
  approved: CLASH.lime, // 已发布
  rejected: CLASH.magenta, // 已拒绝
  offline: CLASH.haze, // 已下架
  cancelled: CLASH.haze, // 已取消
  // 报名状态
  waitlisted: CLASH.lemon, // 候补中
};

/** 核销状态色（CHECKED_IN_MAP 的 key 是 1/0） */
const CLASH_CHECKED_COLOR = {
  1: CLASH.lime, // 已核销
  0: CLASH.haze, // 未核销
};

export default function StatusBadge({ type, status, size = 'small' }) {
  // 取文案：沿用既有常量映射，保证与后端枚举一致
  let label;
  if (type === 'checked') {
    label = CHECKED_IN_MAP[status]?.label || '未核销';
  } else {
    const map = type === 'event' ? EVENT_STATUS_MAP : REG_STATUS_MAP;
    label = map[status]?.label || status || '未知';
  }

  // 取撞色底色
  const bg =
    type === 'checked'
      ? CLASH_CHECKED_COLOR[status] ?? CLASH.haze
      : CLASH_STATUS_COLOR[status] ?? CLASH.haze;

  const medium = size === 'medium';

  return (
    <span
      className={[
        'inline-flex shrink-0 items-center rounded-lg border-2 border-ink font-bold leading-none',
        medium ? 'px-2 py-1 text-sm' : 'px-1.5 py-0.5 text-xs',
      ].join(' ')}
      style={{ backgroundColor: bg, color: readableText(bg) }}
    >
      {label}
    </span>
  );
}
