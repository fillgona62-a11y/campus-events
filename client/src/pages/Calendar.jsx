/**
 * 活动日历：月网格 + 每日活动色点（按分类着色）+ 选中日列表 + 上下月切换。
 * 日期计算只用 dayjs，不引任何日历库；移动优先（360px 不溢出）。
 *
 * 增强：
 *   - 节日/休标注：周末与法定节假日标「休」（红字），节日显示名称（见 utils/holidays）。
 *   - 每日备注：登录用户可给任意一天添加/编辑/删除备忘（一日一条），有备注的日子显示品红点。
 *
 * 视觉：日期格用撞色圆点标记有活动的日子，选中日撞色高亮 + 硬投影，
 * 左右切换按钮有按压反馈。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import IconButton from '@mui/material/IconButton';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import ChevronRightIcon from '@mui/icons-material/ChevronRight';
import dayjs from 'dayjs';
import { listEvents } from '../api/eventApi';
import { getNotes, saveNote, deleteNote } from '../api/calendarApi';
import { useAuthStore } from '../store/authStore';
import EmptyState from '../components/EmptyState';
import { ClashStar } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatTimeRange } from '../utils/format';
import { getFestival, isRestDay } from '../utils/holidays';
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

/** 休息日/节日标红（贴近实体日历习惯） */
const REST_RED = '#E5384E';

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
  const { token } = useAuthStore();
  const [month, setMonth] = useState(() => dayjs().startOf('month'));
  const [events, setEvents] = useState([]);
  const [selected, setSelected] = useState(() => dayjs().format('YYYY-MM-DD'));
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // 每日备注：date(YYYY-MM-DD) -> { id, date, content, updated_at }
  const [notes, setNotes] = useState({});
  const [noteOpen, setNoteOpen] = useState(false);
  const [noteText, setNoteText] = useState('');
  const [noteSaving, setNoteSaving] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });
  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

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

  // 拉取当月备注（仅登录）
  useEffect(() => {
    if (!token) {
      setNotes({});
      return undefined;
    }
    let alive = true;
    getNotes(month.format('YYYY-MM'))
      .then((d) => {
        if (!alive) return;
        const map = {};
        (d.notes || []).forEach((n) => {
          map[n.date] = n;
        });
        setNotes(map);
      })
      .catch(() => {});
    return () => {
      alive = false;
    };
  }, [month, token]);

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
  const selectedNote = notes[selected];

  const openNote = () => {
    if (!token) {
      showToast('请先登录后再添加备注', 'info');
      return;
    }
    setNoteText(selectedNote ? selectedNote.content : '');
    setNoteOpen(true);
  };

  const handleSaveNote = () => {
    const content = noteText.trim();
    if (!content) {
      showToast('备注内容不能为空', 'error');
      return;
    }
    setNoteSaving(true);
    saveNote(selected, content)
      .then((d) => {
        const note = d.note;
        setNotes((m) => ({ ...m, [note.date]: note }));
        setNoteOpen(false);
        showToast('备注已保存');
      })
      .catch((err) => showToast(err.message || '保存失败', 'error'))
      .finally(() => setNoteSaving(false));
  };

  const handleDeleteNote = () => {
    if (!selectedNote) return;
    setNoteSaving(true);
    deleteNote(selectedNote.id)
      .then(() => {
        setNotes((m) => {
          const next = { ...m };
          delete next[selected];
          return next;
        });
        setNoteOpen(false);
        showToast('备注已删除');
      })
      .catch((err) => showToast(err.message || '删除失败', 'error'))
      .finally(() => setNoteSaving(false));
  };

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
          <span className="text-lg font-semibold tracking-tight text-ink">
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
              const festival = getFestival(day);
              const rest = isRestDay(day);
              const note = notes[key];
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => setSelected(key)}
                  aria-label={`${key}${festival ? `，${festival.name}` : ''}${rest ? '，休' : ''}${dayEvents.length ? `，${dayEvents.length} 个活动` : ''}${note ? '，有备注' : ''}`}
                  aria-pressed={isSelected}
                  className={`flex min-h-[56px] flex-col items-center rounded-xl border-2 py-1 text-xs transition-transform active:translate-y-[2px] ${
                    isSelected
                      ? 'border-ink bg-clash-lime font-semibold shadow-sm on-clash'
                      : 'border-transparent hover:border-ink/30'
                  } ${inMonth ? 'text-ink' : 'text-ink-faint'}`}
                >
                  <span
                    className={isToday ? 'font-semibold underline decoration-2' : ''}
                    style={rest && inMonth && !isSelected ? { color: REST_RED } : isToday ? { color: CLASH.royal } : undefined}
                  >
                    {day.date()}
                  </span>
                  {/* 节日名称（红字）或周末「休」 */}
                  {(festival || (rest && inMonth)) && (
                    <span
                      className="text-[10px] font-bold leading-tight"
                      style={festival ? { color: REST_RED } : { color: 'var(--ink-mute)' }}
                    >
                      {festival ? festival.name : '休'}
                    </span>
                  )}
                  <span className="mt-0.5 flex flex-wrap justify-center gap-0.5">
                    {dayEvents.slice(0, 3).map((e) => (
                      <i
                        key={e.id}
                        className="block h-1.5 w-1.5 rounded-full ring-1 ring-ink/40"
                        style={{ backgroundColor: colorOf(e.category_id) }}
                      />
                    ))}
                    {note && (
                      <i
                        className="block h-1.5 w-1.5 rounded-full ring-1 ring-ink/40"
                        style={{ backgroundColor: CLASH.magenta }}
                        title="有备注"
                      />
                    )}
                  </span>
                </button>
              );
            })}
          </div>

          {/* 选中日活动列表 */}
          <h2 className="mb-2 mt-4 flex items-center gap-2 text-base font-semibold text-ink">
            <ClashStar size={16} style={{ color: CLASH.violet }} />
            {selected} 的活动
            <span className="rounded-md border border-ink/10 bg-clash-cyan px-2 py-0.5 text-xs font-semibold text-ink on-clash">
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
                    className="block h-10 w-1.5 flex-shrink-0 rounded-full border border-ink/10"
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
                    <span className="rounded-md border border-ink/10 bg-clash-mint px-2 py-0.5 text-[11px] font-semibold text-ink on-clash">
                      {e.category_name}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}

          {/* 我的备注（登录后可添加/编辑/删除） */}
          <div className="mt-4">
            <h2 className="mb-2 flex items-center gap-2 text-base font-semibold text-ink">
              <ClashStar size={16} style={{ color: CLASH.magenta }} />
              我的备注
              {selectedNote && (
                <span className="rounded-md border border-ink/10 bg-clash-magenta px-2 py-0.5 text-xs font-semibold text-ink on-clash">
                  已记
                </span>
              )}
            </h2>
            {!token ? (
              <p className="text-sm text-ink-mute">登录后即可给每一天添加备注（比如“这天要交作业”）。</p>
            ) : selectedNote ? (
              <div className="clash-card p-3">
                <p className="whitespace-pre-wrap break-words text-sm text-ink">{selectedNote.content}</p>
                <div className="mt-2 flex justify-end">
                  <Button size="small" variant="outlined" onClick={openNote}>
                    编辑备注
                  </Button>
                </div>
              </div>
            ) : (
              <Button variant="outlined" onClick={openNote}>
                ＋ 添加备注
              </Button>
            )}
          </div>

          <div className="mt-4 flex justify-center">
            <Button variant="text" onClick={() => navigate('/')}>
              回首页
            </Button>
          </div>
        </>
      )}

      {/* 备注编辑弹窗：新建 / 编辑 / 删除 一体 */}
      <Dialog
        open={noteOpen}
        onClose={() => !noteSaving && setNoteOpen(false)}
        maxWidth="xs"
        fullWidth
      >
        <DialogTitle>{selected} 备注</DialogTitle>
        <DialogContent>
          <TextField
            autoFocus
            multiline
            minRows={3}
            maxRows={8}
            fullWidth
            label="这天要做什么？"
            placeholder="例如：下午三点交高数作业 / 社团例会…"
            value={noteText}
            onChange={(e) => setNoteText(e.target.value)}
            inputProps={{ maxLength: 500 }}
            sx={{ mt: 1 }}
          />
          <p className="mt-1 text-right text-xs text-ink-mute">{noteText.length}/500</p>
        </DialogContent>
        <DialogActions>
          {selectedNote && (
            <Button color="error" onClick={handleDeleteNote} disabled={noteSaving}>
              删除
            </Button>
          )}
          <div className="flex-1" />
          <Button variant="outlined" onClick={() => setNoteOpen(false)} disabled={noteSaving}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSaveNote} disabled={noteSaving}>
            {noteSaving ? '保存中…' : '保存'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert
          severity={toast.severity}
          variant="filled"
          onClose={() => setToast((t) => ({ ...t, open: false }))}
        >
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
