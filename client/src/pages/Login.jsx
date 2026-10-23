/**
 * 登录页：学号 + 密码，居中卡片。
 */
import { useEffect, useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import Button from '@mui/material/Button';
import TextField from '@mui/material/TextField';
import Alert from '@mui/material/Alert';
import RefreshIcon from '@mui/icons-material/Refresh';
import { login, getCaptcha } from '../api/authApi';
import client from '../api/client';
import { useAuthStore } from '../store/authStore';

export default function Login() {
  const navigate = useNavigate();
  const location = useLocation();
  const setAuth = useAuthStore((s) => s.setAuth);

  const [studentId, setStudentId] = useState('');
  const [password, setPassword] = useState('');
  const [captcha, setCaptcha] = useState({ id: '', svg: '' });
  const [captchaCode, setCaptchaCode] = useState('');
  const [captchaAnswer, setCaptchaAnswer] = useState(''); // devEcho 调试模式下显示答案
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  /** 拉取新图形验证码；devEcho 模式（SMTP_DEV_ECHO=1）顺带取回答案供联调展示 */
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

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!studentId.trim() || !password) {
      setError('请输入学号和密码');
      return;
    }
    if (!captcha.id || !captchaCode.trim()) {
      setError('请先输入图形验证码');
      return;
    }
    setSubmitting(true);
    setError('');
    try {
      const data = await login({
        student_id: studentId.trim(),
        password,
        captcha_id: captcha.id,
        captcha_code: captchaCode.trim(),
      });
      setAuth(data.token, data.user);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
      // 图形验证码一次性使用：失败后换新图，避免复用已消费的验证码
      loadCaptcha();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-sm rounded-2xl bg-white p-8 shadow-md">
        <h1 className="mb-1 text-center text-2xl font-bold text-primary">校园活动报名系统</h1>
        <p className="mb-6 text-center text-sm text-gray-500">登录后报名心仪的活动</p>

        {error && (
          <Alert severity="error" className="mb-4">
            {error}
          </Alert>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <TextField
            fullWidth
            label="学号"
            value={studentId}
            onChange={(e) => setStudentId(e.target.value)}
            autoComplete="username"
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
          <TextField
            fullWidth
            type="password"
            label="密码"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            autoComplete="current-password"
          />
          <Button
            fullWidth
            type="submit"
            variant="contained"
            size="large"
            disabled={submitting}
            sx={{ minHeight: 48 }}
          >
            {submitting ? '登录中…' : '登录'}
          </Button>
        </form>

        <p className="mt-4 text-center text-sm text-gray-500">
          没有账号？
          <Link to="/register" className="text-primary">
            去注册
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/forgot-password" className="text-gray-400">
            忘记密码？
          </Link>
        </p>
        <p className="mt-2 text-center text-sm">
          <Link to="/" className="text-gray-400">
            先逛逛，回首页
          </Link>
        </p>
      </div>
    </div>
  );
}
