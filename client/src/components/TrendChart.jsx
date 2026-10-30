/**
 * TrendChart.jsx — 报名趋势图（纯 SVG + 撞色多序列）
 *
 * 视觉要点：
 *   1. 撞色多序列配色：每条序列按八色轮取一种颜色，折线 3px、数据点描白边
 *   2. 淡墨虚线网格 + Y 轴刻度，容器是 2px 墨边 + 硬投影的撞色卡
 *   3. 悬停 / 方向键显示 tooltip：标注该日各序列数值，并高亮当前数据点
 *   4. 空数据不是灰字，而是带四角星装饰的引导空态
 *
 * 兼容说明：
 *   · 原有 props `days`（单序列 [{date,count}]）保持不变，调用方无需修改
 *   · 新增可选 props `series`（多序列 [{name, data}]），用于需要对比多条曲线时
 *
 * @param {{days?: Array<{date:string,count:number}>, title?: string, series?: Array<{name:string,data:Array<{date:string,count:number}>}>}} props
 */
import { useState } from 'react';
import { CLASH, CATEGORY_COLORS } from '../theme';
import { clashColorAt, ClashStar } from './ClashDecor';

export default function TrendChart({ days = [], title = '报名趋势', series = null }) {
  // hoverIndex：鼠标悬停点；focusIndex：键盘方向键选中点。focus 优先，避免鼠标移出时键盘态被清掉
  const [hoverIndex, setHoverIndex] = useState(-1);
  const [focusIndex, setFocusIndex] = useState(-1);

  // ── 组装序列：优先使用多序列 series，否则把 days 当作单序列 ──────────
  const list = series && series.length ? series : [{ name: '报名数', data: days }];

  // X 轴以最长序列的日期为准（多序列按日期对齐）
  const dates = list
    .reduce((acc, s) => (s.data.length > acc.length ? s.data : acc), list[0]?.data || [])
    .map((d) => d.date);
  const countOf = (s, date) => s.data.find((d) => d.date === date)?.count ?? 0;
  const allCounts = list.flatMap((s) => s.data.map((d) => d.count || 0));
  const total = allCounts.reduce((a, b) => a + b, 0);

  // ── 空数据态：撞色空态卡 + 引导文案 ─────────────────────────────
  if (!dates.length || total === 0) {
    return (
      <div className="rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-sm">
        <h2 className="mb-4 text-base font-semibold text-ink">{title}</h2>
        <div className="flex flex-col items-center justify-center gap-3 py-8 text-center">
          <span className="flex h-16 w-16 -rotate-6 items-center justify-center rounded-2xl border border-ink/10 bg-clash-lime shadow-sm">
            <ClashStar size={30} style={{ color: CLASH.ink }} />
          </span>
          <p className="text-sm font-bold text-ink">暂无报名数据</p>
          <p className="max-w-xs text-xs leading-relaxed text-ink-mute">
            活动发布并有人报名后，这里会显示每日报名趋势曲线
          </p>
        </div>
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...allCounts, 1);
  // Y 轴取一个略高于最大值的整数刻度
  const yMax = maxCount <= 4 ? 4 : Math.ceil(maxCount / 2) * 2;

  const x = (i) => PAD.left + (dates.length === 1 ? innerW / 2 : (i / (dates.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - (v / yMax) * innerH;

  // X 轴标签最多显示 6 个，避免重叠
  const labelStep = Math.max(1, Math.ceil(dates.length / 6));
  const xLabels = dates
    .map((date, i) => ({ i, label: date.slice(5) })) // MM-DD
    .filter(({ i }) => i % labelStep === 0 || i === dates.length - 1);

  const activeIndex = focusIndex >= 0 ? focusIndex : hoverIndex;
  const hoverDate = activeIndex >= 0 ? dates[activeIndex] : null;
  const hoverMax = hoverDate ? Math.max(...list.map((s) => countOf(s, hoverDate))) : 0;

  // 键盘导航：左右方向键在数据点之间移动，Home/End 跳到首尾
  const move = (delta) => {
    setFocusIndex((prev) => {
      const base = prev < 0 ? 0 : prev;
      return Math.min(dates.length - 1, Math.max(0, base + delta));
    });
  };

  return (
    <div className="rounded-2xl border border-ink/10 bg-paper-card p-5 shadow-sm">
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <h2 className="text-base font-semibold text-ink">{title}</h2>
        {/* 多序列图例 */}
        {list.length > 1 && (
          <div className="flex flex-wrap items-center gap-3">
            {list.map((s, i) => (
              <span key={s.name || i} className="flex items-center gap-1.5 text-xs font-semibold text-ink-soft">
                <span
                  className="inline-block h-3 w-3 rounded-sm border border-ink/10"
                  style={{ backgroundColor: clashColorAt(i, CATEGORY_COLORS) }}
                />
                {s.name}
              </span>
            ))}
          </div>
        )}
      </div>

      <div
        className="relative rounded-xl"
        tabIndex={0}
        role="group"
        aria-label={`${title}，使用左右方向键查看每日数据`}
        onMouseLeave={() => setHoverIndex(-1)}
        onFocus={() => setFocusIndex((p) => (p < 0 ? 0 : p))}
        onBlur={() => setFocusIndex(-1)}
        onKeyDown={(e) => {
          if (e.key === 'ArrowLeft') {
            e.preventDefault();
            move(-1);
          } else if (e.key === 'ArrowRight') {
            e.preventDefault();
            move(1);
          } else if (e.key === 'Home') {
            e.preventDefault();
            setFocusIndex(0);
          } else if (e.key === 'End') {
            e.preventDefault();
            setFocusIndex(dates.length - 1);
          }
        }}
      >
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
          {/* 横向网格线（4 等分） */}
          {[0, 0.25, 0.5, 0.75, 1].map((r) => (
            <g key={r}>
              <line
                x1={PAD.left}
                x2={W - PAD.right}
                y1={y(yMax * r)}
                y2={y(yMax * r)}
                stroke="rgba(var(--ink-rgb),0.18)"
                strokeWidth="1"
                strokeDasharray="4 4"
              />
              <text x={PAD.left - 6} y={y(yMax * r) + 4} textAnchor="end" fontSize="10" fill="#6B6B7B">
                {Math.round(yMax * r)}
              </text>
            </g>
          ))}

          {/* 折线（每个序列一条，撞色轮转） */}
          {list.map((s, si) => {
            const color = clashColorAt(si, CATEGORY_COLORS);
            const points = dates.map((date, i) => `${x(i)},${y(countOf(s, date))}`).join(' ');
            return (
              <polyline
                key={s.name || si}
                points={points}
                fill="none"
                stroke={color}
                strokeWidth="3"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
            );
          })}

          {/* 数据点：白描边保证在任何撞色底上都清晰 */}
          {list.map((s, si) => {
            const color = clashColorAt(si, CATEGORY_COLORS);
            return dates.map((date, i) => {
              const active = i === activeIndex;
              return (
                <circle
                  key={`${s.name || si}-${date}`}
                  cx={x(i)}
                  cy={y(countOf(s, date))}
                  r={active ? 6 : 4}
                  fill={color}
                  stroke="#FFFFFF"
                  strokeWidth="2"
                />
              );
            });
          })}

          {/* X 轴 */}
          <line
            x1={PAD.left}
            x2={W - PAD.right}
            y1={H - PAD.bottom}
            y2={H - PAD.bottom}
            stroke="var(--ink-line)"
            strokeWidth="1.5"
          />
          {xLabels.map(({ i, label }) => (
            <text
              key={`${label}-${i}`}
              x={x(i)}
              y={H - PAD.bottom + 16}
              textAnchor="middle"
              fontSize="10"
              fill="#6B6B7B"
              fontWeight={i === activeIndex ? 800 : 500}
            >
              {label}
            </text>
          ))}

          {/* 悬停命中区：每个日期一条透明竖带 */}
          {dates.map((date, i) => {
            const bandW = dates.length === 1 ? innerW : innerW / (dates.length - 1);
            return (
              <rect
                key={`hit-${date}`}
                x={x(i) - bandW / 2}
                y={PAD.top}
                width={bandW}
                height={innerH}
                fill="transparent"
                onMouseEnter={() => setHoverIndex(i)}
              />
            );
          })}
        </svg>

        {/* Tooltip：跟随当前悬停 / 键盘选中的日期 */}
        {hoverDate && (
          <div
            className="pointer-events-none absolute z-10 -translate-x-1/2 rounded-xl border border-ink/10 bg-paper-card px-3 py-2 shadow-sm"
            style={{
              // 左右夹紧，避免首尾数据点的 tooltip 溢出图表容器
              left: `${Math.min(88, Math.max(12, (x(activeIndex) / W) * 100))}%`,
              top: `${(y(hoverMax) / H) * 100}%`,
              marginTop: '10px',
            }}
          >
            <p className="mb-1 text-[11px] font-semibold text-ink">{hoverDate}</p>
            {list.map((s, i) => (
              <p key={s.name || i} className="flex items-center gap-1.5 text-[11px] font-semibold text-ink-soft">
                <span
                  className="inline-block h-2 w-2 rounded-sm border border-ink"
                  style={{ backgroundColor: clashColorAt(i, CATEGORY_COLORS) }}
                />
                {s.name}：{countOf(s, hoverDate)}
              </p>
            ))}
          </div>
        )}
      </div>

      <p className="mt-2 text-xs text-ink-mute">
        近 {dates.length} 天每日有效报名数（报名成功/待审核/候补中，按北京时间归日期）· 聚焦图表后可用左右方向键查看
      </p>
    </div>
  );
}
