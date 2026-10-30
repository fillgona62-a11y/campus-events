/**
 * 我的报名：即将开始 / 已结束 Tab，可查看详情或取消报名（截止前）。
 * 候补中展示顺位；已报名成功活动展示核销凭证提示。
 *
 * 视觉：列表项撞色卡片化（左色块封面 + 状态徽标），三态齐全。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import dayjs from 'dayjs';
import { myRegistrations, cancelRegistration } from '../api/registrationApi';
import { selfCheckin, getCurrentPosition } from '../api/eventApi';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { ClashStar, clashColorAt } from '../components/ClashDecor';
import { CLASH, CATEGORY_COLORS } from '../theme';
import { readableText } from '../utils/clash';
import { formatTimeRange } from '../utils/format';
import { PAGINATION_SX, SkeletonList, ErrorState } from './clashUi';

const PAGE_SIZE = 10;

export default function MyRegistrations() {
  const navigate = useNavigate();
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [checkingInId, setCheckingInId] = useState(null);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    myRegistrations({ tab, page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '报名记录加载失败');
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [tab, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      const data = await cancelRegistration(cancelTarget.id);
      setCancelTarget(null);
      showToast(data?.promoted ? '已取消报名，候补名单已自动递补' : '已取消报名');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // 学生自助定位签到：获取当前位置 → 提交签到
  const handleSelfCheckin = async (item) => {
    setCheckingInId(item.id);
    try {
      const pos = await getCurrentPosition();
      const d = await selfCheckin(item.event_id, pos);
      showToast(`签到成功！距活动地点约 ${d.distance_m} 米`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setCheckingInId(null);
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center gap-2">
        <ClashStar size={20} style={{ color: CLASH.magenta }} />
        <h1 className="text-xl font-extrabold tracking-tight text-ink">我的报名</h1>
      </div>

      <Tabs
        value={tab}
        onChange={(e, v) => { setTab(v); setPage(1); }}
        className="mb-3"
      >
        <Tab label="即将开始" value="upcoming" />
        <Tab label="已结束" value="past" />
      </Tabs>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text={tab === 'upcoming' ? '暂无即将开始的活动报名' : '暂无已结束的报名记录'}>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <Button variant="contained" component={Link} to="/">
              去逛活动
            </Button>
            <Button variant="outlined" component={Link} to="/calendar">
              查看日历
            </Button>
          </div>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {data.list.map((item) => {
            const cancellable =
              ['pending', 'approved', 'waitlisted'].includes(item.status) &&
              dayjs().isBefore(dayjs(item.signup_deadline));
            // 无封面占位：与 EventCard 封面同色规则，纯撞色块 + 大字
            const coverColor = clashColorAt(item.category_id, CATEGORY_COLORS);
            const coverText = readableText(coverColor);
            return (
              <div key={item.id} className="clash-card flex gap-3 p-3">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    loading="lazy"
                    className="h-20 w-28 flex-shrink-0 rounded-xl border-2 border-ink object-cover"
                  />
                ) : (
                  <div
                    className="flex h-20 w-28 flex-shrink-0 items-center justify-center rounded-xl border-2 border-ink text-2xl font-extrabold"
                    style={{ backgroundColor: coverColor, color: coverText }}
                  >
                    {item.title?.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-bold text-ink">{item.title}</h3>
                    <StatusBadge type="reg" status={item.status} />
                    {item.status === 'waitlisted' && item.waitlist_position && (
                      <Chip
                        size="small"
                        variant="outlined"
                        label={`候补第 ${item.waitlist_position} 位`}
                        sx={{ borderColor: CLASH.ink, backgroundColor: CLASH.lemon, color: CLASH.ink, fontWeight: 800, borderWidth: 2 }}
                      />
                    )}
                    {item.event_status === 'cancelled' && <StatusBadge type="event" status="cancelled" />}
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink-mute">
                    {formatTimeRange(item.start_time, item.end_time)}
                  </p>
                  <p className="text-xs font-semibold text-ink-mute">{item.location}</p>
                  {/* 定位签到：已报名成功，活动进行中可定位签到 */}
                  {item.status === 'approved' && (
                    item.checked_in === 1 ? (
                      <p className="mt-1 rounded-lg border-2 border-ink bg-clash-cyan px-2 py-1 text-xs font-bold text-ink on-clash">
                        已签到 ✓
                      </p>
                    ) : (
                      <button
                        onClick={() => handleSelfCheckin(item)}
                        disabled={checkingInId === item.id}
                        className="mt-1 w-full rounded-lg border-2 border-ink bg-clash-cyan px-2 py-1 text-left text-xs font-bold text-ink transition-transform on-clash hover:-translate-y-0.5 disabled:cursor-not-allowed disabled:opacity-60"
                      >
                        {checkingInId === item.id ? '定位签到中…' : '📍 定位签到'}
                      </button>
                    )
                  )}
                  <div className="mt-2 flex flex-wrap gap-2">
                    <Button size="small" variant="outlined" onClick={() => navigate(`/events/${item.event_id}`)}>
                      查看详情
                    </Button>
                    {cancellable && (
                      <Button size="small" color="error" variant="contained" onClick={() => setCancelTarget(item)}>
                        {item.status === 'waitlisted' ? '取消候补' : '取消报名'}
                      </Button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {data.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <Pagination
            count={Math.ceil(data.total / PAGE_SIZE)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
            sx={PAGINATION_SX}
          />
        </div>
      )}

      {/* 取消报名：退路为中性描边，危险操作为警示色实心 */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => !submitting && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>取消报名</DialogTitle>
        <DialogContent>
          <p className="text-sm text-ink-soft">确定要取消报名「{cancelTarget?.title}」吗？</p>
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setCancelTarget(null)} disabled={submitting}>
            再想想
          </Button>
          <Button color="error" variant="contained" onClick={handleCancel} disabled={submitting}>
            {submitting ? '处理中…' : '确认取消'}
          </Button>
        </DialogActions>
      </Dialog>

      <Snackbar
        open={toast.open}
        autoHideDuration={3000}
        onClose={() => setToast((t) => ({ ...t, open: false }))}
        anchorOrigin={{ vertical: 'top', horizontal: 'center' }}
      >
        <Alert severity={toast.severity} variant="filled">
          {toast.message}
        </Alert>
      </Snackbar>
    </div>
  );
}
