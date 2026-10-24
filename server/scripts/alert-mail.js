#!/usr/bin/env node
/**
 * alert-mail.js — 运维告警邮件（探活脚本调用）。
 *
 * 用法（必须在应用根目录执行，否则 dotenv 读不到 .env）：
 *   cd ~/campus-events-online
 *   node server/scripts/alert-mail.js "标题" "正文" [收件人]
 *
 * 未配置 SMTP 时静默退出（不抛错），避免把探活脚本本身搞挂。
 */
const config = require('../src/config');
const nodemailer = require('nodemailer');

const [, , subject, body, toArg] = process.argv;
const to = toArg || config.smtp.user;

if (!subject) {
  console.error('[alert] usage: node alert-mail.js <subject> <body> [to]');
  process.exit(1);
}
if (!config.smtp.user || !config.smtp.authCode) {
  console.error('[alert] SMTP 未配置，告警邮件未发送');
  process.exit(1);
}

const transporter = nodemailer.createTransport({
  host: config.smtp.host,
  port: config.smtp.port,
  secure: config.smtp.secure,
  auth: { user: config.smtp.user, pass: config.smtp.authCode },
});

transporter
  .sendMail({
    from: config.smtp.from,
    to,
    subject,
    text: `${body}\n\n—— 校园活动报名系统 运维告警（服务器 ${require('os').hostname()}）`,
  })
  .then(() => console.log('[alert] 告警邮件已发送给 ' + to))
  .catch((err) => {
    console.error('[alert] 告警邮件发送失败：', err.message);
    process.exit(1);
  });
