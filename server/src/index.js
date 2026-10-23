/**
 * 进程入口：初始化数据库与种子数据，启动 HTTP 服务。
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
