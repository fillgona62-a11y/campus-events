/**
 * CategoryNav.jsx — 分类导航条（清爽风格）
 *
 * 视觉：细描边胶囊，选中态用主题色柔和填充，无硬边/硬投影。
 */
import { CATEGORY_COLORS } from '../theme';
import { clashColorAt } from './ClashDecor';

export default function CategoryNav({ categories = [], value = 0, onChange }) {
  const items = [{ id: 0, name: '全部' }, ...categories];

  return (
    <div
      className="scrollbar-none flex gap-2 overflow-x-auto py-2"
      role="tablist"
      aria-label="活动分类筛选"
    >
      {items.map((cat) => {
        const active = value === cat.id;
        const color = cat.id === 0 ? '#9c6b3f' : clashColorAt(cat.id, CATEGORY_COLORS);

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(cat.id)}
            className="inline-flex min-h-[38px] shrink-0 items-center rounded-full border px-4 text-sm font-medium transition-colors duration-150"
            style={
              active
                ? { backgroundColor: color, borderColor: color, color: '#fff' }
                : { backgroundColor: 'var(--paper-card)', borderColor: 'rgba(var(--ink-rgb), 0.16)', color: 'var(--ink-soft)' }
            }
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
