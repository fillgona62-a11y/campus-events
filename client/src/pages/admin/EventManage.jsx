/**
 * 管理后台 - 全站活动管理：状态筛选 + 关键字搜索 + 下架操作。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import MenuItem from '@mui/material/MenuItem';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import Table from '@mui/material/Table';
import TableBody from '@mui/material/TableBody';
import TableCell from '@mui/material/TableCell';
import TableContainer from '@mui/material/TableContainer';
import TableHead from '@mui/material/TableHead';
import TableRow from '@mui/material/TableRow';
import { listEvents, offlineEvent } from '../../api/adminApi';
import StatusBadge from '../../components/StatusBadge';
import EmptyState from '../../components/EmptyState';
import { formatDateTime } from '../../utils/format';
import { EVENT_STATUS_MAP } from '../../utils/constants';

const PAGE_SIZE = 10;

export default function EventManage() {
  const [status, setStatus] = useState('');
  const [keyword, setKeyword] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0 });
  const [loading, setLoading] = useState(true);
  const [offlineTarget, setOfflineTarget] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    listEvents({ status: status || undefined, keyword: keyword || undefined, page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [status, keyword, page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleOffline = async () => {
    setSubmitting(true);
    try {
      await offlineEvent(offlineTarget.id);
      setOfflineTarget(null);
      showToast('活动已下架');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">活动管理</h1>

      <div className="mb-3 flex flex-wrap gap-2">
        <TextField
          select
          size="small"
          label="状态"
          value={status}
          onChange={(e) => { setStatus(e.target.value); setPage(1); }}
          sx={{ minWidth: 130 }}
        >
          <MenuItem value="">全部状态</MenuItem>
          {Object.entries(EVENT_STATUS_MAP).map(([value, conf]) => (
            <MenuItem key={value} value={value}>
              {conf.label}
            </MenuItem>
          ))}
        </TextField>
        <TextField
          size="small"
          label="搜索标题/发布者"
          value={searchInput}
          onChange={(e) => setSearchInput(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter') { setKeyword(searchInput.trim()); setPage(1); }
          }}
        />
        <Button variant="outlined" onClick={() => { setKeyword(searchInput.trim()); setPage(1); }}>
          搜索
        </Button>
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="没有符合条件的活动" />
      ) : (
        <TableContainer className="overflow-x-auto rounded-xl bg-white shadow-sm">
          <Table size="small" sx={{ minWidth: 760 }}>
            <TableHead>
              <TableRow>
                <TableCell>标题</TableCell>
                <TableCell>发布者</TableCell>
                <TableCell>开始时间</TableCell>
                <TableCell>报名</TableCell>
                <TableCell>状态</TableCell>
                <TableCell align="right">操作</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {data.list.map((event) => (
                <TableRow key={event.id} hover>
                  <TableCell>{event.title}</TableCell>
                  <TableCell>{event.organizer_name}</TableCell>
                  <TableCell>{formatDateTime(event.start_time)}</TableCell>
                  <TableCell>
                    {event.approved_count}/{event.capacity === 0 ? '不限' : event.capacity}
                  </TableCell>
                  <TableCell>
                    <StatusBadge type="event" status={event.status} />
                  </TableCell>
                  <TableCell align="right">
                    {event.status === 'approved' && (
                      <Button size="small" color="error" onClick={() => setOfflineTarget(event)}>
                        下架
                      </Button>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </TableContainer>
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

      <Dialog open={Boolean(offlineTarget)} onClose={() => !submitting && setOfflineTarget(null)} maxWidth="xs" fullWidth>
        <DialogTitle>下架活动</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600">
            确定要下架「{offlineTarget?.title}」吗？下架后活动对公众不可见，发布者将收到通知。
          </p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setOfflineTarget(null)} disabled={submitting}>
            取消
          </Button>
          <Button color="error" variant="contained" onClick={handleOffline} disabled={submitting}>
            {submitting ? '处理中…' : '确认下架'}
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
