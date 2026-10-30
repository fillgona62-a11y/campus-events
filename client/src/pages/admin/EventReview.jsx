/**
 * 管理后台 - 活动审核：待审核队列，通过 / 拒绝（必填理由），可查看详情。
 *
 * 视觉：后台克制风格 —— 撞色描边卡片，状态徽标清晰，操作用撞色主色 + 警示色区分。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { listEvents, reviewEvent } from '../../api/adminApi';
import EmptyState from '../../components/EmptyState';
import { ClashStar } from '../../components/ClashDecor';
import { CLASH } from '../../theme';
import { formatTimeRange, formatDateTime } from '../../utils/format';
import { PAGINATION_SX, SkeletonList, ErrorState } from '../clashUi';

const PAGE_SIZE = 10;

export default function EventReview() {
  const [data, setData] = useState({ list: [], total: 0 });
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailTarget, setDetailTarget] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listEvents({ status: 'pending', page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '待审核列表加载失败');
        showToast(err.message, 'error');
      })
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
      <div className="mb-4 flex items-center gap-2">
        <ClashStar size={20} style={{ color: CLASH.lemon }} />
        <h1 className="text-xl font-semibold tracking-tight text-ink">活动审核</h1>
      </div>

      {loading ? (
        <SkeletonList count={3} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无待审核活动" />
      ) : (
        <div className="space-y-3">
          {data.list.map((event) => (
            <div key={event.id} className="clash-card p-4">
              <h3 className="font-bold text-ink">{event.title}</h3>
              <p className="mt-1 text-xs font-semibold text-ink-mute">
                发布者：{event.organizer_name} · 分类：{event.category_name || '-'}
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-mute">
                时间：{formatTimeRange(event.start_time, event.end_time)} · 地点：{event.location}
              </p>
              <p className="mt-1 text-xs font-semibold text-ink-mute">
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
            sx={PAGINATION_SX}
          />
        </div>
      )}

      {/* 活动简介查看 */}
      <Dialog open={Boolean(detailTarget)} onClose={() => setDetailTarget(null)} maxWidth="sm" fullWidth>
        <DialogTitle>{detailTarget?.title}</DialogTitle>
        <DialogContent>
          {detailTarget?.cover_url && (
            <img src={detailTarget.cover_url} alt="封面" className="mb-3 max-h-48 rounded-xl border border-ink/10 object-cover" />
          )}
          <div
            className="rich-text text-sm text-ink-soft"
            dangerouslySetInnerHTML={{ __html: detailTarget?.description || '暂无简介' }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setDetailTarget(null)}>
            关闭
          </Button>
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
          <Button variant="outlined" onClick={() => setRejectTarget(null)} disabled={submitting}>
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
