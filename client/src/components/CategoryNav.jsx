/**
 * CategoryNav.jsx — 分类导航条（撞色风格）
 *
 * 视觉要点：
 *   1. 横向滚动的撞色标签条，滚动条隐藏（.scrollbar-none）
 *   2. 每个分类按 CATEGORY_COLORS 色轮循环上色，与 EventCard 封面同色规则
 *      （用分类 id 取色，因此同一分类在列表页与详情页颜色一致）
 *   3. 选中项 = 该分类色实心 + 2px 墨边 + 硬边投影；未选中 = 白底 + 墨边
 *   4. 触摸目标 ≥ 44px，选中项在视觉上「压」下去一格，明确当前位置
 *
 * @param {{categories: Array<{id:number,name:string}>, value:number, onChange:Function}} props
 */
import { CLASH, CATEGORY_COLORS } from '../theme';
import { clashColorAt } from './ClashDecor';
import { readableText } from '../utils/clash';

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
        // 「全部」用墨色作为中性色，其余分类按色轮循环取色
        const color = cat.id === 0 ? CLASH.ink : clashColorAt(cat.id, CATEGORY_COLORS);
        const fg = readableText(color);

        return (
          <button
            key={cat.id}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange && onChange(cat.id)}
            className={[
              'inline-flex min-h-[44px] shrink-0 items-center gap-1.5 rounded-full border-2 border-ink px-4',
              'text-sm font-bold transition-all duration-200 ease-clash',
              active
                ? 'shadow-block-ink hover:-translate-y-0.5 hover:shadow-block-ink-lg active:translate-x-[2px] active:translate-y-[2px] active:shadow-block-ink-sm'
                : 'bg-white text-ink hover:-translate-y-0.5 hover:bg-paper hover:shadow-block-ink-sm active:translate-x-[2px] active:translate-y-[2px] active:shadow-none',
            ].join(' ')}
            style={active ? { backgroundColor: color, color: fg } : undefined}
          >
            {cat.name}
          </button>
        );
      })}
    </div>
  );
}
