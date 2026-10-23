/**
 * 纯 SVG 折线图组件（F8，零依赖）：折线 + 坐标轴 + 数据点 + 空态占位。
 * 管理员数据概览（全站趋势）与组织者报名名单页（单活动趋势）复用同一组件。
 *
 * @param {{days: Array<{date:string, count:number}>, title?: string}} props
 */
export default function TrendChart({ days = [], title = '报名趋势' }) {
  // 空数据态：占位提示而非空白/报错
  if (!days.length || days.every((d) => d.count === 0)) {
    return (
      <div className="rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">{title}</h2>
        <div className="flex h-40 items-center justify-center text-sm text-gray-400">
          暂无报名数据
        </div>
      </div>
    );
  }

  const W = 640;
  const H = 220;
  const PAD = { top: 16, right: 16, bottom: 28, left: 36 };
  const innerW = W - PAD.left - PAD.right;
  const innerH = H - PAD.top - PAD.bottom;

  const maxCount = Math.max(...days.map((d) => d.count), 1);
  // Y 轴取一个略高于最大值的整数刻度
  const yMax = maxCount <= 4 ? 4 : Math.ceil(maxCount / 2) * 2;

  const x = (i) => PAD.left + (days.length === 1 ? innerW / 2 : (i / (days.length - 1)) * innerW);
  const y = (v) => PAD.top + innerH - (v / yMax) * innerH;

  const points = days.map((d, i) => `${x(i)},${y(d.count)}`).join(' ');
  // X 轴标签最多显示 6 个，避免重叠
  const labelStep = Math.max(1, Math.ceil(days.length / 6));
  const xLabels = days
    .map((d, i) => ({ i, label: d.date.slice(5) })) // MM-DD
    .filter(({ i }) => i % labelStep === 0 || i === days.length - 1);

  return (
    <div className="rounded-xl bg-white p-4 shadow-sm">
      <h2 className="mb-2 font-semibold">{title}</h2>
      <svg viewBox={`0 0 ${W} ${H}`} className="w-full" role="img" aria-label={title}>
        {/* 横向网格线（4 等分） */}
        {[0, 0.25, 0.5, 0.75, 1].map((r) => (
          <g key={r}>
            <line
              x1={PAD.left}
              x2={W - PAD.right}
              y1={y(yMax * r)}
              y2={y(yMax * r)}
              stroke="#e5e7eb"
              strokeWidth="1"
            />
            <text x={PAD.left - 6} y={y(yMax * r) + 4} textAnchor="end" fontSize="10" fill="#9ca3af">
              {Math.round(yMax * r)}
            </text>
          </g>
        ))}
        {/* 折线 */}
        <polyline
          points={points}
          fill="none"
          stroke="#1976d2"
          strokeWidth="2"
          strokeLinejoin="round"
          strokeLinecap="round"
        />
        {/* 数据点 */}
        {days.map((d, i) => (
          <circle key={d.date} cx={x(i)} cy={y(d.count)} r="2.5" fill="#1976d2" />
        ))}
        {/* X 轴 */}
        <line
          x1={PAD.left}
          x2={W - PAD.right}
          y1={H - PAD.bottom}
          y2={H - PAD.bottom}
          stroke="#d1d5db"
          strokeWidth="1"
        />
        {xLabels.map(({ i, label }) => (
          <text
            key={`${label}-${i}`}
            x={x(i)}
            y={H - PAD.bottom + 16}
            textAnchor="middle"
            fontSize="10"
            fill="#9ca3af"
          >
            {label}
          </text>
        ))}
      </svg>
      <p className="mt-1 text-xs text-gray-400">
        近 {days.length} 天每日有效报名数（报名成功/待审核/候补中，按北京时间归日期）
      </p>
    </div>
  );
}
