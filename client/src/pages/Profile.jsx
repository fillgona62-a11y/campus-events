/**
 * 个人资料：学号（只读）+ 完善姓名/手机号 + 修改密码卡片+ 邮箱卡片（联动绑定/换绑）。
 *
 * 视觉：撞色圆形头像（首字）+ 资料项卡片列表。
 */
import { useEffect, useState } from 'react';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Snackbar from '@mui/material/Snackbar';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { updateMe, changePassword, sendEmailCode, bindEmail, getCaptcha } from '../api/authApi';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { ClashStar, ClashStripe } from '../components/ClashDecor';
import { CLASH } from '../theme';

/** 角色 → 中文显示（大管理员 / 管理员 / 普通用户） */
const ROLE_LABEL = {
  super_admin: '大管理员',
  admin: '管理员',
  user: '普通用户',
};

export default function Profile() {
  const { user, setUser, logout } = useAuthStore();
  const [name, setName] = useState(user?.name || '');
  const [phone, setPhone] = useState(user?.phone || '');
  const [submitting, setSubmitting] = useState(false);
  const [toast, setToast] = useState({ open: false, message: '', severity: 'success' });

  // 修改密码卡片
  const [pwd, setPwd] = useState({ old_password: '', new_password: '', confirm: '' });
  const [pwdSubmitting, setPwdSubmitting] = useState(false);

  // 邮箱卡片（绑定/换绑 + 验证码）
  const [emailForm, setEmailForm] = useState({ email: user?.email || '', email_code: '' });
  const [emailSubmitting, setEmailSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [codeCountdown, setCodeCountdown] = useState(0);

  // 邮箱卡片图形验证码（发验证码接口与线上一致要求过人机检测）
  const [captcha, setCaptcha] = useState({ id: '', svg: '' });
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState('');
  const [captchaLoading, setCaptchaLoading] = useState(false);

  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptcha({ id: data.id, svg: data.svg });
      setCaptchaCode('');
      try {
        const echo = await client.get(`/debug/echo?captcha_id=${encodeURIComponent(data.id)}`);
        setCaptchaAnswer(echo?.captchaText || '');
      } catch {
        setCaptchaAnswer('');
      }
    } catch {
      setCaptchaAnswer('');
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const showToast = (message, severity = 'success') => setToast({ open: true, message, severity });

  const handleSubmit = async () => {
    if (!name.trim()) {
      showToast('姓名不能为空', 'error');
      return;
    }
    if (phone && !/^1\d{10}$/.test(phone.trim())) {
      showToast('手机号格式不正确', 'error');
      return;
    }
    setSubmitting(true);
    try {
      const data = await updateMe({ name: name.trim(), phone: phone.trim() });
      setUser({ ...user, ...data.user });
      showToast('资料已保存');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const handleChangePassword = async () => {
    if (!pwd.old_password) {
      showToast('请输入旧密码', 'error');
      return;
    }
    if (pwd.new_password.length < 6) {
      showToast('新密码至少 6 位', 'error');
      return;
    }
    if (pwd.new_password !== pwd.confirm) {
      showToast('两次输入的新密码不一致', 'error');
      return;
    }
    setPwdSubmitting(true);
    try {
      await changePassword({ old_password: pwd.old_password, new_password: pwd.new_password });
      setPwd({ old_password: '', new_password: '', confirm: '' });
      showToast('密码修改成功，当前登录态保持有效');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setPwdSubmitting(false);
    }
  };

  const handleSendEmailCode = async () => {
    const email = emailForm.email.trim();
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('邮箱格式不正确', 'error');
      return;
    }
    if (!captcha.id || !captchaCode.trim()) {
      showToast('请先输入图形验证码', 'error');
      return;
    }
    setSendingCode(true);
    try {
      const data = await sendEmailCode({
        email,
        purpose: 'bind_email',
        captcha_id: captcha.id,
        captcha_code: captchaCode.trim(),
      });
      setCodeCountdown(60);
      const timer = setInterval(() => {
        setCodeCountdown((c) => {
          if (c <= 1) {
            clearInterval(timer);
            return 0;
          }
          return c - 1;
        });
      }, 1000);
      showToast(
        data?.dev_code
          ? `开发模式：验证码为 ${data.dev_code}（未发送真实邮件）`
          : '验证码已发送，请查收邮件'
      );
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setSendingCode(false);
    }
  };

  const handleBindEmail = async () => {
    if (!/^\d{6}$/.test(emailForm.email_code.trim())) {
      showToast('请输入 6 位数字验证码', 'error');
      return;
    }
    setEmailSubmitting(true);
    try {
      const data = await bindEmail({
        email: emailForm.email.trim(),
        email_code: emailForm.email_code.trim(),
      });
      setUser({ ...user, ...data.user });
      setEmailForm((f) => ({ ...f, email_code: '' }));
      showToast('邮箱绑定成功，可用于找回密码');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setEmailSubmitting(false);
    }
  };

  return (
    <div className="mx-auto max-w-md space-y-4">
      {/* ── 撞色头像区 ─────────────────────────────────────────── */}
      <section className="clash-card flex items-center gap-4 p-4">
        <div
          className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full border-2 border-ink text-2xl font-extrabold text-ink shadow-block-ink-sm"
          style={{ backgroundColor: CLASH.lime }}
          aria-hidden="true"
        >
          {user?.name?.slice(0, 1) || '我'}
        </div>
        <div className="min-w-0 flex-1">
          <h1 className="truncate text-lg font-extrabold tracking-tight text-ink">
            {user?.name || '未设置姓名'}
          </h1>
          <p className="mt-0.5 text-xs font-bold text-ink-mute">学号 {user?.student_id || '-'}</p>
          <div className="mt-1.5 flex flex-wrap gap-1.5">
            <span className="rounded-md border-2 border-ink bg-clash-cyan px-2 py-0.5 text-[11px] font-extrabold text-ink on-clash">
              {ROLE_LABEL[user?.role] || '普通用户'}
            </span>
            <span className="rounded-md border-2 border-ink bg-clash-mint px-2 py-0.5 text-[11px] font-extrabold text-ink on-clash">
              {user?.email ? '已绑定邮箱' : '未绑定邮箱'}
            </span>
          </div>
        </div>
        <ClashStar size={22} className="animate-float" style={{ color: CLASH.magenta }} />
      </section>

      {/* ── 基本资料 ───────────────────────────────────────────── */}
      <section className="clash-card space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.violet }} />
          <h2 className="text-base font-extrabold text-ink">基本资料</h2>
        </div>
        <ClashStripe />
        <TextField fullWidth label="学号" value={user?.student_id || ''} disabled helperText="学号为登录账号，不可修改" />
        <TextField
          fullWidth
          required
          label="姓名"
          value={name}
          onChange={(e) => setName(e.target.value)}
          helperText="将展示在活动报名名单中"
        />
        <TextField
          fullWidth
          label="手机号"
          value={phone}
          onChange={(e) => setPhone(e.target.value)}
          helperText="用于活动组织者联系您，建议填写"
        />
        <Button
          fullWidth
          variant="contained"
          size="large"
          onClick={handleSubmit}
          disabled={submitting}
          sx={{ minHeight: 48 }}
        >
          {submitting ? '保存中…' : '保存'}
        </Button>
        <Button
          fullWidth
          color="error"
          variant="outlined"
          onClick={() => {
            logout();
            window.location.href = '/login';
          }}
        >
          退出登录
        </Button>
      </section>

      {/* 修改密码卡片 */}
      <section className="clash-card space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.lemon }} />
          <h2 className="text-base font-extrabold text-ink">修改密码</h2>
        </div>
        <ClashStripe />
        <TextField
          fullWidth
          type="password"
          label="旧密码"
          value={pwd.old_password}
          onChange={(e) => setPwd((f) => ({ ...f, old_password: e.target.value }))}
          autoComplete="current-password"
        />
        <TextField
          fullWidth
          type="password"
          label="新密码"
          value={pwd.new_password}
          onChange={(e) => setPwd((f) => ({ ...f, new_password: e.target.value }))}
          autoComplete="new-password"
          helperText="至少 6 位"
        />
        <TextField
          fullWidth
          type="password"
          label="确认新密码"
          value={pwd.confirm}
          onChange={(e) => setPwd((f) => ({ ...f, confirm: e.target.value }))}
          autoComplete="new-password"
        />
        <Button
          fullWidth
          variant="contained"
          onClick={handleChangePassword}
          disabled={pwdSubmitting}
          sx={{ minHeight: 48 }}
        >
          {pwdSubmitting ? '提交中…' : '修改密码'}
        </Button>
      </section>

      {/* 邮箱卡片（联动：绑定后可用于找回密码） */}
      <section className="clash-card space-y-4 p-4 md:p-6">
        <div className="flex items-center gap-2">
          <ClashStar size={16} style={{ color: CLASH.cyan }} />
          <h2 className="text-base font-extrabold text-ink">绑定邮箱</h2>
        </div>
        <ClashStripe />
        <p className="text-sm text-ink-soft">
          绑定邮箱后可通过“忘记密码”自助找回密码。当前状态：
          {user?.email ? `已绑定（${user.email}）` : '未绑定'}
        </p>
        <TextField
          fullWidth
          type="email"
          label={user?.email ? '更换邮箱' : '邮箱'}
          value={emailForm.email}
          onChange={(e) => setEmailForm((f) => ({ ...f, email: e.target.value }))}
        />
        {/* 图形验证码：撞色小卡 */}
        <div className="rounded-2xl border-2 border-ink bg-clash-lemon p-3 shadow-block-ink-sm on-clash">
          <div className="flex items-start gap-2">
            <div
              className="flex h-14 w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-xl border-2 border-ink bg-paper-card"
              onClick={loadCaptcha}
              title="点击图片刷新验证码"
              dangerouslySetInnerHTML={{ __html: captcha.svg }}
            />
            <Button
              variant="contained"
              onClick={loadCaptcha}
              disabled={captchaLoading}
              startIcon={<RefreshIcon />}
              sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
            >
              {captchaLoading ? '获取中…' : '刷新'}
            </Button>
          </div>
          <TextField
            fullWidth
            label="图形验证码"
            value={captchaCode}
            onChange={(e) => setCaptchaCode(e.target.value)}
            inputProps={{ maxLength: 8 }}
            sx={{ mt: 1.5 }}
            helperText={captchaAnswer ? `开发模式：验证码为 ${captchaAnswer}` : '看不清？点击图片或右侧按钮可刷新'}
          />
        </div>
        <div className="flex items-start gap-2">
          <TextField
            label="验证码"
            value={emailForm.email_code}
            onChange={(e) => setEmailForm((f) => ({ ...f, email_code: e.target.value }))}
            inputProps={{ maxLength: 6, inputMode: 'numeric' }}
            sx={{ flex: 1 }}
          />
          <Button
            variant="outlined"
            onClick={handleSendEmailCode}
            disabled={sendingCode || codeCountdown > 0}
            sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
          >
            {codeCountdown > 0 ? `${codeCountdown} 秒后重发` : sendingCode ? '发送中…' : '发送验证码'}
          </Button>
        </div>
        <Button
          fullWidth
          variant="contained"
          onClick={handleBindEmail}
          disabled={emailSubmitting}
          sx={{ minHeight: 48 }}
        >
          {emailSubmitting ? '提交中…' : '绑定邮箱'}
        </Button>
      </section>

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
