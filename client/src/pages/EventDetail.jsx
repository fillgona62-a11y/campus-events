/**
 * 活动详情页：大图 + 信息 + 报名进度 + 富文本简介 + 底部固定报名栏。
 */
import { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import Button from '@mui/material/Button';
import Chip from '@mui/material/Chip';
import LinearProgress from '@mui/material/LinearProgress';
import Dialog from '@mui/material/Dialog';
import DialogTitle from '@mui/material/DialogTitle';
import DialogContent from '@mui/material/DialogContent';
import DialogActions from '@mui/material/DialogActions';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import CircularProgress from '@mui/material/CircularProgress';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import IconButton from '@mui/material/IconButton';
import { getEvent, registerEvent } from '../api/eventApi';
import { cancelRegistration } from '../api/registrationApi';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import { formatDateTime, formatTimeRange, remainingText, isFull, isSignupClosed } from '../utils/format';

export default function EventDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { token, user } = useAuthStore();

  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState('');
  const [registerOpen, setRegisterOpen] = useState(false);
  const [cancelOpen, setCancelOpen] = useState(false);
  const [remark, setRemark] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    getEvent(id)
      .then((d) => setDetail(d))
      .catch((err) => setLoadError(err.message))
      .finally(() => setLoading(false));
  }, [id]);

  useEffect(() => {
    load();
  }, [load]);

  // 点击报名：未登录跳登录；已登录打开备注弹窗（按钮立即禁用防重复提交）
  const handleRegisterClick = () => {
    if (!token) {
      navigate('/login', { state: { from: `/events/${id}` } });
      return;
    }
    setRemark('');
    setRegisterOpen(true);
  };

  const handleRegisterConfirm = async () => {
    setSubmitting(true);
    try {
      const data = await registerEvent(id, remark || undefined);
      setRegisterOpen(false);
      if (data.waitlisted) {
        showToast(`名额已满，已加入候补第 ${data.waitlist_position} 位`);
      } else {
        showToast(data.registration.status === 'pending' ? '报名已提交，等待发布者审核' : '报名成功！');
      }
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancelConfirm = async () => {
    setSubmitting(true);
    try {
      const data = await cancelRegistration(detail.my_registration.id);
      setCancelOpen(false);
      showToast(data?.promoted ? '已取消报名，候补名单已自动递补' : '已取消报名');
      load();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-16">
        <CircularProgress />
      </div>
    );
  }
  if (loadError || !detail) {
    return (
      <div className="py-16 text-center text-gray-500">
        <p>{loadError || '活动不存在'}</p>
        <Button component={Link} to="/" sx={{ mt: 2 }}>
          返回首页
        </Button>
      </div>
    );
  }

  const { event, my_registration: myReg, waitlist_count: waitlistCount } = detail;
  const full = isFull(event);
  const closed = isSignupClosed(event);
  const isOwnerOrAdmin = user && (user.id === event.organizer_id || user.role === 'admin');
  // 候补中同样视为“已占用一个报名名额位”，可取消
  const hasActiveReg =
    myReg && ['pending', 'approved', 'waitlisted'].includes(myReg.status);
  const canCancel = hasActiveReg && !closed;
  const progress = event.capacity > 0 ? Math.min((event.approved_count / event.capacity) * 100, 100) : 0;
  // 直接报名活动满员时可加入候补；需审核活动候补不适用（审核通过时仍可能 40903）
  const canWaitlist = full && !closed && event.require_approval !== 1;

  // 底部主按钮文案与状态
  let mainButton;
  if (event.status !== 'approved') {
    // 发布者/管理员预览未发布活动时禁用报名
    mainButton = (
      <Button fullWidth variant="contained" disabled sx={{ minHeight: 44 }}>
        活动未发布，暂不可报名
      </Button>
    );
  } else if (hasActiveReg) {
    mainButton = (
      <Button
        fullWidth
        variant="outlined"
        color="error"
        disabled={!canCancel || submitting}
        onClick={() => setCancelOpen(true)}
        sx={{ minHeight: 44 }}
      >
        {myReg.status === 'pending'
          ? '待审核 · 取消报名'
          : myReg.status === 'waitlisted'
            ? `候补中 · 取消候补`
            : '已报名 · 取消报名'}
      </Button>
    );
  } else if (closed) {
    mainButton = (
      <Button fullWidth variant="contained" disabled sx={{ minHeight: 44 }}>
        报名已截止
      </Button>
    );
  } else if (canWaitlist) {
    mainButton = (
      <Button
        fullWidth
        variant="outlined"
        color="primary"
        disabled={submitting}
        onClick={handleRegisterClick}
        sx={{ minHeight: 44 }}
      >
        {token ? '加入候补' : '登录后候补'}
      </Button>
    );
  } else if (full) {
    mainButton = (
      <Button fullWidth variant="contained" disabled sx={{ minHeight: 44 }}>
        名额已满
      </Button>
    );
  } else {
    mainButton = (
      <Button
        fullWidth
        variant="contained"
        disabled={submitting}
        onClick={handleRegisterClick}
        sx={{ minHeight: 44 }}
      >
        {token
          ? myReg && (myReg.status === 'cancelled' || myReg.status === 'rejected')
            ? '重新报名'
            : '立即报名'
          : '登录后报名'}
      </Button>
    );
  }

  return (
    <div className="pb-20">
      <div className="mb-2 flex items-center gap-1">
        <IconButton onClick={() => navigate(-1)} aria-label="返回" sx={{ minWidth: 44, minHeight: 44 }}>
          <ArrowBackIcon />
        </IconButton>
        <span className="text-sm text-gray-500">活动详情</span>
      </div>

      {event.cover_url ? (
        <img
          src={event.cover_url}
          alt={event.title}
          className="h-52 w-full rounded-xl object-cover md:h-72"
        />
      ) : (
        <div className="flex h-52 w-full items-center justify-center rounded-xl bg-gradient-to-br from-blue-100 to-blue-200 text-5xl font-bold text-blue-400 md:h-72">
          {event.title?.slice(0, 1) || '活'}
        </div>
      )}

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {event.category_name && <Chip label={event.category_name} size="small" color="primary" />}
          {event.status !== 'approved' && <StatusBadge type="event" status={event.status} />}
          {event.require_approval === 1 && (
            <Chip label="报名需审核" size="small" variant="outlined" color="warning" />
          )}
        </div>
        <h1 className="text-xl font-bold">{event.title}</h1>
        <div className="mt-2 space-y-1 text-sm text-gray-600">
          <p>时间：{formatTimeRange(event.start_time, event.end_time)}</p>
          <p>地点：{event.location}</p>
          <p>报名截止：{formatDateTime(event.signup_deadline)}</p>
          <p>发布者：{event.organizer_name || '-'}</p>
        </div>

        <div className="mt-4">
          <div className="mb-1 flex justify-between text-xs text-gray-500">
            <span>报名进度</span>
            <span>{remainingText(event)}（已成功 {event.approved_count} 人）</span>
          </div>
          {event.capacity > 0 && <LinearProgress variant="determinate" value={progress} />}
          {waitlistCount > 0 && (
            <p className="mt-1 text-xs text-blue-600">当前候补 {waitlistCount} 人，有人取消时将按顺序自动递补</p>
          )}
        </div>

        {event.status === 'rejected' && event.reject_reason && isOwnerOrAdmin && (
          <p className="mt-3 rounded-lg bg-red-50 p-2 text-sm text-red-600">
            审核拒绝理由:{event.reject_reason}
          </p>
        )}
      </div>

      <div className="mt-4 rounded-xl bg-white p-4 shadow-sm">
        <h2 className="mb-2 font-semibold">活动简介</h2>
        {/* 服务端已做白名单过滤，可安全渲染 */}
        <div
          className="rich-text text-sm text-gray-700"
          dangerouslySetInnerHTML={{ __html: event.description || '暂无简介' }}
        />
      </div>

      {/* 底部固定操作栏（适配全面屏安全区） */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t bg-white p-3 md:bottom-auto md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-[1200px]">{mainButton}</div>
      </div>
      <div className="mt-4 hidden md:block">{mainButton}</div>

      {/* 报名备注弹窗 */}
      <Dialog open={registerOpen} onClose={() => !submitting && setRegisterOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>确认报名</DialogTitle>
        <DialogContent>
          <p className="mb-3 text-sm text-gray-600">
            {event.require_approval === 1
              ? '该活动报名需发布者审核，审核通过后报名生效。'
              : canWaitlist
                ? '该活动名额已满，确认后将加入候补名单；有人取消时按候补顺序自动递补。'
                : '确认后即刻报名成功。'}
          </p>
          <TextField
            fullWidth
            multiline
            rows={2}
            label="报名备注（选填）"
            value={remark}
            onChange={(e) => setRemark(e.target.value)}
            inputProps={{ maxLength: 200 }}
          />
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setRegisterOpen(false)} disabled={submitting}>
            取消
          </Button>
          <Button variant="contained" onClick={handleRegisterConfirm} disabled={submitting}>
            {submitting ? '提交中…' : '确认报名'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 取消报名确认弹窗 */}
      <Dialog open={cancelOpen} onClose={() => !submitting && setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>取消报名</DialogTitle>
        <DialogContent>
          <p className="text-sm text-gray-600">确定要取消报名「{event.title}」吗？</p>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCancelOpen(false)} disabled={submitting}>
            再想想
          </Button>
          <Button color="error" variant="contained" onClick={handleCancelConfirm} disabled={submitting}>
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
