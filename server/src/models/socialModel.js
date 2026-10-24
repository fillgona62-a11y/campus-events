/**
 * 论坛社交模型：帖子点赞 / 收藏 / 用户关注。
 * 点赞/收藏/关注均用 UNIQUE 约束保证"一人一次"；重复插入静默失败（返回 false）。
 */
const db = require('../db/connection');

function _insert(sql, ...params) {
  try {
    db.prepare(sql).run(...params, new Date().toISOString());
    return true;
  } catch {
    return false; // UNIQUE 冲突 = 已存在
  }
}

// ── 点赞 ──
function likePost(postId, userId) {
  return _insert('INSERT INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, ?)', postId, userId);
}
function unlikePost(postId, userId) {
  return db.prepare('DELETE FROM post_likes WHERE post_id = ? AND user_id = ?').run(postId, userId).changes > 0;
}
function isLiked(postId, userId) {
  return !!db.prepare('SELECT 1 FROM post_likes WHERE post_id = ? AND user_id = ?').get(postId, userId);
}

// ── 收藏 ──
function favoritePost(postId, userId) {
  return _insert('INSERT INTO post_favorites (post_id, user_id, created_at) VALUES (?, ?, ?)', postId, userId);
}
function unfavoritePost(postId, userId) {
  return db.prepare('DELETE FROM post_favorites WHERE post_id = ? AND user_id = ?').run(postId, userId).changes > 0;
}
function isFavorited(postId, userId) {
  return !!db.prepare('SELECT 1 FROM post_favorites WHERE post_id = ? AND user_id = ?').get(postId, userId);
}

// ── 关注 ──
function follow(followerId, followeeId) {
  if (Number(followerId) === Number(followeeId)) return false; // 不能关注自己
  return _insert('INSERT INTO user_follows (follower_id, followee_id, created_at) VALUES (?, ?, ?)', followerId, followeeId);
}
function unfollow(followerId, followeeId) {
  return db.prepare('DELETE FROM user_follows WHERE follower_id = ? AND followee_id = ?').run(followerId, followeeId).changes > 0;
}
function isFollowing(followerId, followeeId) {
  return !!db.prepare('SELECT 1 FROM user_follows WHERE follower_id = ? AND followee_id = ?').get(followerId, followeeId);
}

// ── 批量查询某用户对一组帖子的点赞/收藏状态（列表页点亮图标用）──
function likedPostIds(userId, postIds) {
  if (!userId || !postIds || !postIds.length) return new Set();
  const placeholders = postIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT post_id AS pid FROM post_likes WHERE user_id = ? AND post_id IN (${placeholders})`)
    .all(userId, ...postIds);
  return new Set(rows.map((r) => r.pid));
}
function favoritedPostIds(userId, postIds) {
  if (!userId || !postIds || !postIds.length) return new Set();
  const placeholders = postIds.map(() => '?').join(',');
  const rows = db
    .prepare(`SELECT post_id AS pid FROM post_favorites WHERE user_id = ? AND post_id IN (${placeholders})`)
    .all(userId, ...postIds);
  return new Set(rows.map((r) => r.pid));
}

/** 我的收藏帖子（分页，含作者信息） */
function listFavorites(userId, { page = 1, page_size = 10 }) {
  const total = db.prepare('SELECT COUNT(*) AS c FROM post_favorites WHERE user_id = ?').get(userId).c;
  const list = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.student_id AS author_student_id, u.id AS author_id
       FROM post_favorites f JOIN posts p ON p.id = f.post_id JOIN users u ON u.id = p.author_id
       WHERE f.user_id = ? AND p.status = 'active' ORDER BY f.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(userId, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

/** 我点赞过的帖子（分页） */
function listLiked(userId, { page = 1, page_size = 10 }) {
  const total = db.prepare('SELECT COUNT(*) AS c FROM post_likes WHERE user_id = ?').get(userId).c;
  const list = db
    .prepare(
      `SELECT p.*, u.name AS author_name, u.student_id AS author_student_id, u.id AS author_id
       FROM post_likes l JOIN posts p ON p.id = l.post_id JOIN users u ON u.id = p.author_id
       WHERE l.user_id = ? AND p.status = 'active' ORDER BY l.created_at DESC LIMIT ? OFFSET ?`
    )
    .all(userId, page_size, (page - 1) * page_size);
  return { list, total, page, page_size };
}

module.exports = {
  likePost,
  unlikePost,
  isLiked,
  favoritePost,
  unfavoritePost,
  isFavorited,
  follow,
  unfollow,
  isFollowing,
  likedPostIds,
  favoritedPostIds,
  listFavorites,
  listLiked,
};
