/**
 * 活动详情页：撞色封面 + 撞色信息卡 + 报名进度 + 富文本简介 + 底部固定报名栏。
 *
 * 视觉要点：
 *   1. 无封面时用「纯撞色块 + 大字」占位，不用渐变
 *   2. 关键信息（时间 / 地点）用小图标 + 色块标签，信息层级一眼可辨
 *   3. 报名进度百分比加粗放大
 *   4. 底部 CTA 文案按状态区分，危险操作（取消报名）用警示色
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
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import ShareIcon from '@mui/icons-material/Share';
import PlaceIcon from '@mui/icons-material/Place';
import ScheduleIcon from '@mui/icons-material/Schedule';
import PersonIcon from '@mui/icons-material/Person';
import EventBusyIcon from '@mui/icons-material/EventBusy';
import IconButton from '@mui/material/IconButton';
import { getEvent, registerEvent } from '../api/eventApi';
import { cancelRegistration } from '../api/registrationApi';
import { useAuthStore } from '../store/authStore';
import StatusBadge from '../components/StatusBadge';
import ShareDialog from '../components/ShareDialog';
import { ClashStar, ClashStripe, clashColorAt } from '../components/ClashDecor';
import { CLASH, CATEGORY_COLORS } from '../theme';
import { readableText } from '../utils/clash';
import { formatDateTime, formatTimeRange, remainingText, isFull, isSignupClosed } from '../utils/format';

/** 加载态骨架屏：封面 + 信息卡 */
function DetailSkeleton() {
  return (
    <div className="space-y-4">
      <div className="skeleton h-52 w-full rounded-2xl md:h-72" />
      <div className="space-y-3 rounded-2xl border-2 border-ink bg-paper-card p-4">
        <div className="skeleton h-6 w-3/4 rounded" />
        <div className="skeleton h-4 w-1/2 rounded" />
        <div className="skeleton h-4 w-2/3 rounded" />
        <div className="skeleton h-10 w-full rounded-xl" />
      </div>
    </div>
  );
}

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
  const [shareOpen, setShareOpen] = useState(false);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const load = useCallback(() => {
    setLoading(true);
    setLoadError('');
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
    return <DetailSkeleton />;
  }
  if (loadError || !detail) {
    return (
      <div className="clash-card flex flex-col items-center justify-center gap-3 px-6 py-14 text-center">
        <ClashStar size={30} style={{ color: CLASH.magenta }} />
        <p className="text-sm font-semibold text-ink-soft">{loadError || '活动不存在'}</p>
        <Button variant="contained" component={Link} to="/" sx={{ mt: 0.5 }}>
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
            ? '候补中 · 取消候补'
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
        variant="contained"
        disabled={submitting}
        onClick={handleRegisterClick}
        sx={{ minHeight: 44, backgroundColor: CLASH.violet, '&:hover': { backgroundColor: '#7227C7' } }}
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

  // 无封面占位：与 EventCard 封面同色规则（分类 id 在撞色色轮上的位置），纯色块 + 大字
  const coverColor = clashColorAt(event.category_id, CATEGORY_COLORS);
  const coverText = readableText(coverColor);

  return (
    <div className="pb-20">
      <div className="mb-2 flex items-center gap-1">
        <IconButton onClick={() => navigate(-1)} aria-label="返回" sx={{ minWidth: 44, minHeight: 44 }}>
          <ArrowBackIcon />
        </IconButton>
        <span className="flex-1 text-sm text-ink-mute">活动详情</span>
        <IconButton onClick={() => setShareOpen(true)} aria-label="分享" sx={{ minWidth: 44, minHeight: 44 }}>
          <ShareIcon />
        </IconButton>
      </div>

      {event.cover_url ? (
        <img
          src={event.cover_url}
          alt={event.title}
          className="h-52 w-full rounded-2xl border-2 border-ink object-cover md:h-72"
        />
      ) : (
        // 纯撞色块 + 大字占位（不用渐变）
        <div
          className="flex h-52 w-full items-center justify-center rounded-2xl border-2 border-ink md:h-72"
          style={{ backgroundColor: coverColor }}
        >
          <span className="text-6xl font-extrabold md:text-7xl" style={{ color: coverText }}>
            {event.title?.slice(0, 1) || '活'}
          </span>
        </div>
      )}

      {/* ── 信息卡：撞色卡片 + 关键信息色块标签 ─────────────────── */}
      <div className="clash-card mt-4 p-4">
        <div className="mb-2 flex flex-wrap items-center gap-2">
          {event.category_name && (
            <Chip
              label={event.category_name}
              size="small"
              sx={{ borderColor: CLASH.ink, backgroundColor: CLASH.cyan, color: CLASH.ink, fontWeight: 800, borderWidth: 2 }}
            />
          )}
          {event.status !== 'approved' && <StatusBadge type="event" status={event.status} />}
          {event.require_approval === 1 && (
            <Chip label="报名需审核" size="small" variant="outlined" color="warning" />
          )}
        </div>

        <h1 className="text-xl font-extrabold tracking-tight text-ink">{event.title}</h1>

        {/* 关键信息：色块标签 + 图标 */}
        <div className="mt-3 grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-clash-lemon px-3 py-2 on-clash">
            <ScheduleIcon sx={{ fontSize: 20 }} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">活动时间</p>
              <p className="truncate text-sm font-bold text-ink">
                {formatTimeRange(event.start_time, event.end_time)}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-clash-mint px-3 py-2 on-clash">
            <PlaceIcon sx={{ fontSize: 20 }} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">活动地点</p>
              <p className="truncate text-sm font-bold text-ink">{event.location}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-clash-haze px-3 py-2 on-clash">
            <EventBusyIcon sx={{ fontSize: 20 }} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">报名截止</p>
              <p className="truncate text-sm font-bold text-ink">{formatDateTime(event.signup_deadline)}</p>
            </div>
          </div>
          <div className="flex items-center gap-2 rounded-xl border-2 border-ink bg-clash-cyan px-3 py-2 on-clash">
            <PersonIcon sx={{ fontSize: 20 }} />
            <div className="min-w-0">
              <p className="text-[11px] font-bold uppercase tracking-wide text-ink-soft">发布者</p>
              <p className="truncate text-sm font-bold text-ink">{event.organizer_name || '-'}</p>
            </div>
          </div>
        </div>

        {/* 报名进度：百分比加粗放大 */}
        <div className="mt-4">
          <div className="mb-1.5 flex items-baseline justify-between">
            <span className="text-xs font-bold text-ink-mute">报名进度</span>
            <span className="text-lg font-extrabold text-ink">
              {Math.round(progress)}
              <span className="text-xs font-bold text-ink-mute">%</span>
              <span className="ml-2 text-xs font-bold text-ink-mute">{remainingText(event)}</span>
            </span>
          </div>
          {event.capacity > 0 && <LinearProgress variant="determinate" value={progress} />}
          {waitlistCount > 0 && (
            <p className="mt-1.5 text-xs font-bold text-clash-violet">
              当前候补 {waitlistCount} 人，有人取消时将按顺序自动递补
            </p>
          )}
        </div>

        {event.status === 'rejected' && event.reject_reason && isOwnerOrAdmin && (
          <p className="mt-3 rounded-xl border-2 border-ink bg-clash-magenta px-3 py-2 text-sm font-bold text-ink on-clash">
            审核拒绝理由：{event.reject_reason}
          </p>
        )}
      </div>

      {/* ── 简介卡 ─────────────────────────────────────────────── */}
      <div className="clash-card mt-4 p-4">
        <div className="mb-2 flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.magenta }} />
          <h2 className="text-base font-extrabold text-ink">活动简介</h2>
        </div>
        <ClashStripe className="mb-3" />
        {/* 服务端已做白名单过滤，可安全渲染 */}
        <div
          className="rich-text text-sm text-ink-soft"
          dangerouslySetInnerHTML={{ __html: event.description || '暂无简介' }}
        />
      </div>

      {/* 底部固定操作栏（适配全面屏安全区） */}
      <div
        className="fixed bottom-0 left-0 right-0 z-40 border-t-2 border-ink bg-paper-card p-3 shadow-[0_-4px_0_0_var(--ink-line)] md:bottom-auto md:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom) + 12px)' }}
      >
        <div className="mx-auto max-w-[1200px]">{mainButton}</div>
      </div>
      <div className="mt-4 hidden md:block">{mainButton}</div>

      {/* 报名备注弹窗 */}
      <Dialog open={registerOpen} onClose={() => !submitting && setRegisterOpen(false)} fullWidth maxWidth="xs">
        <DialogTitle>确认报名</DialogTitle>
        <DialogContent>
          <p className="mb-3 text-sm text-ink-soft">
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
          {/* 次要操作：中性描边 */}
          <Button variant="outlined" onClick={() => setRegisterOpen(false)} disabled={submitting}>
            取消
          </Button>
          {/* 主操作：宝蓝实心 */}
          <Button variant="contained" onClick={handleRegisterConfirm} disabled={submitting}>
            {submitting ? '提交中…' : '确认报名'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 取消报名确认弹窗 */}
      <Dialog open={cancelOpen} onClose={() => !submitting && setCancelOpen(false)} maxWidth="xs" fullWidth>
        <DialogTitle>取消报名</DialogTitle>
        <DialogContent>
          <p className="text-sm text-ink-soft">确定要取消报名「{event.title}」吗？</p>
        </DialogContent>
        <DialogActions>
          {/* 危险操作前的退路：中性描边 */}
          <Button variant="outlined" onClick={() => setCancelOpen(false)} disabled={submitting}>
            再想想
          </Button>
          {/* 危险操作：警示色实心 */}
          <Button color="error" variant="contained" onClick={handleCancelConfirm} disabled={submitting}>
            {submitting ? '处理中…' : '确认取消'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* 分享弹窗（海报 / 二维码 / 链接） */}
      <ShareDialog open={shareOpen} onClose={() => setShareOpen(false)} event={event} />

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
