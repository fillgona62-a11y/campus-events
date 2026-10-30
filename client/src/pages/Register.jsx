/**
 * 注册页：学号 + 姓名 + 邮箱（验证码，60 秒倒计时重发）+ 图形验证码 + 手机号（选填） + 密码/确认密码。
 * 图形验证码与线上一致：先过人机检测，再发邮箱验证码；验证码一次性使用。
 *
 * 视觉：与登录页同款左右分栏撞色布局（品牌区 + 白色表单卡）。
 */
import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { register, sendEmailCode, getCaptcha } from '../api/authApi';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';
import { AuthShell } from './clashUi';

const RESEND_COOLDOWN = 60; // 秒，与后端 EMAIL_CODE_RESEND_COOLDOWN_SEC 对齐

export default function Register() {
  const navigate = useNavigate();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [form, setForm] = useState({
    student_id: '',
    name: '',
    email: '',
    email_code: '',
    captcha_code: '',
    phone: '',
    password: '',
    confirm: '',
  });
  const [captcha, setCaptcha] = useState({ id: '', svg: '' });
  const [captchaAnswer, setCaptchaAnswer] = useState(''); // devEcho 调试模式下显示答案
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [sendingCode, setSendingCode] = useState(false);
  const [countdown, setCountdown] = useState(0);
  const timerRef = useRef(null);

  // 组件卸载时清理倒计时定时器
  useEffect(() => () => clearInterval(timerRef.current), []);

  /** 拉取新图形验证码；devEcho 模式（SMTP_DEV_ECHO=1）顺带取回答案供联调展示 */
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const data = await getCaptcha();
      setCaptcha({ id: data.id, svg: data.svg });
      setForm((f) => ({ ...f, captcha_code: '' }));
      try {
        const echo = await client.get(`/debug/echo?captcha_id=${encodeURIComponent(data.id)}`);
        setCaptchaAnswer(echo?.captchaText || '');
      } catch {
        setCaptchaAnswer('');
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setCaptchaLoading(false);
    }
  };

  // 进页面即加载图形验证码
  useEffect(() => {
    loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const startCountdown = () => {
    setCountdown(RESEND_COOLDOWN);
    clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setCountdown((c) => {
        if (c <= 1) {
          clearInterval(timerRef.current);
          return 0;
        }
        return c - 1;
      });
    }, 1000);
  };

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  const handleSendCode = async () => {
    const email = form.email.trim();
    if (!email) {
      setError('请先填写邮箱');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      setError('邮箱格式不正确');
      return;
    }
    if (!captcha.id || !form.captcha_code.trim()) {
      setError('请先输入图形验证码');
      return;
    }
    setSendingCode(true);
    setError('');
    setNotice('');
    try {
      const data = await sendEmailCode({
        email,
        purpose: 'register',
        captcha_id: captcha.id,
        captcha_code: form.captcha_code.trim(),
      });
      startCountdown();
      setNotice(
        data?.dev_code
          ? `开发模式：验证码为 ${data.dev_code}（未发送真实邮件）`
          : '验证码已发送，请查收邮件（5 分钟内有效）'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSendingCode(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirm) {
      setError('两次输入的密码不一致');
      return;
    }
    if (form.password.length < 6) {
      setError('密码至少 6 位');
      return;
    }
    if (!/^\d{6}$/.test(form.email_code.trim())) {
      setError('请输入 6 位数字验证码');
      return;
    }
    if (!form.captcha_code.trim()) {
      setError('请输入图形验证码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await register({
        student_id: form.student_id.trim(),
        name: form.name.trim(),
        email: form.email.trim(),
        email_code: form.email_code.trim(),
        captcha_id: captcha.id,
        captcha_code: form.captcha_code.trim(),
        password: form.password,
        phone: form.phone.trim() || undefined,
      });
      setAuth(data.token, data.user);
      navigate('/', { replace: true });
    } catch (err) {
      setError(err.message);
      // 图形验证码一次性使用：无论失败原因都应换新图，避免复用已消费的验证码
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <AuthShell accent="#9c6b3f" slogan="注册账号，发布与报名校园里的每一场活动">
      <div className="rounded-xl border border-ink/10 bg-paper-card p-6 shadow-sm md:p-8">
        <h2 className="text-center text-2xl font-semibold tracking-tight text-ink">
          注册新账号
        </h2>
        <p className="mb-5 mt-1 text-center text-sm text-ink-mute">注册后即可发布与报名活动</p>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}
        {notice && (
          <Alert severity="info" className="mb-4">
            {notice}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            fullWidth
            required
            label="学号"
            value={form.student_id}
            onChange={update('student_id')}
            helperText="3~32 位字母、数字或下划线，作为登录账号"
          />
          <TextField fullWidth required label="姓名" value={form.name} onChange={update('name')} />
          <TextField
            fullWidth
            required
            type="email"
            label="邮箱"
            value={form.email}
            onChange={update('email')}
            helperText="用于接收验证码与找回密码"
          />

          {/* 图形验证码 */}
          <div className="rounded-xl border border-ink/10 bg-paper p-3">
            <div className="flex items-start gap-2">
              <div
                className="flex h-14 w-32 shrink-0 cursor-pointer items-center justify-center overflow-hidden rounded-lg border border-ink/15 bg-white"
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
              required
              label="图形验证码"
              value={form.captcha_code}
              onChange={update('captcha_code')}
              inputProps={{ maxLength: 8 }}
              sx={{ mt: 1.5 }}
              helperText={
                captchaAnswer
                  ? `开发模式：验证码为 ${captchaAnswer}（未配置 SMTP 调试开关时不显示）`
                  : '看不清？点击图片或右侧按钮可刷新'
              }
            />
          </div>

          <div className="flex items-start gap-2">
            <TextField
              required
              label="邮箱验证码"
              value={form.email_code}
              onChange={update('email_code')}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              sx={{ flex: 1 }}
            />
            <Button
              variant="outlined"
              onClick={handleSendCode}
              disabled={sendingCode || countdown > 0}
              sx={{ minHeight: 56, whiteSpace: 'nowrap' }}
            >
              {countdown > 0 ? `${countdown} 秒后重发` : sendingCode ? '发送中…' : '发送验证码'}
            </Button>
          </div>

          <TextField
            fullWidth
            label="手机号（选填）"
            value={form.phone}
            onChange={update('phone')}
            helperText="用于报名名单联系，可稍后在个人资料中补充"
          />
          <TextField
            fullWidth
            required
            type="password"
            label="密码"
            value={form.password}
            onChange={update('password')}
            autoComplete="new-password"
            helperText="至少 6 位"
          />
          <TextField
            fullWidth
            required
            type="password"
            label="确认密码"
            value={form.confirm}
            onChange={update('confirm')}
            autoComplete="new-password"
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ minHeight: 48 }}
          >
            {submitting ? '注册中…' : '注册'}
          </Button>
        </form>

        <div className="mt-6 space-y-1.5 text-center text-sm">
          <p className="text-ink-mute">
            已有账号？
            <Link to="/login" className="ml-1 font-medium no-underline hover:underline" style={{ color: '#9c6b3f' }}>
              去登录
            </Link>
          </p>
          <p>
            <Link to="/" className="text-xs text-ink-faint no-underline hover:text-ink-soft">
              先逛逛，回首页
            </Link>
          </p>
        </div>
      </div>
    </AuthShell>
  );
}
