/**
 * 我发布的活动：审核状态、报名人数、编辑/取消/名单管理入口。
 */
import { useCallback, useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
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
import { formatTimeRange } from '../utils/format';

const PAGE_SIZE = 10;

export default function MyEvents() {
  const navigate = useNavigate();
  const [data, setData] = useState({ list: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    myEvents({ page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
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
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-xl font-bold">我发布的活动</h1>
        <Button variant="contained" component={Link} to="/publish">
          发布活动
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="您还没有发布活动">
          <Button component={Link} to="/publish" variant="contained" sx={{ mt: 2 }}>
            立即发布
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-3">
          {data.list.map((event) => {
            const started = dayjs().isAfter(dayjs(event.start_time));
            const editable = !started && ['pending', 'approved', 'rejected'].includes(event.status);
            const cancellable = ['pending', 'approved'].includes(event.status);
            return (
              <div key={event.id} className="rounded-xl bg-white p-4 shadow-sm">
                <div className="flex flex-wrap items-center gap-2">
                  <StatusBadge type="event" status={event.status} />
                  <h3 className="font-semibold">{event.title}</h3>
                </div>
                <p className="mt-1 text-xs text-gray-500">{formatTimeRange(event.start_time, event.end_time)}</p>
                <p className="mt-1 text-xs text-gray-500">
                  报名：{event.approved_count}/{event.capacity === 0 ? '不限' : event.capacity}
                  {event.pending_registrations > 0 && (
                    <span className="ml-2 text-orange-500">
                      {event.pending_registrations} 条待审核报名
                    </span>
                  )}
                </p>
                {event.status === 'rejected' && event.reject_reason && (
                  <p className="mt-2 rounded-lg bg-red-50 p-2 text-xs text-red-600">
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
                    <Button size="small" color="error" variant="text" onClick={() => setCancelTarget(event)}>
                      取消活动
                    </Button>
                  )}
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
          />
        </div>
      )}

      <Dialog open={Boolean(cancelTarget)} onClose={() => !submitting && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>取消活动</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600">
            确定要取消活动「{cancelTarget?.title}」吗？报名成功的用户将收到取消通知。
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelTarget(null)} disabled={submitting}>
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
