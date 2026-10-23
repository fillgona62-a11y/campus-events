/**
 * 管理后台 - 活动审核：待审核队列，通过 / 拒绝（必填理由），可查看详情。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { listEvents, reviewEvent } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { formatTimeRange, formatDateTime } from '../../utils/format';

const PAGE_SIZE = 10;

export default function EventReview() {
  const [data, setData] = useState({ list: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [detailTarget, setDetailTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    listEvents({ status: 'pending', page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleApprove = async (event) => {
    setSubmitting(true);
    try {
      await reviewEvent(event.id, 'approve');
      showToast(`已通过「${event.title}」`);
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleReject = async () => {
    if (!rejectReason.trim()) {
      showToast('请填写拒绝理由', 'error');
      return;
    }
    setSubmitting(true);
    try {
      await reviewEvent(rejectTarget.id, 'reject', rejectReason.trim());
      setRejectTarget(null);
      setRejectReason('');
      showToast('已拒绝该活动');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">活动审核</h1>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无待审核活动" />
      ) : (
        <div className="space-y-3">
          {data.list.map((event) => (
            <div key={event.id} className="rounded-xl bg-white p-4 shadow-sm">
              <h3 className="font-semibold">{event.title}</h3>
              <p className="mt-1 text-xs text-gray-500">
                发布者：{event.organizer_name} · 分类:{event.category_name || '-'}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                时间：{formatTimeRange(event.start_time, event.end_time)} · 地点：{event.location}
              </p>
              <p className="mt-1 text-xs text-gray-500">
                报名截止：{formatDateTime(event.signup_deadline)} · 名额：
                {event.capacity === 0 ? '不限' : event.capacity} ·
                {event.require_approval === 1 ? ' 报名需审核' : ' 报名免审核'}
              </p>
              <div className="mt-3 flex flex-wrap gap-2">
                <Button size="small" variant="text" onClick={() => setDetailTarget(event)}>
                  查看简介
                </Button>
                <Button
                  size="small"
                  variant="contained"
                  color="success"
                  disabled={submitting}
                  onClick={() => handleApprove(event)}
                >
                  通过
                </Button>
                <Button
                  size="small"
                  variant="outlined"
                  color="error"
                  disabled={submitting}
                  onClick={() => { setRejectTarget(event); setRejectReason(''); }}
                >
                  拒绝
                </Button>
              </div>
            </div>
          ))}
        </div>
      )}

      {data.total > PAGE_SIZE && (
        <div className="mt-4 flex justify-center">
          <Pagination
            count={Math.ceil(data.total / PAGE_SIZE)}
            page={page}
            onChange={(e, p) => setPage(p)}
            color="primary"
          />
        </div>
      )}

      {/* 活动简介查看 */}
      <Dialog open={Boolean(detailTarget)} onClose={() => setDetailTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailTarget?.title}</DialogTitle>
        <DialogContent>
          {detailTarget?.cover_url && (
            <img src={detailTarget.cover_url} alt="封面" className="mb-3 max-h-48 rounded-lg object-cover" />
          )}
          <div
            className="rich-text text-sm text-gray-700"
            dangerouslySetInnerHTML={{ __html: detailTarget?.description || '暂无简介' }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailTarget(null)}>关闭</Button>
        </DialogActions>
      </Dialog>

      {/* 拒绝理由 */}
      <Dialog open={Boolean(rejectTarget)} onClose={() => !submitting && setRejectTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>拒绝「{rejectTarget?.title}」</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            required
            multiline
            rows={3}
            label="拒绝理由"
            value={rejectReason}
            onChange={(e) => setRejectReason(e.target.value)}
            inputProps={{ maxLength: 200 }}
            sx={{ mt: 1 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRejectTarget(null)} disabled={submitting}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={handleReject} disabled={submitting}>
            {submitting ? '提交中…' : '确认拒绝'}
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
