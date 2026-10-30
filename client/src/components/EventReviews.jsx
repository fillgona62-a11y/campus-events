/**
 * EventReviews.jsx — 活动评价区块
 * 活动结束后：报名成功用户可打分（1~5 星）+ 留言；所有人可见评价列表与平均分。
 */
import { useEffect, useState } from 'react';
import Rating from '@mui/material/Rating';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import Avatar from '@mui/material/Avatar';
import { listReviews, myReview, submitReview } from '../api/eventApi';
import { useAuthStore } from '../store/authStore';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';
import { formatDateTime } from '../utils/format';

export default function EventReviews({ event }) {
  const token = useAuthStore((s) => s.token);
  const [summary, setSummary] = useState({ count: 0, avg: 0 });
  const [list, setList] = useState([]);
  const [mine, setMine] = useState(null);
  const [open, setOpen] = useState(false);
  const [rating, setRating] = useState(5);
  const [content, setContent] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const ended = new Date(event.end_time) < new Date();

  const load = () => {
    listReviews(event.id).then((d) => {
      setSummary(d.summary);
      setList(d.list);
    });
    if (token) {
      myReview(event.id)
        .then((d) => setMine(d.review))
        .catch(() => {});
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [event.id, token]);

  const handleSubmit = async () => {
    setSubmitting(true);
    try {
      await submitReview(event.id, { rating, content: content || undefined });
      setOpen(false);
      setContent('');
      load();
    } catch (err) {
      alert(err.message || '提交失败');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="clash-card mt-4 p-4">
      <div className="mb-2 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.magenta }} />
          <h2 className="text-base font-extrabold text-ink">活动评价</h2>
        </div>
        {summary.count > 0 && (
          <div className="flex items-center gap-1.5">
            <Rating value={summary.avg} precision={0.1} readOnly size="small" />
            <span className="text-sm font-extrabold text-ink">{summary.avg}</span>
            <span className="text-xs text-ink-mute">（{summary.count} 条）</span>
          </div>
        )}
      </div>
      <ClashStripe className="mb-3" />

      {!ended ? (
        <p className="text-sm text-ink-mute">活动结束后开放评价，敬请期待。</p>
      ) : token && !mine ? (
        <Button
          variant="contained"
          size="small"
          onClick={() => setOpen(true)}
          sx={{ backgroundColor: CLASH.royal }}
        >
          我要评价
        </Button>
      ) : null}

      {list.length === 0 ? (
        <p className="text-sm text-ink-mute">暂无评价，来抢沙发吧～</p>
      ) : (
        <div className="mt-2 space-y-3">
          {list.map((r) => (
            <div key={r.id} className="flex gap-3">
              <Avatar sx={{ width: 36, height: 36, bgcolor: CLASH.cyan, color: CLASH.ink, fontWeight: 800 }}>
                {r.user_name?.slice(0, 1)}
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <span className="text-sm font-bold text-ink">{r.user_name}</span>
                  <Rating value={r.rating} readOnly size="small" />
                </div>
                {r.content && <p className="mt-1 text-sm text-ink-soft">{r.content}</p>}
                <p className="mt-0.5 text-[11px] text-ink-mute">{formatDateTime(r.created_at)}</p>
              </div>
            </div>
          ))}
        </div>
      )}

      <Dialog open={open} onClose={() => !submitting && setOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>评价活动「{event.title}」</DialogTitle>
        <DialogContent>
          <div className="mb-3 flex items-center gap-2">
            <span className="text-sm font-bold text-ink-soft">评分</span>
            <Rating
              value={rating}
              onChange={(e, v) => setRating(v || 5)}
              size="large"
            />
          </div>
          <TextField
            fullWidth
            multiline
            rows={3}
            label="说说你的感受（选填）"
            value={content}
            onChange={(e) => setContent(e.target.value)}
            inputProps={{ maxLength: 500 }}
          />
        </DialogContent>
        <DialogActions>
          <Button variant="outlined" onClick={() => setOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="contained" onClick={handleSubmit} disabled={submitting}>
            {submitting ? '提交中…' : '提交评价'}
          </Button>
        </DialogActions>
      </Dialog>
    </div>
  );
}
