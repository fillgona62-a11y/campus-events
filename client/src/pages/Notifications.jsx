/**
 * 站内信列表：未读高亮，点击标记已读，支持全部已读。
 *
 * 视觉：撞色卡片 + 未读撞色圆点。
 */
import { useCallback, useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import Pagination from '@mui/material/Pagination';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import { listNotifications, markRead, markAllRead } from '../api/notificationApi';
import EmptyState from '../components/EmptyState';
import { ClashStar } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatDateTime } from '../utils/format';
import { PAGINATION_SX, SkeletonList, ErrorState } from './clashUi';

const PAGE_SIZE = 10;

export default function Notifications() {
  const [page, setPage] = useState(1);
  const [data, setData] = useState({ list: [], total: 0, unread_count: 0 });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setError('');
    listNotifications({ page, page_size: PAGE_SIZE })
      .then((d) => setData(d))
      .catch((err) => {
        setError(err.message || '通知加载失败');
        showToast(err.message, 'error');
      })
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
      <div className="mb-3 flex items-center justify-between gap-2">
        <div className="flex items-center gap-2">
          <ClashStar size={20} style={{ color: CLASH.magenta }} />
          <h1 className="text-xl font-extrabold tracking-tight text-ink">站内通知</h1>
          {data.unread_count > 0 && (
            <span className="rounded-md border-2 border-ink bg-clash-magenta px-2 py-0.5 text-xs font-extrabold text-ink">
              {data.unread_count} 条未读
            </span>
          )}
        </div>
        {data.unread_count > 0 && (
          <Button size="small" variant="outlined" onClick={handleReadAll}>
            全部已读
          </Button>
        )}
      </div>

      {loading ? (
        <SkeletonList count={4} />
      ) : error && data.list.length === 0 ? (
        <ErrorState text={error} onRetry={load} />
      ) : data.list.length === 0 ? (
        <EmptyState text="暂无通知">
          <Button variant="outlined" onClick={load} sx={{ mt: 2 }}>
            刷新看看
          </Button>
        </EmptyState>
      ) : (
        <div className="space-y-2">
          {data.list.map((item) => (
            <div
              key={item.id}
              onClick={() => handleRead(item)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => e.key === 'Enter' && handleRead(item)}
              className={`clash-card cursor-pointer p-4 ${
                item.is_read ? 'bg-white' : 'bg-clash-lemon'
              }`}
            >
              <div className="flex items-center gap-2">
                {/* 未读：撞色圆点 */}
                {!item.is_read && (
                  <span
                    className="h-2.5 w-2.5 flex-shrink-0 rounded-full border border-ink"
                    style={{ backgroundColor: CLASH.magenta }}
                    aria-label="未读"
                  />
                )}
                <h3 className={`text-sm ${item.is_read ? 'font-bold text-ink-soft' : 'font-extrabold text-ink'}`}>
                  {item.title}
                </h3>
              </div>
              <p className="mt-1 text-sm text-ink-soft">{item.content}</p>
              <p className="mt-1 text-xs font-semibold text-ink-faint">{formatDateTime(item.created_at)}</p>
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
