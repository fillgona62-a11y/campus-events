/**
 * 站内信列表：未读高亮，点击标记已读，支持全部已读。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import CircularProgress from '@mui/material/CircularProgress';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { listNotifications, markRead, markAllRead } from '../api/notificationApi';
import EmptyState from '../components/EmptyState';
import { formatDateTime } from '../utils/format';

const PAGE_SIZE = 10;

export default function Notifications() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0, unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    listNotifications({ page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => showToast(err.message, 'error'))
      .finally(() => setLoading(false));
  }, [page]);

  useEffect(() => {
    load();
  }, [load]);

  const handleRead = async (item) => {
    if (item.is_read) return;
    try {
      await markRead(item.id);
      setData((d) => ({
        ...d,
        unread_count: Math.max(d.unread_count - 1, 0),
        list: d.list.map((n) => (n.id === item.id ? { ...n, is_read: 1 } : n)),
      }));
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const handleReadAll = async () => {
    try {
      await markAllRead();
      showToast('已全部标记为已读');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h1 className="text-xl font-bold">站内通知</h1>
        {data.unread_count > 0 && (
          <Button size="small" onClick={handleReadAll}>
            全部已读
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-16">
          <CircularProgress />
        </div>
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无通知" />
      ) : (
        <div className="space-y-2">
          {data.list.map((item) => (
            <div
              key={item.id}
              onClick={() => handleRead(item)}
              className={`cursor-pointer rounded-xl p-4 shadow-sm transition-colors ${
                item.is_read ? 'bg-white' : 'bg-blue-50'
              }`}
            >
              <div className="flex items-center gap-2">
                {!item.is_read && <span className="h-2 w-2 rounded-full bg-red-500" />}
                <h3 className={`text-sm ${item.is_read ? 'text-gray-700' : 'font-semibold'}`}>
                  {item.title}
                </h3>
              </div>
              <p className="mt-1 text-sm text-gray-600">{item.content}</p>
              <p className="mt-1 text-xs text-gray-400">{formatDateTime(item.created_at)}</p>
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
