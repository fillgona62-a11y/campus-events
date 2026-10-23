/**
 * 忘记密码页（F2）：两步流程。
 * 第一步：学号 + 绑定邮箱 → 发送验证码（防枚举中性提示）；
 * 第二步：验证码 + 新密码 → 重置成功跳转登录页。
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import Stepper from '@mui/material/Stepper';
import Step from '@mui/material/Step';
import StepLabel from '@mui/material/StepLabel';
import RefreshIcon from '@mui/icons-material/Refresh';
import { sendEmailCode, resetPassword, getCaptcha } from '../api/authApi';
import client from '../api/client';

const STEPS = ['验证身份', '设置新密码'];

export default function ForgotPassword() {
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [form, setForm] = useState({
    student_id: '',
    email: '',
    email_code: '',
    new_password: '',
    confirm: '',
  });
  const [captcha, setCaptcha] = useState({ id: '', svg: '' });
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(''); // devEcho 调试模式下显示答案
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 拉取新图形验证码；devEcho 模式顺带取回答案供联调展示 */
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

  // 进页面即加载图形验证码
  useEffect(() => {
    loadCaptcha();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const update = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  // 第一步：学号 + 邮箱发码
  const handleSendCode = async (e) => {
    e.preventDefault();
    if (!form.student_id.trim()) {
      setError('请输入学号');
      return;
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim())) {
      setError('邮箱格式不正确');
      return;
    }
    if (!captcha.id || !captchaCode.trim()) {
      setError('请先输入图形验证码');
      return;
    }
    setSubmitting(true);
    setError('');
    setNotice('');
    try {
      const data = await sendEmailCode({
        student_id: form.student_id.trim(),
        email: form.email.trim(),
        purpose: 'reset_password',
        captcha_id: captcha.id,
        captcha_code: captchaCode.trim(),
      });
      setStep(1);
      setNotice(
        data?.dev_code
          ? `开发模式：验证码为 ${data.dev_code}（未发送真实邮件）`
          : '若信息匹配，验证码将发送至该邮箱，请查收'
      );
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  // 第二步：验证码 + 新密码重置
  const handleReset = async (e) => {
    e.preventDefault();
    if (form.new_password.length < 6) {
      setError('新密码至少 6 位');
      return;
    }
    if (form.new_password !== form.confirm) {
      setError('两次输入的新密码不一致');
      return;
    }
    if (!/^\d{6}$/.test(form.email_code.trim())) {
      setError('请输入 6 位数字验证码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      await resetPassword({
        student_id: form.student_id.trim(),
        email: form.email.trim(),
        email_code: form.email_code.trim(),
        new_password: form.new_password,
      });
      navigate('/login', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4 py-8">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-primary">找回密码</h1>
        <p className="mb-4 text-center text-sm text-gray-500">通过绑定邮箱重置账号密码</p>

        <Stepper activeStep={step} className="mb-6">
          {STEPS.map((label) => (
            <Step key={label}>
              <StepLabel>{label}</StepLabel>
            </Step>
          ))}
        </Stepper>

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

        {step === 0 ? (
          <form onSubmit={handleSendCode} className="space-y-4">
            <TextField
              fullWidth
              required
              label="学号"
              value={form.student_id}
              onChange={update('student_id')}
            />
            <TextField
              fullWidth
              required
              type="email"
              label="绑定邮箱"
              value={form.email}
              onChange={update('email')}
              helperText="未绑定邮箱的老用户请先在个人资料页绑定邮箱"
            />
            <div>
              <div className="flex items-start gap-2">
                <div
                  className="flex h-14 w-32 shrink-0 cursor-pointer items-center justify-center rounded border border-gray-200 bg-gray-50"
                  onClick={loadCaptcha}
                  title="点击图片刷新验证码"
                  dangerouslySetInnerHTML={{ __html: captcha.svg }}
                />
                <Button
                  variant="outlined"
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
                value={captchaCode}
                onChange={(e) => setCaptchaCode(e.target.value)}
                inputProps={{ maxLength: 8 }}
                sx={{ mt: 1 }}
                helperText={captchaAnswer ? `开发模式：验证码为 ${captchaAnswer}` : '点击图片可刷新'}
              />
            </div>
            <Button
              fullWidth
              type="submit"
              variant="contained"
              size="large"
              disabled={submitting}
              sx={{ minHeight: 48 }}
            >
              {submitting ? '发送中…' : '发送验证码'}
            </Button>
          </form>
        ) : (
          <form onSubmit={handleReset} className="space-y-4">
            <TextField
              fullWidth
              required
              label="验证码"
              value={form.email_code}
              onChange={update('email_code')}
              inputProps={{ maxLength: 6, inputMode: 'numeric' }}
              helperText="6 位数字验证码，5 分钟内有效"
            />
            <TextField
              fullWidth
              required
              type="password"
              label="新密码"
              value={form.new_password}
              onChange={update('new_password')}
              autoComplete="new-password"
              helperText="至少 6 位"
            />
            <TextField
              fullWidth
              required
              type="password"
              label="确认新密码"
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
              {submitting ? '重置中…' : '重置密码'}
            </Button>
          </form>
        )}

        <p className="mt-4 text-center text-sm text-gray-500">
          <Link to="/login" className="text-primary">
            返回登录
          </Link>
        </p>
      </div>
    </div>
  );
}
