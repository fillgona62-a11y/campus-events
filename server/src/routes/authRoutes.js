/**
 * 认证与用户路由：/auth/* 与 PUT /users/me、PUT /users/me/email。
 */
const express = require('express');
const { z } = require('zod');
const authController = require('../controllers/authController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { loginLimiter, registerLimiter, emailCodeLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// 学号：3~32 位字母/数字/下划线；密码 6~64 位；手机号可为空或 11 位大陆手机号；邮箱必填（F3）
// 图形验证码字段：注册必须带，先过人机检测再发邮箱验证码（与线上一致）
const captchaFields = {
  captcha_id: z.string({ required_error: '请获取图形验证码' }).trim().min(1, '请获取图形验证码'),
  captcha_code: z.string({ required_error: '请输入图形验证码' }).trim().min(1, '请输入图形验证码'),
};

const registerSchema = z.object({
  ...captchaFields,
  student_id: z
    .string({ required_error: '学号不能为空' })
    .trim()
    .min(3, '学号至少 3 个字符')
    .max(32, '学号最多 32 个字符')
    .regex(/^[A-Za-z0-9_]+$/, '学号仅支持字母、数字、下划线'),
  name: z
    .string({ required_error: '姓名不能为空' })
    .trim()
    .min(1, '姓名不能为空')
    .max(32, '姓名最多 32 个字符'),
  email: z
    .string({ required_error: '邮箱不能为空' })
    .trim()
    .min(1, '邮箱不能为空')
    .email('邮箱格式不正确')
    .max(254, '邮箱过长'),
  email_code: z
    .string({ required_error: '验证码不能为空' })
    .trim()
    .length(6, '验证码为 6 位数字')
    .regex(/^\d{6}$/, '验证码为 6 位数字'),
  password: z
    .string({ required_error: '密码不能为空' })
    .min(6, '密码至少 6 位')
    .max(64, '密码最多 64 位'),
  phone: z
    .string()
    .trim()
    .regex(/^1\d{10}$/, '手机号格式不正确')
    .optional()
    .or(z.literal('').transform(() => undefined)),
});

const loginSchema = z.object({
  ...captchaFields,
  student_id: z.string({ required_error: '学号不能为空' }).trim().min(1, '学号不能为空'),
  password: z.string({ required_error: '密码不能为空' }).min(1, '密码不能为空'),
});

// 小程序登录：免图形验证码（v6）
const loginMiniappSchema = z.object({
  student_id: z.string({ required_error: '学号不能为空' }).trim().min(1, '学号不能为空'),
  password: z.string({ required_error: '密码不能为空' }).min(1, '密码不能为空'),
});

const updateMeSchema = z.object({
  name: z.string().trim().min(1, '姓名不能为空').max(32, '姓名最多 32 个字符').optional(),
  phone: z
    .string()
    .trim()
    .regex(/^1\d{10}$/, '手机号格式不正确')
    .or(z.literal(''))
    .optional(),
});

/** 发送邮箱验证码：register 只需 email；reset_password 需 student_id */
const emailCodeSendSchema = z.object({
  ...captchaFields,
  email: z
    .string({ required_error: '邮箱不能为空' })
    .trim()
    .email('邮箱格式不正确')
    .max(254, '邮箱过长'),
  purpose: z.enum(['register', 'reset_password', 'bind_email'], {
    errorMap: () => ({ message: 'purpose 仅支持 register / reset_password / bind_email' }),
  }),
  student_id: z.string().trim().max(32).optional(),
});

/** 自助修改密码（需登录） */
const changePasswordSchema = z.object({
  old_password: z.string({ required_error: '旧密码不能为空' }).min(1, '旧密码不能为空'),
  new_password: z
    .string({ required_error: '新密码不能为空' })
    .min(6, '新密码至少 6 位')
    .max(64, '新密码最多 64 位'),
});

/** 忘记密码重置（免登录） */
const resetPasswordSchema = z.object({
  student_id: z.string({ required_error: '学号不能为空' }).trim().min(1, '学号不能为空'),
  email: z
    .string({ required_error: '邮箱不能为空' })
    .trim()
    .email('邮箱格式不正确')
    .max(254, '邮箱过长'),
  email_code: z
    .string({ required_error: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码为 6 位数字'),
  new_password: z
    .string({ required_error: '新密码不能为空' })
    .min(6, '新密码至少 6 位')
    .max(64, '新密码最多 64 位'),
});

/** 绑定/更换邮箱（需登录） */
const bindEmailSchema = z.object({
  email: z
    .string({ required_error: '邮箱不能为空' })
    .trim()
    .email('邮箱格式不正确')
    .max(254, '邮箱过长'),
  email_code: z
    .string({ required_error: '验证码不能为空' })
    .trim()
    .regex(/^\d{6}$/, '验证码为 6 位数字'),
});

router.post('/register', registerLimiter, validate(registerSchema), authController.register);
router.post('/login', loginLimiter, validate(loginSchema), authController.login);
// 小程序登录（v6）：免图形验证码，仍限流防暴力破解
router.post('/login-miniapp', loginLimiter, validate(loginMiniappSchema), authController.loginMiniapp);
// 发送邮箱验证码：register/reset_password 免登录；bind_email 需登录（optionalAuth 挂载用户，控制器内校验）
router.post(
  '/email-code/send',
  emailCodeLimiter,
  optionalAuth,
  validate(emailCodeSendSchema),
  authController.sendEmailCode
);
router.post('/password', requireAuth, validate(changePasswordSchema), authController.changePassword);
router.post('/password/reset', validate(resetPasswordSchema), authController.resetPassword);
router.get('/me', requireAuth, authController.me);

module.exports = { router, updateMeSchema, bindEmailSchema };
