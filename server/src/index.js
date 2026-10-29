/**
 * 进程入口：初始化数据库与种子数据，启动 HTTP 服务，并启动活动提醒定时任务。
 */
const config = require('./config');
require('./db/connection'); // 打开数据库并执行建表 DDL
const { runSeed } = require('./db/seed');
const app = require('./app');

// 首次启动自动写入管理员账号与预置分类
runSeed();

app.listen(config.port, () => {
  console.log(`[server] 校园活动报名系统后端已启动：http://localhost:${config.port}`);
  console.log(`[server] API 前缀：http://localhost:${config.port}/api/v1`);
});

// 活动提醒定时任务（v4）：每 5 分钟扫描一次即将开始/即将截止的活动。
// 幂等（reminder_logs 防重复），提醒窗口默认 60 分钟，可用环境变量调整。
if (!process.env.DISABLE_REMINDER) {
  const reminderService = require('./services/reminderService');
  const INTERVAL_MS = parseInt(process.env.REMINDER_INTERVAL_MS, 10) || 5 * 60 * 1000;
  reminderService.runAll(); // 启动即跑一轮
  setInterval(() => reminderService.runAll(), INTERVAL_MS).unref();
  console.log(`[server] 活动提醒任务已启动（每 ${INTERVAL_MS / 1000} 秒）`);
}
