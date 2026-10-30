/**
 * 邮件服务：nodemailer 传输器懒创建 + 验证码邮件文本模板。
 * - SMTP_DEV_ECHO=1：不发真实邮件，验证码仅在服务器日志回显（开发/演示用）。
 * - 未配置 SMTP（无 user/authCode）时不创建 transport，避免启动报错。
 * - 真实发送失败（网络/授权码错误）只记日志，不阻断主流程
 *   （验证码已落库，用户可重发；此决策防止 SMTP 抖动打挂账户体系）。
 */
const nodemailer = require('nodemailer');
const config = require('../config');

let transporter = null;

/**
 * 懒创建 SMTP 传输器：DEV_ECHO 或未配置 SMTP 时返回 null。
 * @returns {import('nodemailer').Transporter|null}
 */
function getTransporter() {
  if (transporter) return transporter;
  if (config.smtp.devEcho || !config.smtp.user || !config.smtp.authCode) {
    return null;
  }
  transporter = nodemailer.createTransport({
    host: config.smtp.host,
    port: config.smtp.port,
    secure: config.smtp.secure,
    auth: { user: config.smtp.user, pass: config.smtp.authCode },
  });
  return transporter;
}

/**
 * 发送验证码邮件（纯文本模板，不引模板引擎）。
 * DEV_ECHO=1 时日志回显验证码；真实发送失败只 console.error，不抛出。
 *
 * @param {string} email 收件邮箱
 * @param {string} code 6 位验证码
 * @param {'register'|'reset_password'|'bind_email'} purpose 用途
 * @param {number} expireMinutes 有效期（分钟）
 * @returns {Promise<{sent:boolean, devEcho:boolean}>}
 */
async function sendCodeMail(email, code, purpose, expireMinutes) {
  const subjectMap = {
    register: '【校园活动报名系统】注册验证码',
    reset_password: '【校园活动报名系统】找回密码验证码',
    bind_email: '【校园活动报名系统】绑定邮箱验证码',
  };
  const subject = subjectMap[purpose] || '【校园活动报名系统】验证码';
  const text = `${subject}\n\n您的验证码是：${code}\n有效期 ${expireMinutes} 分钟，请勿泄露给他人。\n如非本人操作，请忽略本邮件。\n\n校园活动报名系统`;

  if (config.smtp.devEcho) {
    // 开发模式：不发真邮件，日志回显（接口响应体也会带 dev_code）
    console.log(`[mail][DEV_ECHO] 验证码邮件（未真实发送）→ ${email}：${code}（${purpose}）`);
    return { sent: true, devEcho: true };
  }

  const transport = getTransporter();
  if (!transport) {
    console.error('[mail] SMTP 未配置（SMTP_USER/SMTP_AUTH_CODE），验证码邮件未发送');
    return { sent: false, devEcho: false };
  }

  try {
    await transport.sendMail({
      from: config.smtp.from,
      to: email,
      subject,
      text,
    });
    return { sent: true, devEcho: false };
  } catch (err) {
    // 发送失败不阻断主流程：验证码已落库，用户可重发
    console.error(`[mail] 验证码邮件发送失败（${email}）：`, err.message);
    return { sent: false, devEcho: false };
  }
}

/**
 * 发送提醒邮件（活动开始/报名截止提醒）。
 * 与验证码邮件共用 transport；DEV_ECHO 或未配置 SMTP 时仅日志、不抛错。
 * @param {string} email 收件邮箱
 * @param {string} subject 主题
 * @param {string} text 正文
 */
async function sendReminderMail(email, subject, text) {
  if (config.smtp.devEcho) {
    console.log(`[mail][DEV_ECHO] 提醒邮件（未真实发送）→ ${email}：${subject}`);
    return { sent: true, devEcho: true };
  }
  const transport = getTransporter();
  if (!transport) return { sent: false, devEcho: false };
  try {
    await transport.sendMail({ from: config.smtp.from, to: email, subject, text });
    return { sent: true, devEcho: false };
  } catch (err) {
    console.error(`[mail] 提醒邮件发送失败（${email}）：`, err.message);
    return { sent: false, devEcho: false };
  }
}

module.exports = { sendCodeMail, sendReminderMail };
