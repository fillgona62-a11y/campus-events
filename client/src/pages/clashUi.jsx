/**
 * clashUi.jsx — 页面层撞色（Clash）共享片段
 *
 * 仅服务于 pages/ 目录下的页面拼装，避免每个页面各写一套撞色样式。
 * components/ 目录由组件同事维护，这里不重复造轮子，只做页面级复用。
 *
 * 提供的片段：
 *   SkeletonCard   骨架屏占位卡（加载态，网格布局）
 *   SkeletonList   列表骨架屏（加载态，纵向列表）
 *   ErrorState     错误态（可重试）
 *   AuthShell      认证页左右分栏外壳（品牌区 + 表单卡）
 *   PAGINATION_SX  分页选中色（撞色荧光绿 + 硬投影）
 *   CLASH_HEAD_SX  表格表头撞色底（后台用）
 */
import Button from '@mui/material/Button';
import { CLASH } from '../theme';
import { ClashStar, ClashBlob } from '../components/ClashDecor';

/**
 * 骨架屏占位卡：封面 + 文本行 + 按钮位，用于活动卡片网格。
 * @param {{count?: number}} props
 */
export function SkeletonCard({ count = 6 }) {
  return (
    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="overflow-hidden rounded-2xl border-2 border-ink bg-paper-card">
          <div className="skeleton h-40 w-full" />
          <div className="space-y-2.5 p-4">
            <div className="skeleton h-5 w-3/4 rounded" />
            <div className="skeleton h-3 w-1/2 rounded" />
            <div className="skeleton h-3 w-2/3 rounded" />
            <div className="skeleton h-10 w-full rounded-xl" />
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 列表骨架屏：用于「我的报名 / 我的活动 / 通知」等纵向列表。
 * @param {{count?: number}} props
 */
export function SkeletonList({ count = 4 }) {
  return (
    <div className="space-y-3">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="flex gap-3 rounded-2xl border-2 border-ink bg-paper-card p-3">
          <div className="skeleton h-20 w-28 flex-shrink-0 rounded-xl" />
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
 * 错误态：撞色描边卡 + 说明 + 重试按钮。
 * @param {{text?: string, onRetry?: () => void}} props
 */
export function ErrorState({ text = '加载失败，请稍后重试', onRetry }) {
  return (
    <div className="clash-card flex flex-col items-center justify-center gap-3 px-6 py-10 text-center">
      <ClashStar size={30} style={{ color: CLASH.magenta }} />
      <p className="text-sm font-semibold text-ink-soft">{text}</p>
      {onRetry && (
        <Button variant="contained" onClick={onRetry} sx={{ mt: 0.5 }}>
          重试
        </Button>
      )}
    </div>
  );
}

/**
 * 认证页外壳：左侧纯撞色品牌区 + 右侧白色表单卡；移动端品牌区压缩为横幅。
 * @param {{accent?: string, brandTitle?: string, slogan?: string, children: React.ReactNode}} props
 */
export function AuthShell({
  accent = CLASH.lime,
  brandTitle = '校园活动',
  slogan = '发现 · 报名 · 参与校园里的每一种可能',
  children,
}) {
  return (
    <div className="min-h-screen bg-paper md:flex">
      {/* 品牌区：桌面端占左半屏，移动端压缩为顶部撞色横幅 */}
      <aside
        className="relative overflow-hidden border-b-2 border-ink px-6 py-6 md:flex md:w-[46%] md:flex-col md:justify-between md:border-b-0 md:border-r-2 md:px-10 md:py-14"
        style={{ backgroundColor: accent }}
      >
        <ClashBlob color={CLASH.magenta} top={-70} right={-50} size={220} opacity={0.5} />
        <ClashBlob color={CLASH.cyan} bottom={-80} left={-60} size={200} opacity={0.5} />
        <ClashStar size={26} className="absolute right-10 top-16 animate-float" style={{ color: CLASH.ink }} />
        <ClashStar size={16} className="absolute bottom-24 right-24" style={{ color: CLASH.ink }} />
        <div className="relative">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-2xl border-2 border-ink bg-paper-card shadow-block-ink-sm">
            <ClashStar size={24} style={{ color: CLASH.royal }} />
          </div>
          <h1 className="text-2xl font-extrabold tracking-tight text-ink md:text-4xl">{brandTitle}</h1>
          <p className="mt-2 max-w-xs text-sm font-bold text-ink-soft md:text-base">{slogan}</p>
        </div>
        <p className="relative mt-6 hidden text-xs font-bold uppercase tracking-widest text-ink-soft md:block">
          Clash · Campus Events
        </p>
      </aside>

      {/* 表单区 */}
      <main className="flex flex-1 items-start justify-center px-4 py-8 md:items-center md:px-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}

/** 分页：选中项换成撞色荧光绿 + 硬投影 */
export const PAGINATION_SX = {
  '& .MuiPaginationItem-root': {
    borderRadius: 12,
    fontWeight: 700,
    color: CLASH.ink,
    minWidth: 44,
    minHeight: 44,
  },
  '& .Mui-selected': {
    backgroundColor: CLASH.lime,
    color: CLASH.ink,
    fontWeight: 800,
    boxShadow: '3px 3px 0 0 var(--ink-line)',
    '&:hover': { backgroundColor: CLASH.lime },
  },
};

/** 表格表头撞色底（后台克制风格，用薄荷绿） */
export const CLASH_HEAD_SX = {
  backgroundColor: CLASH.mint,
  fontWeight: 800,
  whiteSpace: 'nowrap',
};
