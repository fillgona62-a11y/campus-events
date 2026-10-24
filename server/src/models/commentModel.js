/**
 * 论坛评论模型：comments 表 SQL 封装。
 * parent_id=0 为主评论；>0 为对某条评论的回复（parent_user_name 供前端展示"回复 @X"）。
 */
const db = require('../db/connection');

function create({ post_id, user_id, parent_id = 0, content }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO comments (post_id, user_id, parent_id, content, status, created_at)
       VALUES (?, ?, ?, ?, 'active', ?)`
    )
    .run(post_id, user_id, parent_id, content, now);
  return findById(info.lastInsertRowid);
}

function findById(id) {
  return db
    .prepare(
      `SELECT c.*, u.name AS user_name, u.student_id AS user_student_id
       FROM comments c JOIN users u ON u.id = c.user_id WHERE c.id = ?`
    )
    .get(id);
}

/** 某帖全部评论（含回复），按时间正序 */
function listByPost(postId) {
  return db
    .prepare(
      `SELECT c.*, u.name AS user_name, u.student_id AS user_student_id,
              pu.name AS parent_user_name
       FROM comments c
       JOIN users u ON u.id = c.user_id
       LEFT JOIN comments pc ON pc.id = c.parent_id
       LEFT JOIN users pu ON pu.id = pc.user_id
       WHERE c.post_id = ? AND c.status = 'active'
       ORDER BY c.created_at ASC, c.id ASC`
    )
    .all(postId);
}

/** 软删除（限作者/管理员由上层校验） */
function softDelete(id) {
  return db.prepare("UPDATE comments SET status = 'deleted' WHERE id = ?").run(id).changes;
}

/** 我的评论（分页，带帖子标题） */
function listByUser(userId, { page = 1, page_size = 10 }) {
  const total = db
    .prepare("SELECT COUNT(*) AS c FROM comments WHERE user_id = ? AND status = 'active'")
    .get(userId).c;
  const list = db
    .prepare(
      `SELECT c.*, p.title AS post_title FROM comments c JOIN posts p ON p.id = c.post_id
       WHERE c.user_id = ? AND c.status = 'active' ORDER BY c.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(userId, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

module.exports = { create, findById, listByPost, listByUser, softDelete };
