/**
 * 认证与用户控制器：注册（邮箱验证码）、登录（账号锁定）、发验证码、
 * 自助改密、忘记密码重置、绑定邮箱、当前用户、资料完善。
 */
const bcrypt = require('bcryptjs');
const config = require('../config');
const userModel = require('../models/userModel');
const notificationModel = require('../models/notificationModel');
const notificationService = require('../services/notificationService');
const emailCodeService = require('../services/emailCodeService');
const { signToken } = require('../utils/jwt');
const { ApiError, ok } = require('../utils/response');
const {
  ERR,
  USER_STATUS,
  NOTIFICATION_TYPE,
  EMAIL_CODE_PURPOSE,
} = require('../utils/constants');
const { isStrongEnough } = require('../utils/password');
const captcha = require('../utils/captcha');

/** 校验图形验证码，失败直接抛错（统一文案，避免信息泄露） */
function assertCaptcha(req) {
  const { captcha_id, captcha_code } = req.body || {};
  if (!captcha_id || !captcha_code) {
    throw new ApiError(ERR.CAPTCHA_INVALID, '请先完成图形验证码', 400);
  }
  if (!captcha.verify(captcha_id, captcha_code)) {
    throw new ApiError(ERR.CAPTCHA_INVALID, '图形验证码错误或已失效，请点击图片刷新', 400);
  }
}

/**
 * POST /auth/email-code/send 发送/重发邮箱验证码（F3/F2/F3 联动）。
 * - register：只需 email；邮箱已被注册/绑定 → 40906。
 * - reset_password：需 student_id + email；学号不存在或邮箱不匹配时**不发码**，
 *   统一中性响应（防枚举）。
 * - bind_email：需登录；email 已被他人绑定 → 40906。
 */
