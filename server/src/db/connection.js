/**
 * better-sqlite3 连接管理：WAL 模式、外键开启、启动时自动执行建表 DDL。
 * 全应用共享同一个同步连接实例（SQLite 单写者串行化，无需连接池）。
 */
const fs = require('fs');
const path = require('path');
const Database = require('better-sqlite3');
const config = require('../config');

// 确保数据库目录存在
fs.mkdirSync(path.dirname(config.dbPath), { recursive: true });

const db = new Database(config.dbPath);

// WAL 提升读写并发；开启外键约束
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// 启动即执行建表语句（幂等，CREATE ... IF NOT EXISTS）
const schemaSql = fs.readFileSync(path.join(__dirname, 'schema.sql'), 'utf-8');
db.exec(schemaSql);

module.exports = db;

// 存量库幂等迁移：必须放在 module.exports 赋值之后，
// 这样 migrate.js 里 require('./connection') 拿到的是已赋值的 db，避开循环依赖
require('./migrate').runMigrations();
