/**
 * clashUi.jsx — 页面层共享片段（清爽风格）
 *
 * 提供：SkeletonCard / SkeletonList / ErrorState / AuthShell / PAGINATION_SX / CLASH_HEAD_SX
 */
import Button from '@mui/material/Button';
import { CLASH } from '../theme';

/**
 * 骨架屏占位卡：封面 + 文本行 + 按钮位，用于活动卡片网格。
 */
export function SkeletonCard({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-xl border border-ink/10 bg-paper-card">
          <div className="skeleton h-36 w-full" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-9 w-full rounded-lg" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 列表骨架屏：纵向列表。
 */
export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-xl border border-ink/10 bg-paper-card p-3">
          <div className="skeleton h-20 w-28 flex-shrink-0 rounded-lg" />
          <div className="flex-1 space-y-2 py-1">
            <div className="skeleton h-4 w-2/3 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-1/3 rounded" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 错误态：柔和卡片 + 说明 + 重试按钮。
 */
export function ErrorState({ text = '加载失败，请稍后重试', onRetry }) {
  return (
    <div className="flex flex-col items-center justify-center gap-3 rounded-xl border border-ink/10 bg-paper-card px-6 py-10 text-center">
      <p className="text-sm text-ink-soft">{text}</p>
      {onRetry && (
        <Button variant="contained" onClick={onRetry} sx={{ mt: 0.5 }}>
          重试
        </Button>
      )}
    </div>
  );
}

/**
 * 认证页外壳：左侧柔和渐变品牌区 + 右侧表单卡；移动端品牌区压缩为横幅。
 */
export function AuthShell({
  accent = '#9c6b3f',
  brandTitle = '校园活动',
  slogan = '发现 · 报名 · 参与校园里的每一种可能',
  children,
}) {
  return (
    <div className="min-h-screen bg-paper md:flex">
      <aside
        className="relative overflow-hidden px-6 py-8 md:flex md:w-[46%] md:flex-col md:justify-between md:px-12 md:py-16"
        style={{ background: 'linear-gradient(160deg, #f5f1e8 0%, #eef2ea 55%, #e8eef0 100%)' }}
      >
        <div className="relative">
          <div
            className="mb-5 flex h-12 w-12 items-center justify-center rounded-xl text-white"
            style={{ backgroundColor: accent }}
          >
            <span className="text-xl font-semibold">校</span>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight text-ink md:text-4xl">{brandTitle}</h1>
          <p className="mt-3 max-w-xs text-sm leading-relaxed text-ink-mute md:text-base">{slogan}</p>
        </div>
        <p className="relative mt-8 hidden text-xs tracking-widest text-ink-faint md:block">
          校园活动报名系统
        </p>
      </aside>

      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

/** 分页：选中项用主题色 */
export const PAGINATION_SX = {
  '& .MuiPaginationItem-root': {
    borderRadius: 8,
    fontWeight: 500,
    color: 'var(--ink-soft)',
    minWidth: 40,
    minHeight: 40,
  },
  '& .Mui-selected': {
    backgroundColor: '#9c6b3f',
    color: '#fff',
    '&:hover': { backgroundColor: '#7a5230' },
  },
};

/** 表格表头底色 */
export const CLASH_HEAD_SX = {
  backgroundColor: 'rgba(156,107,63,0.06)',
  fontWeight: 600,
  whiteSpace: 'nowrap',
};
