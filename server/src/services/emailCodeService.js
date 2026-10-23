/**
 * 邮箱验证码业务规则（唯一实现处）：6 位数字 / 5 分钟有效 /
 * 同邮箱同用途 60 秒冷却 / 单码校验错误 5 次作废 / 发新码作废旧码。
 * 邮件实际发送委托 mailService（DEV_ECHO 或未配置时降级为日志/静默）。
 */
const crypto = require('crypto');
const config = require('../config');
const emailCodeModel = require('../models/emailCodeModel');
const mailService = require('./mailService');
const { ApiError } = require('../utils/response');
const { ERR, EMAIL_CODE_PURPOSE } = require('../utils/constants');

/**
 * 发送验证码。冷却期内重复发送抛 40908（HTTP 429）。
 * @param {string} email 收件邮箱
 * @param {'register'|'reset_password'|'bind_email'} purpose 用途
 * @returns {Promise<{expires_in:number, dev_code?:string}>}
 */
async function send(email, purpose) {
  const now = Date.now();
  const active = emailCodeModel.findLatestActive(email, purpose);
  if (active) {
    // 冷却：最新未过期码创建不足 resendCooldownSec 秒则拒绝重发
    const ageSec = (now - Date.parse(active.created_at)) / 1000;
    if (ageSec < config.emailCode.resendCooldownSec) {
      throw new ApiError(
        ERR.EMAIL_CODE_TOO_FREQUENT,
        `验证码发送过于频繁，请 ${Math.ceil(config.emailCode.resendCooldownSec - ageSec)} 秒后重试`,
        429
      );
    }
  }

  const code = String(crypto.randomInt(100000, 999999));
  const expiresAt = new Date(now + config.emailCode.expireMinutes * 60 * 1000).toISOString();
  emailCodeModel.insert({ email, code, purpose, expires_at: expiresAt });

  // 发送失败不阻断主流程（mailService 内部已降级处理）
  await mailService.sendCodeMail(email, code, purpose, config.emailCode.expireMinutes);

  const result = { expires_in: config.emailCode.expireMinutes * 60 };
  if (config.smtp.devEcho) result.dev_code = code;
  return result;
}

/**
 * 校验验证码：错误 attempts+1（满 5 作废）；正确则作废并放行。
 * @param {string} email
 * @param {'register'|'reset_password'|'bind_email'} purpose
 * @param {string} code 用户输入的验证码
 * @returns {boolean} 校验通过返回 true，否则抛 40907
 */
function verify(email, purpose, code) {
  const active = emailCodeModel.findLatestActive(email, purpose);
  if (!active) {
    throw new ApiError(ERR.EMAIL_CODE_INVALID, '验证码不正确或已失效，请重新获取', 400);
  }
  if (Date.parse(active.expires_at) <= Date.now()) {
    emailCodeModel.consume(active.id);
    throw new ApiError(ERR.EMAIL_CODE_INVALID, '验证码已过期，请重新获取', 400);
  }
  if (active.code !== code) {
    emailCodeModel.increaseAttempts(active.id, config.emailCode.maxAttempts);
    const remain = config.emailCode.maxAttempts - (active.attempts + 1);
    throw new ApiError(
      ERR.EMAIL_CODE_INVALID,
      remain > 0 ? `验证码不正确（还可尝试 ${remain} 次）` : '验证码错误次数过多，已失效，请重新获取',
      400
    );
  }
  // 校验成功：一次性作废
  emailCodeModel.consume(active.id);
  return true;
}

module.exports = { send, verify, EMAIL_CODE_PURPOSE };
