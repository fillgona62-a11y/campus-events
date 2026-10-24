/**
 * EmptyState.jsx — 空状态占位（撞色风格）
 *
 * 视觉要点：
 *   1. 不再是灰扑扑的 Inbox 图标，而是「彩色圆角方块 + 四角星」的情绪化图形
 *   2. 图形用色由 accent prop 决定，不同调用方可传入不同撞色
 *   3. 文案分两层：title（主文案）/ text（补充说明），保持 text prop 向后兼容
 *   4. children 插槽放行动按钮（如「去发布活动」），保持既有调用方式不变
 *
 * @param {{text?: string, title?: string, children?: React.ReactNode, accent?: string, icon?: React.ReactNode}} props
 */
import { ClashStar } from './ClashDecor';
import { CLASH } from '../theme';
import { readableText } from '../utils/clash';

export default function EmptyState({
  text = '暂无数据',
  title,
  children,
  accent = CLASH.lime,
  icon,
}) {
  const fg = readableText(accent);

  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      {/* 图形区：三块撞色圆角方块 + 四角星点缀 */}
      <div className="relative mb-6 h-28 w-40" aria-hidden="true">
        <span
          className="absolute left-0 top-4 flex h-20 w-20 -rotate-6 items-center justify-center rounded-2xl border-2 border-ink shadow-block-ink"
          style={{ backgroundColor: accent, color: fg }}
        >
          {icon ?? <ClashStar size={38} />}
        </span>
        <span className="absolute right-2 top-0 flex h-12 w-12 rotate-6 items-center justify-center rounded-xl border-2 border-ink bg-clash-cyan">
          <ClashStar size={20} style={{ color: CLASH.ink }} />
        </span>
        <span className="absolute bottom-0 right-6 flex h-10 w-10 -rotate-12 items-center justify-center rounded-lg border-2 border-ink bg-clash-magenta">
          <ClashStar size={16} style={{ color: CLASH.ink }} />
        </span>
      </div>

      {/* 文案区 */}
      <p className="text-base font-extrabold text-ink">{title || text}</p>
      {title && <p className="mt-1.5 max-w-xs text-sm text-ink-mute">{text}</p>}

      {/* 行动区（children 插槽） */}
      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
