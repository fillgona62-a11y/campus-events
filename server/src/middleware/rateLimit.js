/**
 * 限流配置：登录/注册防暴力破解，报名接口防重复提交。
 */
const rateLimit = require('express-rate-limit');
const { ERR } = require('../utils/constants');

/** 超限统一响应格式 */
const limitHandler = (req, res) => {
  res.status(429).json({ code: ERR.PARAM_INVALID, message: '操作过于频繁，请稍后再试' });
};

/** 登录限流：10 次 / 5 分钟 / IP */
const loginLimiter = rateLimit({
  windowMs: 5 * 60 * 1000,
  limit: 10,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
  message: undefined,
});

/** 注册限流：20 次 / 10 分钟 / IP */
const registerLimiter = rateLimit({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

/** 报名/取消等写操作限流：60 次 / 分钟 / IP */
const actionLimiter = rateLimit({
  windowMs: 60 * 1000,
  limit: 60,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

/** 邮箱验证码限流：20 次 / 小时 / IP（防邮件轰炸，F3） */
const emailCodeLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 20,
  standardHeaders: true,
  legacyHeaders: false,
  handler: limitHandler,
});

module.exports = { loginLimiter, registerLimiter, actionLimiter, emailCodeLimiter };
