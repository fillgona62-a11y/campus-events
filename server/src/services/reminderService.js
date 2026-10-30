/**
 * 活动提醒服务：定时扫描即将开始/即将截止的活动，给报名成功用户发站内信 + 邮件。
 * 幂等：reminder_logs 记录已发送，避免重复通知。
 *
 * 两种提醒：
 *  - start（开始提醒）：活动开始前 REMINDER_START_WINDOW 分钟内，通知已报名用户。
 *  - deadline（截止提醒）：报名截止前 REMINDER_DEADLINE_WINDOW 分钟内，通知已报名用户。
 */
const eventModel = require('../models/eventModel');
const registrationModel = require('../models/registrationModel');
const reminderModel = require('../models/reminderModel');
const notificationService = require('./notificationService');
const mailService = require('./mailService');
const { NOTIFICATION_TYPE } = require('../utils/constants');

const START_WINDOW_MIN = parseInt(process.env.REMINDER_START_WINDOW_MIN, 10) || 60;
const DEADLINE_WINDOW_MIN = parseInt(process.env.REMINDER_DEADLINE_WINDOW_MIN, 10) || 60;

/** 给一批用户发站内信 + 邮件（邮件失败不阻断，站内信为主） */
function notifyUsers(users, type, title, content, emailSubject, emailText) {
  for (const u of users) {
    notificationService.send(u.user_id, type, title, content);
    if (u.email) {
      mailService.sendReminderMail(u.email, emailSubject, emailText).catch(() => {});
    }
  }
}

/** 扫描并发送「活动开始」提醒 */
function runStartReminders() {
  const events = eventModel.listStartingSoon(START_WINDOW_MIN);
  for (const ev of events) {
    if (reminderModel.hasSent(ev.id, 'start')) continue;
    const users = registrationModel.listApprovedWithEmail(ev.id);
    if (!users.length) {
      reminderModel.markSent(ev.id, 'start'); // 无人报名也标记，避免反复扫描
      continue;
    }
    const title = '活动即将开始';
    const content = `您报名的活动「${ev.title}」将于 ${fmtTime(ev.start_time)} 开始，请准时参加。`;
    notifyUsers(
      users,
      NOTIFICATION_TYPE.EVENT_REMINDER,
      title,
      content,
      `【校园活动】「${ev.title}」即将开始`,
      `您报名的活动「${ev.title}」将于 ${fmtTime(ev.start_time)} 开始，地点：${ev.location}，请准时参加。`
    );
    reminderModel.markSent(ev.id, 'start');
    console.log(`[reminder] 活动开始提醒已发送：${ev.title}（${users.length} 人）`);
  }
}

/** 扫描并发送「报名截止」提醒 */
function runDeadlineReminders() {
  const events = eventModel.listDeadlineSoon(DEADLINE_WINDOW_MIN);
  for (const ev of events) {
    if (reminderModel.hasSent(ev.id, 'deadline')) continue;
    const users = registrationModel.listApprovedWithEmail(ev.id);
    if (!users.length) {
      reminderModel.markSent(ev.id, 'deadline');
      continue;
    }
    const title = '报名即将截止';
    const content = `您报名的活动「${ev.title}」报名即将截止，请注意时间安排。`;
    notifyUsers(
      users,
      NOTIFICATION_TYPE.DEADLINE_REMINDER,
      title,
      content,
      `【校园活动】「${ev.title}」报名即将截止`,
      `您报名的活动「${ev.title}」报名将于 ${fmtTime(ev.signup_deadline)} 截止。`
    );
    reminderModel.markSent(ev.id, 'deadline');
    console.log(`[reminder] 报名截止提醒已发送：${ev.title}（${users.length} 人）`);
  }
}

/** 跑一轮全部提醒（定时任务入口） */
function runAll() {
  try {
    runStartReminders();
    runDeadlineReminders();
  } catch (err) {
    console.error('[reminder] 提醒任务执行失败：', err.message);
  }
}

/** 格式化为本地可读时间（服务器本地时区） */
function fmtTime(iso) {
  try {
    return new Date(iso).toLocaleString('zh-CN', { hour12: false });
  } catch {
    return iso;
  }
}

module.exports = { runAll, START_WINDOW_MIN, DEADLINE_WINDOW_MIN };
