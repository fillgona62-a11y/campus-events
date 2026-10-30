/**
 * EmptyState.jsx — 空状态占位（清爽风格）
 *
 * 视觉：简洁图标 + 柔和底色圆角块，无硬边/硬投影。
 */
import { CLASH } from '../theme';

export default function EmptyState({
  text = '暂无数据',
  title,
  children,
  accent = '#9c6b3f',
  icon,
}) {
  return (
    <div className="flex flex-col items-center justify-center px-6 py-16 text-center">
      <div
        className="mb-5 flex h-20 w-20 items-center justify-center rounded-2xl"
        style={{ backgroundColor: `${accent}14` }}
        aria-hidden="true"
      >
        {icon ?? <span className="text-3xl" style={{ color: accent }}>✦</span>}
      </div>

      <p className="text-base font-medium text-ink">{title || text}</p>
      {title && <p className="mt-1.5 max-w-xs text-sm text-ink-mute">{text}</p>}

      {children && <div className="mt-4 flex flex-wrap items-center justify-center gap-2">{children}</div>}
    </div>
  );
}
