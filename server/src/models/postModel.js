/**
 * 论坛帖子模型：posts 表 SQL 封装（better-sqlite3 全参数化）。
 */
const db = require('../db/connection');

const AUTHOR_COLS = 'u.id AS author_id, u.name AS author_name, u.student_id AS author_student_id';

/** 新建帖子（status=active） */
function create({ author_id, title, content, media = null, topics = null }) {
  const now = new Date().toISOString();
  const info = db
    .prepare(
      `INSERT INTO posts (author_id, title, content, media, topics, status, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, 'active', ?, ?)`
    )
    .run(author_id, title, content, media, topics, now, now);
  return findById(info.lastInsertRowid);
}

/** 编辑帖子（仅更新内容字段，不动计数） */
function update(id, { title, content, media = null, topics = null }) {
  const now = new Date().toISOString();
  db.prepare(
    `UPDATE posts SET title = ?, content = ?, media = ?, topics = ?, updated_at = ? WHERE id = ?`
  ).run(title, content, media, topics, now, id);
  return findById(id);
}

/** 详情（含作者信息） */
function findById(id) {
  return db
    .prepare(`SELECT p.*, ${AUTHOR_COLS} FROM posts p JOIN users u ON u.id = p.author_id WHERE p.id = ?`)
    .get(id);
}

/** 信息流：分页 + 排序(latest|hot) + 话题/关键字筛选 + 可选作者 */
function list({ page = 1, page_size = 10, sort = 'latest', topic, keyword, author_id } = {}) {
  const conds = ["p.status = 'active'"];
  const params = [];
  if (author_id) {
    conds.push('p.author_id = ?');
    params.push(author_id);
  }
  if (topic) {
    const esc = String(topic).replace(/[\\%_]/g, (c) => `\\${c}`);
    conds.push("(',' || IFNULL(p.topics,'') || ',') LIKE ? ESCAPE '\\'");
    params.push(`%,${esc},%`);
  }
  if (keyword) {
    conds.push('(p.title LIKE ? OR p.content LIKE ?)');
    params.push(`%${keyword}%`, `%${keyword}%`);
  }
  const where = conds.join(' AND ');
  const total = db.prepare(`SELECT COUNT(*) AS c FROM posts p WHERE ${where}`).get(...params).c;
  const order =
    sort === 'hot'
      ? 'p.is_pinned DESC, (p.like_count + p.comment_count * 2) DESC, p.created_at DESC'
      : 'p.is_pinned DESC, p.created_at DESC';
  const list = db
    .prepare(
      `SELECT p.*, ${AUTHOR_COLS} FROM posts p JOIN users u ON u.id = p.author_id
       WHERE ${where} ORDER BY ${order} LIMIT ? OFFSET ?`
    )
    .all(...params, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 置顶/取消置顶（pinned 为真时记录 pinned_at，否则清空） */
function setPinned(id, pinned) {
  const now = new Date().toISOString();
  db.prepare('UPDATE posts SET is_pinned = ?, pinned_at = ?, updated_at = ? WHERE id = ?').run(
    pinned ? 1 : 0,
    pinned ? now : null,
    now,
    id
  );
}

/** 软删除 */
function softDelete(id) {
  return db
    .prepare("UPDATE posts SET status = 'deleted', updated_at = ? WHERE id = ?")
    .run(new Date().toISOString(), id).changes;
}

function incView(id) {
  db.prepare('UPDATE posts SET view_count = view_count + 1 WHERE id = ?').run(id);
}
function incCommentCount(id, delta) {
  db.prepare('UPDATE posts SET comment_count = comment_count + ? WHERE id = ?').run(delta, id);
}
function incLikeCount(id, delta) {
  db.prepare('UPDATE posts SET like_count = like_count + ? WHERE id = ?').run(delta, id);
}
function incFavoriteCount(id, delta) {
  db.prepare('UPDATE posts SET favorite_count = favorite_count + ? WHERE id = ?').run(delta, id);
}

module.exports = {
  create,
  update,
  findById,
  list,
  setPinned,
  softDelete,
  incView,
  incCommentCount,
  incLikeCount,
  incFavoriteCount,
};
