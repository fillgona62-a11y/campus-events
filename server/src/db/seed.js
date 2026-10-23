/**
 * 种子数据：初始化管理员账号与预置活动分类。
 * 幂等：管理员仅在不存在时创建；分类按名称 INSERT OR IGNORE。
 * 服务启动时自动调用，也可通过 `npm run seed` 单独执行。
 */
const bcrypt = require('bcryptjs');
const db = require('./connection');
const config = require('../config');

/** 预置分类（按 sort 排序展示） */
const CATEGORIES = ['讲座', '社团', '体育', '文艺', '志愿', '其他'];

function runSeed() {
  const now = new Date().toISOString();

  const seedTx = db.transaction(() => {
    // 1. 预置分类
    const insertCategory = db.prepare(
      'INSERT OR IGNORE INTO categories (name, sort) VALUES (?, ?)'
    );
    CATEGORIES.forEach((name, index) => {
      insertCategory.run(name, index + 1);
    });

    // 2. 初始管理员（不存在时创建）
    const existAdmin = db
      .prepare('SELECT id FROM users WHERE student_id = ?')
      .get(config.admin.studentId);
    if (!existAdmin) {
      const passwordHash = bcrypt.hashSync(config.admin.password, 10);
      db.prepare(
        `INSERT INTO users (student_id, name, phone, password_hash, role, status, created_at)
         VALUES (?, ?, NULL, ?, 'admin', 'active', ?)`
      ).run(config.admin.studentId, config.admin.name, passwordHash, now);
      console.log(`[seed] 已创建初始管理员账号：${config.admin.studentId}`);
    }
  });

  seedTx();
  console.log('[seed] 种子数据初始化完成');
}

// 支持 node src/db/seed.js 单独执行
if (require.main === module) {
  runSeed();
}

module.exports = { runSeed };
