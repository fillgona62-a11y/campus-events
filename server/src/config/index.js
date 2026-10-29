/**
 * 环境变量读取与默认值集中管理。
 * 所有可配置项在此收敛，其他模块只允许从这里取配置。
 */
const path = require('path');
const fs = require('fs');
require('dotenv').config();

/** 将可能为相对路径的配置解析为基于 server 目录的绝对路径 */
function resolveDir(p, fallback) {
  const value = p || fallback;
  return path.isAbsolute(value) ? value : path.resolve(__dirname, '..', '..', value);
}

/**
 * 解析前端构建产物目录。
 * 依次尝试：环境变量 CLIENT_DIST、client/dist（本地开发）、webroot（线上部署包形态）。
 * 都找不到时回落到 client/dist，由调用方用 fs.existsSync 判断存在性。
 */
function resolveClientDist() {
  const base = path.resolve(__dirname, '..', '..', '..');
  const candidates = [process.env.CLIENT_DIST, 'client/dist', 'webroot'];
  for (const c of candidates) {
    if (!c) continue;
    const dir = path.isAbsolute(c) ? c : path.resolve(base, c);
    if (fs.existsSync(path.join(dir, 'index.html'))) return dir;
  }
  return path.resolve(base, 'client', 'dist');
}

const DEFAULT_JWT_SECRET = 'campus-events-dev-secret-do-not-use-in-prod';

const config = {
  /** HTTP 服务端口 */
  port: parseInt(process.env.PORT, 10) || 3000,
  /** JWT 签发密钥与有效期 */
  jwtSecret: process.env.JWT_SECRET || DEFAULT_JWT_SECRET,
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || '7d',
  /** SQLite 数据库文件绝对路径 */
  dbPath: resolveDir(process.env.DB_PATH, './data/data.db'),
  /** 封面图上传目录绝对路径 */
  uploadDir: resolveDir(process.env.UPLOAD_DIR, './uploads'),
  /** 前端构建产物目录（存在时由 Express 托管；线上部署包形态为 webroot） */
  clientDist: resolveClientDist(),
  /**
   * CORS 允许来源白名单（逗号分隔）。默认空 = 仅同源放行（生产：单进程托管前后端）。
   * 开发期前后端分离（:5173 → :3000）时由 Vite proxy 转发，请求对后端而言仍为同源，
   * 无需额外配置；仅在确有跨域需求时设置 CORS_ORIGINS=* 或具体域名。
   */
  corsOrigins: (process.env.CORS_ORIGINS || '')
    .split(',')
    .map((s) => s.trim())
    .filter(Boolean),
  /** 图形验证码配置（有效期秒数，一次性使用） */
  captcha: {
    ttlSeconds: parseInt(process.env.CAPTCHA_TTL, 10) || 300,
  },
  /** 初始管理员账号（seed 使用） */
  admin: {
    studentId: process.env.ADMIN_STUDENT_ID || 'admin',
    password: process.env.ADMIN_PASSWORD || 'admin123',
    name: process.env.ADMIN_NAME || '系统管理员',
  },
  /** 上传限制：图片 2MB / 视频 50MB（均可用 env 覆盖，单位 MB） */
  upload: {
    maxSize: (parseInt(process.env.UPLOAD_MAX_SIZE, 10) || 2) * 1024 * 1024,
    allowedMime: ['image/jpeg', 'image/png', 'image/webp'],
    video: {
      maxSize: (parseInt(process.env.UPLOAD_VIDEO_MAX_SIZE, 10) || 50) * 1024 * 1024,
      allowedMime: ['video/mp4', 'video/webm', 'video/quicktime'],
    },
  },
  /** 邮件通道（F3/F2 验证码；DEV_ECHO=1 不发真邮件） */
  smtp: {
    host: process.env.SMTP_HOST || 'smtp.qq.com',
    port: parseInt(process.env.SMTP_PORT, 10) || 465,
    secure: process.env.SMTP_SECURE !== 'false', // 默认 true（465 端口）
    user: process.env.SMTP_USER || '',
    // 授权码（不是邮箱登录密码）
    authCode: process.env.SMTP_AUTH_CODE || '',
    from: process.env.SMTP_FROM || process.env.SMTP_USER || '',
    // =1 时不发真实邮件，验证码在响应 dev_code 与服务器日志回显（开发/演示用）
    devEcho: process.env.SMTP_DEV_ECHO === '1',
  },
  /** 登录失败锁定（F12） */
  loginLock: {
    maxAttempts: parseInt(process.env.LOGIN_LOCK_MAX_ATTEMPTS, 10) || 5,
    minutes: parseInt(process.env.LOGIN_LOCK_MINUTES, 10) || 15,
  },
  /** 邮箱验证码规则（F3/F2） */
  emailCode: {
    expireMinutes: parseInt(process.env.EMAIL_CODE_EXPIRE_MINUTES, 10) || 5,
    resendCooldownSec: parseInt(process.env.EMAIL_CODE_RESEND_COOLDOWN_SEC, 10) || 60,
    maxAttempts: parseInt(process.env.EMAIL_CODE_MAX_ATTEMPTS, 10) || 5,
  },
};

module.exports = config;

// S4 代码侧配合：JWT_SECRET 使用兜底默认值时打启动告警（运维手册 RB-04）
if (config.jwtSecret === DEFAULT_JWT_SECRET) {
  console.warn(
    '[config] WARNING: JWT_SECRET is using the default value. ' +
      'Generate a strong random value: bash server/scripts/gen-jwt-secret.sh'
  );
}
