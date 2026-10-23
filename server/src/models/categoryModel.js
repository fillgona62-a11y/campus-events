/**
 * 分类模型：categories 表只读列表（预置种子数据，本期不提供管理界面）。
 */
const db = require('../db/connection');

function listAll() {
  return db.prepare('SELECT id, name FROM categories ORDER BY sort ASC, id ASC').all();
}

function findById(id) {
  return db.prepare('SELECT id, name FROM categories WHERE id = ?').get(id);
}

module.exports = { listAll, findById };
