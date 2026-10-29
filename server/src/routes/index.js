/**
 * 路由聚合：统一挂载 /api/v1 前缀下的所有资源路由。
 */
const crypto = require('crypto');
const express = require('express');
const authRoutes = require('./authRoutes');
const eventRoutes = require('./eventRoutes');
const registrationRoutes = require('./registrationRoutes');
const adminRoutes = require('./adminRoutes');
const notificationRoutes = require('./notificationRoutes');
const uploadRoutes = require('./uploadRoutes');
const calendarRoutes = require('./calendarRoutes');
const forumRoutes = require('./forumRoutes');
const authController = require('../controllers/authController');
const captchaModel = require('../models/captchaModel');
const config = require('../config');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

router.use('/auth', authRoutes.router);
// GET /auth/captcha 图形验证码（SVG）；authRoutes 中无此路径，落至此处分发
// 注意：该 GET 不挂 actionLimiter——线上曾挂，但验证码图片请求会把 60/分钟额度占满，
// 误伤真正的写操作限流判定；防滥用由 POST 侧限流 + 验证码一次性消费 + TTL 300 秒保证
router.get('/auth/captcha', authController.getCaptcha);
// PUT /users/me（资料完善，schema 定义于 authRoutes 以保持 zod 规则集中）
router.put('/users/me', requireAuth, validate(authRoutes.updateMeSchema), authController.updateMe);
// PUT /users/me/email（绑定/更换邮箱，F3 联动；schema 定义于 authRoutes）
router.put(
  '/users/me/email',
  requireAuth,
  validate(authRoutes.bindEmailSchema),
  authController.bindEmail
);

router.use('/', eventRoutes);
router.use('/', registrationRoutes);
router.use('/admin', adminRoutes);
router.use('/', notificationRoutes);
router.use('/', uploadRoutes);
router.use('/calendar', calendarRoutes);
router.use('/forum', forumRoutes);

// 诊断接口（部署排障用）：回显本次请求收到的 token 传递情况与密钥指纹
router.get('/debug/echo', (req, res) => {
  const authHeader = req.headers.authorization || '';
  const xToken = req.headers['x-access-token'] || '';
  let fingerprint = 'n/a';
  try {
    fingerprint = crypto.createHash('sha256').update(config.jwtSecret).digest('hex').slice(0, 12);
  } catch (e) {
    fingerprint = 'error:' + e.message;
  }
  // 调试模式（SMTP_DEV_ECHO=1）下可回显指定图形验证码的文本，便于联调；生产请关闭该开关
  let captchaText = null;
  try {
    if (config.smtp.devEcho && req.query.captcha_id) {
      const row = captchaModel.findById(String(req.query.captcha_id));
      captchaText = row ? row.text : null;
    }
  } catch (e) {
    captchaText = null;
  }

  res.json({
    code: 0,
    message: 'ok',
    data: {
      captchaText,
      smtpConfigured: Boolean(config.smtp.host),
      hasAuthHeader: Boolean(authHeader),
      authHeaderPrefix: authHeader.slice(0, 10),
      hasXToken: Boolean(xToken),
      queryKeys: Object.keys(req.query || {}),
      tokenFromQuery: req.query && req.query.access_token ? String(req.query.access_token).slice(0, 12) : null,
      secretFingerprint: fingerprint,
      pid: process.pid,
      uptime: Math.round(process.uptime()),
      cwd: process.cwd(),
    },
  });
});

module.exports = router;
