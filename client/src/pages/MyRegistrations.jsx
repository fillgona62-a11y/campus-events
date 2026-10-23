/**
 * 我的报名：即将开始 / 已结束 Tab，可查看详情或取消报名（截止前）。
 * v2：候补中展示顺位；已报名成功活动展示核销凭证提示（F4/F5）。
 */
import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Tabs from '@mui/material/Tabs';
import Tab from '@mui/material/Tab';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Chip from '@mui/material/Chip';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import dayjs from 'dayjs';
import { myRegistrations, cancelRegistration } from '../api/registrationApi';
import StatusBadge from '../components/StatusBadge';
import EmptyState from '../components/EmptyState';
import { formatTimeRange } from '../utils/format';
import { useAuthStore } from '../store/authStore';

const PAGE_SIZE = 10;

export default function MyRegistrations() {
  const navigate = useNavigate();
  const currentUser = useAuthStore((s) => s.user);
  const [tab, setTab] = useState('upcoming');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [cancelTarget, setCancelTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    myRegistrations({ tab, page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
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

  return (
    <div>
      <h1 className="mb-3 text-xl font-bold">我的报名</h1>

      <Tabs
        value={tab}
        onChange={(e, v) => { setTab(v); setPage(1); }}
        className="mb-3"
      >
        <Tab label="即将开始" value="upcoming" />
        <Tab label="已结束" value="past" />
      </Tabs>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text={tab === 'upcoming' ? '暂无即将开始的活动报名' : '暂无已结束的报名记录'} />
      ) : (
        <div className="space-y-3">
          {data.list.map((item) => {
            const cancellable =
              ['pending', 'approved', 'waitlisted'].includes(item.status) &&
              dayjs().isBefore(dayjs(item.signup_deadline));
            return (
              <div key={item.id} className="flex gap-3 rounded-xl bg-white p-3 shadow-sm">
                {item.cover_url ? (
                  <img
                    src={item.cover_url}
                    alt={item.title}
                    loading="lazy"
                    className="h-20 w-28 flex-shrink-0 rounded-lg object-cover"
                  />
                ) : (
                  <div className="flex h-20 w-28 flex-shrink-0 items-center justify-center rounded-lg bg-blue-100 text-xl font-bold text-blue-400">
                    {item.title?.slice(0, 1)}
                  </div>
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2">
                    <h3 className="truncate font-semibold">{item.title}</h3>
                    <StatusBadge type="reg" status={item.status} />
                    {item.status === 'waitlisted' && item.waitlist_position && (
                      <Chip size="small" color="info" variant="outlined" label={`第 ${item.waitlist_position} 位`} />
                    )}
                    {item.event_status === 'cancelled' && <StatusBadge type="event" status="cancelled" />}
                  </div>
                  <p className="mt-1 text-xs text-gray-500">
                    {formatTimeRange(item.start_time, item.end_time)}
                  </p>
                  <p className="text-xs text-gray-500">{item.location}</p>
                  {/* 核销凭证提示（F4）：已报名成功的活动，到场报学号核销 */}
                  {item.status === 'approved' && (
                    <p className="mt-1 text-xs text-blue-600">
                      {item.checked_in === 1
                        ? '已核销入场'
                        : `到场凭证：${item.title} · 本人学号 ${currentUser?.student_id || ''}（请报学号核销）`}
                    </p>
                  )}
                  <div className="mt-2 flex gap-2">
                    <Button size="small" variant="outlined" onClick={() => navigate(`/events/${item.event_id}`)}>
                      查看详情
                    </Button>
                    {cancellable && (
                      <Button size="small" color="error" variant="text" onClick={() => setCancelTarget(item)}>
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
          />
        </div>
      )}

      <Dialog open={Boolean(cancelTarget)} onClose={() => !submitting && setCancelTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>取消报名</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600">确定要取消报名「{cancelTarget?.title}」吗？</p>
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