async function sendEmailCode(req, res, next) {
  try {
    // 先过人机检测（与线上一致）：发码接口同样要求图形验证码，防邮箱被轰炸
    assertCaptcha(req);
    const { email, purpose, student_id } = req.body;
    if (!email) throw ApiError.badRequest('邮箱不能为空');

    if (purpose === EMAIL_CODE_PURPOSE.REGISTER) {
      if (userModel.findByEmail(email)) {
        throw new ApiError(ERR.EMAIL_EXISTS, '该邮箱已被注册或绑定', 409);
      }
    } else if (purpose === EMAIL_CODE_PURPOSE.RESET_PASSWORD) {
      if (!student_id) throw ApiError.badRequest('学号不能为空');
      // 防枚举：学号不存在或邮箱未绑定/不匹配时不发码，统一中性文案
      const user = userModel.findByStudentId(student_id);
      if (!user || !user.email || user.email !== email) {
        return ok(res, null, '若信息匹配，验证码将发送至该邮箱');
      }
    } else if (purpose === EMAIL_CODE_PURPOSE.BIND_EMAIL) {
      if (!req.user) throw ApiError.unauthorized();
      const bound = userModel.findByEmail(email);
      if (bound && bound.id !== req.user.id) {
        throw new ApiError(ERR.EMAIL_EXISTS, '该邮箱已被其他账号绑定', 409);
      }
    } else {
      throw ApiError.badRequest('验证码用途不合法');
    }

    const result = await emailCodeService.send(email, purpose);
    ok(res, result, '验证码已发送，请查收邮件');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/register 注册（v2 改造 + 线上 captcha 双保险）：
 * 图形验证码校验 → 学号查重（40901）→ 邮箱查重（40906）→ 验证码校验（40907）
 * → 建用户（email_verified=1）→ 签发 token。
 */
async function register(req, res, next) {
  try {
    // 先过人机检测（与线上一致），再走邮箱验证码
    assertCaptcha(req);
    const { student_id, name, password, phone, email, email_code } = req.body;
    if (userModel.findByStudentId(student_id)) {
      throw new ApiError(ERR.STUDENT_ID_EXISTS, '该学号已注册', 409);
    }
    if (userModel.findByEmail(email)) {
      throw new ApiError(ERR.EMAIL_EXISTS, '该邮箱已被注册或绑定', 409);
    }
    emailCodeService.verify(email, EMAIL_CODE_PURPOSE.REGISTER, email_code);
    const passwordHash = bcrypt.hashSync(password, 10);
    const user = userModel.create({
      student_id,
      name,
      phone: phone || null,
      password_hash: passwordHash,
      email,
    });
    const token = signToken(user);
    ok(res, { token, user: userModel.toPublic(user) }, '注册成功');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/login 登录（v2：账号级锁定 F12 + 线上 captcha 双保险）。
 * 流程：图形验证码 → locked_until 未到期 → 423/40302；密码错误 → 计数+1，满 5 锁定 15 分钟；
 * 密码正确 → 清零失败计数与锁定态并签发 token。
 */
function login(req, res, next) {
  try {
    // 先过人机检测（与线上一致）
    assertCaptcha(req);
    const { student_id, password } = req.body;
    const user = userModel.findByStudentId(student_id);

    // 账号锁定优先判定（不再校验密码）
    if (user && user.locked_until && Date.parse(user.locked_until) > Date.now()) {
      const remainMin = Math.max(
        1,
        Math.ceil((Date.parse(user.locked_until) - Date.now()) / 60000)
      );
      throw new ApiError(ERR.ACCOUNT_LOCKED, `账号已锁定，请 ${remainMin} 分钟后再试`, 423);
    }

    // 学号不存在走与密码错误相同文案（不枚举用户存在性）
    if (!user || !bcrypt.compareSync(password, user.password_hash)) {
      if (user) {
        const { locked } = userModel.recordLoginFailure(
          user,
          config.loginLock.minutes,
          config.loginLock.maxAttempts
        );
        if (locked) {
          throw new ApiError(
            ERR.ACCOUNT_LOCKED,
            `密码错误次数过多，账号已锁定，请 ${config.loginLock.minutes} 分钟后再试`,
            423
          );
        }
      }
      const remain = user
        ? config.loginLock.maxAttempts - (user.failed_login_count || 0) - 1
        : config.loginLock.maxAttempts;
      throw ApiError.unauthorized(`学号或密码错误（还可尝试 ${remain} 次）`);
    }

    if (user.status !== USER_STATUS.ACTIVE) {
      throw ApiError.forbidden('账号已被禁用，请联系管理员');
    }
    userModel.clearLoginFailures(user.id);
    const token = signToken(user);
    ok(res, { token, user: userModel.toPublic(user) }, '登录成功');
  } catch (err) {
    next(err);
  }
}

/** GET /auth/captcha 获取图形验证码（SVG，一次性使用） */
function getCaptcha(req, res, next) {
  try {
    const data = captcha.generate();
    res.set('Cache-Control', 'no-store');
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

/** GET /auth/me 返回当前用户（含未读通知数） */
function me(req, res, next) {
  try {
    const user = userModel.toPublic(req.user);
    user.unread_count = notificationModel.unreadCount(req.user.id);
    ok(res, { user });
  } catch (err) {
    next(err);
  }
}

/** PUT /users/me 资料完善（姓名/手机号） */
function updateMe(req, res, next) {
  try {
    const { name, phone } = req.body;
    // 空字符串视为清除手机号
    const phoneValue = phone === '' ? null : phone;
    const user = userModel.updateProfile(req.user.id, { name, phone: phoneValue });
    ok(res, { user: userModel.toPublic(user) }, '资料已更新');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/password 自助修改密码（F1，需登录）。
 * 旧密码 bcrypt 比对（失败 40002）→ 写新哈希 + 清零锁定 → 站内信通知本人。
 * 当前登录态保持（JWT 不涉及密码，不踢自己下线）。
 */
function changePassword(req, res, next) {
  try {
    const { old_password, new_password } = req.body;
    if (!isStrongEnough(new_password)) {
      throw ApiError.badRequest('新密码至少 6 位');
    }
    const user = userModel.findById(req.user.id);
    if (!user) throw ApiError.unauthorized();
    if (!bcrypt.compareSync(old_password, user.password_hash)) {
      throw new ApiError(ERR.OLD_PASSWORD_WRONG, '旧密码不正确', 400);
    }
    const passwordHash = bcrypt.hashSync(new_password, 10);
    userModel.updatePasswordHash(user.id, passwordHash);
    notificationService.send(
      user.id,
      NOTIFICATION_TYPE.PASSWORD_CHANGED,
      '密码已修改',
      '您的账号密码刚刚被修改。如非本人操作，请立即联系管理员并检查账号安全。'
    );
    ok(res, null, '密码修改成功');
  } catch (err) {
    next(err);
  }
}

/**
 * POST /auth/password/reset 忘记密码重置（F2，免登录）。
 * 学号+邮箱匹配校验（不匹配 40001）→ 验证码校验（40907）→ 写新哈希 + 清零锁定 → 站内信通知。
 */
function resetPassword(req, res, next) {
  try {
    const { student_id, email, email_code, new_password } = req.body;
    if (!isStrongEnough(new_password)) {
      throw ApiError.badRequest('新密码至少 6 位');
    }
    const user = userModel.findByStudentId(student_id);
    if (!user || !user.email || user.email !== email) {
      // 已过验证码关卡可明确提示；按设计 §5.1-⑤ 返回 40001 而非 40101
      throw ApiError.badRequest('学号与邮箱不匹配，请检查后重试');
    }
    emailCodeService.verify(email, EMAIL_CODE_PURPOSE.RESET_PASSWORD, email_code);
    const passwordHash = bcrypt.hashSync(new_password, 10);
    userModel.updatePasswordHash(user.id, passwordHash);
    notificationService.send(
      user.id,
      NOTIFICATION_TYPE.PASSWORD_RESET,
      '密码已被重置',
      '您的账号密码刚刚通过“忘记密码”流程被重置。如非本人操作，请立即联系管理员。'
    );
    ok(res, null, '密码重置成功，请使用新密码登录');
  } catch (err) {
    next(err);
  }
}

/**
 * PUT /users/me/email 绑定/更换邮箱（F3 联动，需登录）。
 * 验证码校验（40907）→ 邮箱唯一性（他人已绑 40906）→ 更新 email + email_verified=1。
 */
function bindEmail(req, res, next) {
  try {
    const { email, email_code } = req.body;
    emailCodeService.verify(email, EMAIL_CODE_PURPOSE.BIND_EMAIL, email_code);
    const bound = userModel.findByEmail(email);
    if (bound && bound.id !== req.user.id) {
      throw new ApiError(ERR.EMAIL_EXISTS, '该邮箱已被其他账号绑定', 409);
    }
    const user = userModel.updateEmail(req.user.id, email);
    ok(res, { user: userModel.toPublic(user) }, '邮箱绑定成功');
  } catch (err) {
    next(err);
  }
}

module.exports = {
  sendEmailCode,
  register,
  getCaptcha,
  login,
  me,
  updateMe,
  changePassword,
  resetPassword,
  bindEmail,
};
