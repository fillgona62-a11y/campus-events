/**
 * 活动日历（F7）：月网格 + 每日活动色点（按分类着色）+ 选中日列表 + 上下月切换。
 * 日期计算只用 dayjs，不引任何日历库；移动优先（360px 不溢出）。
 *
 * 视觉：日期格用撞色圆点标记有活动的日子，选中日撞色高亮 + 硬投影，
 * 左右切换按钮有按压反馈。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Chip from '@mui/material/Chip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { listEvents } from '../api/eventApi';
import EmptyState from '../components/EmptyState';
import { ClashStar } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatTimeRange } from '../utils/format';
import { ErrorState } from './clashUi';

/** 分类色板（撞色八色循环，用于日历色点区分） */
const CATEGORY_COLORS = [
  CLASH.lime,
  CLASH.magenta,
  CLASH.violet,
  CLASH.cyan,
  CLASH.lemon,
  CLASH.mint,
  CLASH.haze,
  CLASH.royal,
];

const WEEK_LABELS = ['日', '一', '二', '三', '四', '五', '六'];

/** 构造当月网格（含前后月补位），返回 6×7 数组 */
function buildMonthGrid(month) {
  const first = month.startOf('month');
  const startWeekday = first.day(); // 0=周日
  const gridStart = first.subtract(startWeekday, 'day');
  const cells = [];
  for (let i = 0; i < 42; i++) {
    cells.push(gridStart.add(i, 'day'));
  }
  return cells;
}

