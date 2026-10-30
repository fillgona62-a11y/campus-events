/**
 * 我发布的活动：审核状态、报名人数、编辑/取消/名单管理入口。
 *
 * 视觉：撞色卡片列表（左侧色条 + 状态徽标），三态齐全。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import dayjs from 'dayjs';
import { myEvents, cancelEvent } from '../api/eventApi';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { ClashStar } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatTimeRange } from '../utils/format';
import { PAGINATION_SX, SkeletonList, ErrorState } from './clashUi';

const PAGE_SIZE = 10;

/** 左侧色条撞色轮 */
const CLASH_COLORS = [
  CLASH.lime,
  CLASH.magenta,
  CLASH.violet,
  CLASH.cyan,
  CLASH.lemon,
  CLASH.mint,
  CLASH.haze,
  CLASH.royal,
];

export default function MyEvents() {
  const navigate = useNavigate();
  const [data, setData] = useState({ list: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    myEvents({ page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '活动列表加载失败');
        showToast(err.message, 'error');
      })
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleCancel = async () => {
    setSubmitting(true);
    try {
      await cancelEvent(cancelTarget.id);
      setCancelTarget(null);
      showToast('活动已取消，已通知报名成功的用户');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <div className="mb-4 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClashStar size={20} style={{ color: CLASH.violet }} />
          <h1 className="text-xl font-semibold tracking-tight text-ink">我发布的活动</h1>
        </div>
        <Button variant="contained" component={Link} to="/publish">
          发布活动
        </Button>
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="您还没有发布活动">
          <Button component={Link} to="/publish" variant="contained" sx={{ mt: 2 }}>
            立即发布
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {data.list.map((event, idx) => {
            const started = dayjs().isAfter(dayjs(event.start_time));
            const editable = !started && ['pending', 'approved', 'rejected'].includes(event.status);
            const cancellable = ['pending', 'approved'].includes(event.status);
            const stripe = CLASH_COLORS[idx % CLASH_COLORS.length];
            return (
              <div key={event.id} className="clash-card flex gap-3 p-4">
                {/* 左侧撞色条：状态一眼可辨 */}
                <span
                  className="w-1.5 flex-shrink-0 rounded-full border border-ink/10"
                  style={{ backgroundColor: stripe }}
                  aria-hidden="true"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge type="event" status={event.status} />
                    <h3 className="font-bold text-ink">{event.title}</h3>
                  </div>
                  <p className="mt-1 text-xs font-semibold text-ink-mute">
                    {formatTimeRange(event.start_time, event.end_time)}
                  </p>
                  <p className="mt-1 text-xs font-semibold text-ink-mute">
                    报名：{event.approved_count}/{event.capacity === 0 ? '不限' : event.capacity}
                    {event.pending_registrations > 0 && (
                      <span className="ml-2 rounded-md border border-ink/10 bg-clash-lemon px-1.5 py-0.5 font-bold text-ink on-clash">
                        {event.pending_registrations} 条待审核报名
                      </span>
                    )}
                  </p>
                  {event.status === 'rejected' && event.reject_reason && (
                    <p className="mt-2 rounded-xl border border-ink/10 bg-clash-magenta px-3 py-2 text-xs font-bold text-ink on-clash">
                      拒绝理由：{event.reject_reason}
                    </p>
                  )}
                  <div className="mt-3 flex flex-wrap gap-2">
                    <Button
                      size="small"
                      variant="outlined"
                      onClick={() => navigate(`/my/events/${event.id}/registrations`)}
                    >
                      报名名单
                    </Button>
                    {editable && (
                      <Button size="small" variant="outlined" onClick={() => navigate(`/events/${event.id}/edit`)}>
                        编辑
                      </Button>
                    )}
                    <Button size="small" variant="text" onClick={() => navigate(`/events/${event.id}`)}>
                      预览
                    </Button>
                    {cancellable && (
                      <Button size="small" color="error" variant="contained" onClick={() => setCancelTarget(event)}>
                        取消活动
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
        <div className="mt-6 flex justify-center">
          <Pagination
            count={Math.ceil(data.total / PAGE_SIZE)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
            sx={PAGINATION_SX}
          />
        </div>
      )}

      {/* 取消活动：危险操作确认 */}
      <Dialog open={Boolean(cancelTarget)} onClose={() => !submitting && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>取消活动</DialogTitle>
        <DialogContent>
          <p className="text-sm text-ink-soft">
            确定要取消活动「{cancelTarget?.title}」吗？报名成功的用户将收到取消通知。
          </p>
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
