/**
 * 活动日历（F7）：月网格 + 每日活动色点（按分类着色）+ 选中日列表 + 上下月切换。
 * 日期计算只用 dayjs，不引任何日历库；移动优先（360px 不溢出）。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { listEvents } from '../api/eventApi';
import EmptyState from '../components/EmptyState';
import { formatTimeRange } from '../utils/format';

/** 分类色板（循环取色，仅用于日历色点区分） */
const CATEGORY_COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#9c27b0', '#0288d1', '#d32f2f'];

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

  // 拉取整月活动：start_from=月初 00:00，start_to=月末 23:59（ISO 时间）
  const load = useCallback(() => {
    setLoading(true);
    listEvents({
      start_from: month.startOf('month').toISOString(),
      start_to: month.endOf('month').toISOString(),
      page: 1,
      page_size: 50,
    })
      .then((d) => setEvents(d.list || []))
      .catch(() => setEvents([]))
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
      <div className="mb-3 flex items-center justify-between">
        <IconButton onClick={() => setMonth(month.subtract(1, 'month'))} aria-label="上个月" sx={{ minWidth: 44, minHeight: 44 }}>
          <ChevronLeftIcon />
        </IconButton>
        <span className="text-lg font-bold">{month.format('YYYY 年 M 月')}</span>
        <IconButton onClick={() => setMonth(month.add(1, 'month'))} aria-label="下个月" sx={{ minWidth: 44, minHeight: 44 }}>
          <ChevronRightIcon />
        </IconButton>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : (
        <>
          {/* 月网格 */}
          <div className="grid grid-cols-7 gap-1 rounded-xl bg-white p-2 shadow-sm">
            {WEEK_LABELS.map((w) => (
              <div key={w} className="py-1 text-center text-xs text-gray-400">
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
                  className={`flex min-h-[52px] flex-col items-center rounded-lg py-1 text-xs ${
                    inMonth ? 'text-gray-700' : 'text-gray-300'
                  } ${isSelected ? 'bg-blue-50 ring-1 ring-primary' : ''} ${isToday ? 'font-bold text-primary' : ''}`}
                >
                  <span>{day.date()}</span>
                  <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <i
                        key={e.id}
                        className="block h-1.5 w-1.5 rounded-full"
                        style={{ backgroundColor: colorOf(e.category_id) }}
                      />
                    ))}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 选中日活动列表 */}
          <h2 className="mb-2 mt-4 font-semibold">{selected} 的活动</h2>
          {selectedEvents.length === 0 ? (
            <EmptyState text="当天暂无活动" />
          ) : (
            <div className="space-y-2">
              {selectedEvents.map((e) => (
                <div
                  key={e.id}
                  className="flex items-center gap-3 rounded-xl bg-white p-3 shadow-sm"
                  onClick={() => navigate(`/events/${e.id}`)}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(ev) => ev.key === 'Enter' && navigate(`/events/${e.id}`)}
                >
                  <i
                    className="block h-8 w-1.5 flex-shrink-0 rounded-full"
                    style={{ backgroundColor: colorOf(e.category_id) }}
                  />
                  <div className="min-w-0 flex-1">
                    <h3 className="truncate font-semibold">{e.title}</h3>
                    <p className="mt-0.5 text-xs text-gray-500">{formatTimeRange(e.start_time, e.end_time)}</p>
                    <p className="text-xs text-gray-500">{e.location}</p>
                  </div>
                  {e.category_name && <Chip size="small" color="primary" variant="outlined" label={e.category_name} />}
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