export default function Calendar() {
  const navigate = useNavigate();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 拉取整月活动：start_from=月初 00:00，start_to=月末 23:59（ISO 时间）
  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listEvents({
      start_from: month.startOf('month').toISOString(),
      start_to: month.endOf('month').toISOString(),
      page: 1,
      page_size: 50,
    })
      .then((d) => setEvents(d.list || []))
      .catch((err) => setError(err.message || '日历加载失败'))
      .finally(() => setLoading(false));
  }, [month]);

  useEffect(() => {
    load();
  }, [load]);

  // 日期 → 当日活动列表
  const eventsByDate = {};
  for (const e of events) {
    const key = dayjs(e.start_time).format('YYYY-MM-DD');
    if (!eventsByDate[key]) eventsByDate[key] = [];
    eventsByDate[key].push(e);
  }

  // 分类 id → 颜色（稳定映射）
  const colorOf = (categoryId) => CATEGORY_COLORS[(Number(categoryId) || 1) % CATEGORY_COLORS.length];

  const cells = buildMonthGrid(month);
  const selectedEvents = eventsByDate[selected] || [];

  return (
    <div>
      {/* 月份切换：撞色标题 + 带按压反馈的切换按钮 */}
      <div className="clash-card mb-3 flex items-center justify-between p-2">
        <IconButton
          onClick={() => setMonth(month.subtract(1, 'month'))}
          aria-label="上个月"
          sx={{
            minWidth: 44,
            minHeight: 44,
            border: '2px solid var(--ink-line)',
            borderRadius: 12,
            boxShadow: '3px 3px 0 0 var(--ink-line)',
            backgroundColor: CLASH.lime,
            '&:hover': { backgroundColor: CLASH.lime, transform: 'translate(-1px,-1px)', boxShadow: '4px 4px 0 0 var(--ink-line)' },
            '&:active': { transform: 'translate(2px,2px)', boxShadow: '1px 1px 0 0 var(--ink-line)' },
          }}
        >
          <ChevronLeftIcon />
        </IconButton>
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.magenta }} />
          <span className="text-lg font-extrabold tracking-tight text-ink">
            {month.format('YYYY 年 M 月')}
          </span>
        </div>
        <IconButton
          onClick={() => setMonth(month.add(1, 'month'))}
          aria-label="下个月"
          sx={{
            minWidth: 44,
            minHeight: 44,
            border: '2px solid var(--ink-line)',
            borderRadius: 12,
            boxShadow: '3px 3px 0 0 var(--ink-line)',
            backgroundColor: CLASH.cyan,
            '&:hover': { backgroundColor: CLASH.cyan, transform: 'translate(-1px,-1px)', boxShadow: '4px 4px 0 0 var(--ink-line)' },
            '&:active': { transform: 'translate(2px,2px)', boxShadow: '1px 1px 0 0 var(--ink-line)' },
          }}
        >
          <ChevronRightIcon />
        </IconButton>
      </div>

      {loading ? (
        <div className="skeleton h-72 w-full rounded-2xl" />
      ) : error ? (
        <ErrorState text={error} onRetry={load} />
      ) : (
        <>
          {/* 月网格 */}
          <div className="clash-card grid grid-cols-7 gap-1 p-2">
            {WEEK_LABELS.map((w) => (
              <div key={w} className="py-1 text-center text-xs font-bold text-ink-mute">
                {w}
              </div>
            ))}
            {cells.map((day) => {
              const key = day.format('YYYY-MM-DD');
              const dayEvents = eventsByDate[key] || [];
              const inMonth = day.month() === month.month();
              const isToday = key === dayjs().format('YYYY-MM-DD');
              const isSelected = key === selected;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${key}${dayEvents.length ? `，${dayEvents.length} 个活动` : ''}`}
                  aria-pressed={isSelected}
                  className={`flex min-h-[52px] flex-col items-center rounded-xl border-2 py-1 text-xs transition-transform active:translate-y-[2px] ${
                    isSelected
                      ? 'border-ink bg-clash-lime font-extrabold shadow-block-ink-sm on-clash'
                      : 'border-transparent hover:border-ink/30'
                  } ${inMonth ? 'text-ink' : 'text-ink-faint'}`}
                >
                  <span className={isToday ? 'font-extrabold text-clash-royal underline decoration-2' : ''}>
                    {day.date()}
                  </span>
                  <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <i
                        key={e.id}
                        className="block h-1.5 w-1.5 rounded-full ring-1 ring-ink/40"
                        style={{ backgroundColor: colorOf(e.category_id) }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 选中日活动列表 */}
          <h2 className="mb-2 mt-4 flex items-center gap-2 text-base font-extrabold text-ink">
            <ClashStar size={16} style={{ color: CLASH.violet }} />
            {selected} 的活动
            <span className="rounded-md border-2 border-ink bg-clash-cyan px-2 py-0.5 text-xs font-extrabold text-ink on-clash">
              {selectedEvents.length}
            </span>
          </h2>
          {selectedEvents.length === 0 ? (
            <EmptyState text="当天暂无活动">
              <Button variant="outlined" onClick={() => navigate('/')} sx={{ mt: 2 }}>
                去首页逛逛
              </Button>
            </EmptyState>
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className="clash-card flex cursor-pointer items-center gap-3 p-3"
                  onClick={() => navigate(`/events/${e.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/events/${e.id}`)}
                >
                  <i
                    className="block h-10 w-1.5 flex-shrink-0 rounded-full border-2 border-ink"
                    style={{ backgroundColor: colorOf(e.category_id) }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-bold text-ink">{e.title}</h3>
                    <p className="mt-0.5 text-xs font-semibold text-ink-mute">
                      {formatTimeRange(e.start_time, e.end_time)}
                    </p>
                    <p className="text-xs font-semibold text-ink-mute">{e.location}</p>
                  </div>
                  {e.category_name && (
                    <Chip
                      size="small"
                      variant="outlined"
                      label={e.category_name}
                      sx={{ borderColor: CLASH.ink, backgroundColor: CLASH.mint, color: CLASH.ink, fontWeight: 800, borderWidth: 2 }}
                    />
                  )}
                </div>
              ))}
            </div>
          )}

          <div className="mt-4 flex justify-center">
            <Button variant="text" onClick={() => navigate('/')}>
              回首页
            </Button>
          </div>
        </>
      )}
    </div>
  );
}
