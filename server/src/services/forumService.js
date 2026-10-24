/**
 * 论坛业务服务：帖子/评论/点赞/收藏/关注 的编排 + 内容净化 + 媒体校验 + 站内信联动。
 * 净化白名单照抄 eventService.sanitizeDescription（图片仅限站内 /uploads/）；
 * 视频不走富文本、改存 media JSON，由前端 VideoEmbed 组件安全渲染（避免用户内容里放 iframe）。
 */
const sanitizeHtml = require('sanitize-html');
const postModel = require('../models/postModel');
const commentModel = require('../models/commentModel');
const socialModel = require('../models/socialModel');
const userModel = require('../models/userModel');
const notificationService = require('./notificationService');
const { ApiError } = require('../utils/response');
const { mask: maskSensitive } = require('../utils/sensitiveWords');

const NOTIFY_TYPE = 'forum';
const VIDEO_EXT = /\.(mp4|webp|mov|m4v)$/i;
const EMBED_HOSTS = [
  'bilibili.com',
  'www.bilibili.com',
  'm.bilibili.com',
  'youtube.com',
  'www.youtube.com',
  'youtu.be',
];
const MAX_VIDEOS = 5;

/** 富文本净化：白名单 + 站内图片 + 敏感词掩码（照抄 eventService 思路） */
function sanitizeContent(html) {
  if (!html) return '';
  const clean = sanitizeHtml(html, {
    allowedTags: ['p', 'br', 'b', 'i', 'strong', 'em', 'u', 'ul', 'ol', 'li', 'a', 'h1', 'h2', 'h3', 'h4', 'blockquote', 'img'],
    allowedAttributes: { a: ['href', 'target', 'rel'], img: ['src', 'alt'] },
    allowedSchemes: ['http', 'https'],
    exclusiveFilter: (frame) => {
      if (frame.tag === 'img') {
        const src = frame.attribs.src || '';
        return !src.startsWith('/uploads/');
      }
      return false;
    },
  });
  return maskSensitive(clean);
}

/** 评论内容净化（纯文本，转义后按段落） */
function sanitizeComment(text) {
  const clean = sanitizeHtml(text || '', {
    allowedTags: ['p', 'br', 'b', 'strong', 'em'],
    allowedAttributes: {},
  });
  return maskSensitive(clean);
}

/** 校验并规范化 media.videos：upload 仅限站内视频扩展名；embed 仅限 B站/YouTube */
function parseVideos(media) {
  if (!media || !Array.isArray(media.videos)) return null;
  const videos = [];
  for (const v of media.videos.slice(0, MAX_VIDEOS)) {
    if (!v || typeof v.url !== 'string') continue;
    const url = v.url.trim();
    if (v.type === 'upload') {
      if (url.startsWith('/uploads/') && VIDEO_EXT.test(url)) videos.push({ type: 'upload', url });
    } else if (v.type === 'embed') {
      try {
        const u = new URL(url);
        if (EMBED_HOSTS.includes(u.hostname)) videos.push({ type: 'embed', url });
      } catch {
        /* 非法 URL 忽略 */
      }
    }
  }
  return videos.length ? JSON.stringify({ videos }) : null;
}

function notify(userId, title, content) {
  if (!userId) return;
  try {
    notificationService.send(userId, NOTIFY_TYPE, title, content);
  } catch {
    /* 通知失败不影响主流程 */
  }
}

/** 从文本提取 @姓名（去标签后匹配，2-20 位中英文/数字/_-） */
function extractMentions(text) {
  const plain = stripTags(text || '');
  return [...new Set([...plain.matchAll(/@([\u4e00-\u9fa5A-Za-z0-9_-]{2,20})/g)].map((m) => m[1]))];
}

/** @提及联动站内信：通知被@到的用户（不含自己） */
function notifyMentions(text, actorId) {
  const names = extractMentions(text);
  if (!names.length) return;
  const users = userModel.findByNames(names);
  for (const u of users) {
    if (u.id !== actorId) notify(u.id, '有人@了你', '在论坛的帖子/评论中提到了你，去看看吧');
  }
}

function parseTopics(topics) {
  if (!Array.isArray(topics)) return null;
  const seen = new Set();
  const cleaned = [];
  for (const t of topics) {
    const v = String(t || '').trim().slice(0, 20);
    if (v && !seen.has(v)) {
      seen.add(v);
      cleaned.push(v);
    }
    if (cleaned.length >= 5) break;
  }
  return cleaned.length ? cleaned.join(',') : null;
}

// ── 帖子 ──
function createPost(user, { title, content, media, topics }) {
  const post = postModel.create({
    author_id: user.id,
    title: String(title).trim(),
    content: sanitizeContent(content),
    media: parseVideos(media),
    topics: parseTopics(topics),
  });
  notifyMentions(content, user.id);
  return post;
}

function updatePost(user, id, { title, content, media, topics }) {
  const post = postModel.findById(id);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在');
  if (post.author_id !== user.id) throw ApiError.forbidden('只能编辑自己的帖子');
  return postModel.update(id, {
    title: String(title).trim(),
    content: sanitizeContent(content),
    media: parseVideos(media),
    topics: parseTopics(topics),
  });
}

function deletePost(user, id) {
  const post = postModel.findById(id);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在');
  if (post.author_id !== user.id && user.role !== 'admin') throw ApiError.forbidden('无权删除该帖子');
  postModel.softDelete(id);
}

function getPost(user, id) {
  const post = postModel.findById(id);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在或已删除');
  postModel.incView(id);
  const comments = commentModel.listByPost(id);
  const uid = user ? user.id : null;
  return {
    post: decorate(post, uid),
    comments,
    liked: uid ? socialModel.isLiked(id, uid) : false,
    favorited: uid ? socialModel.isFavorited(id, uid) : false,
    following: uid && post.author_id !== uid ? socialModel.isFollowing(uid, post.author_id) : false,
  };
}

function listPosts(user, query) {
  const { list, total, page, page_size } = postModel.list(query);
  const uid = user ? user.id : null;
  const ids = list.map((p) => p.id);
  const liked = socialModel.likedPostIds(uid, ids);
  const favorited = socialModel.favoritedPostIds(uid, ids);
  const out = list.map((p) => decorate(p, uid, { liked: liked.has(p.id), favorited: favorited.has(p.id) }));
  return { list: out, total, page, page_size };
}

/** 给帖子附上媒体解析 + 当前用户互动标记 */
function decorate(post, uid, flags = {}) {
  let media = null;
  if (post.media) {
    try {
      media = JSON.parse(post.media);
    } catch {
      media = null;
    }
  }
  return {
    ...post,
    media,
    liked: flags.liked || null,
    favorited: flags.favorited || null,
  };
}

// ── 评论 ──
function addComment(user, postId, { content, parent_id = 0 }) {
  const post = postModel.findById(postId);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在或已删除');
  const pid = Number(parent_id) || 0;
  if (pid) {
    const parent = commentModel.findById(pid);
    if (!parent || parent.post_id !== postId) throw ApiError.badRequest('被回复的评论不存在');
  }
  const comment = commentModel.create({ post_id: postId, user_id: user.id, parent_id: pid, content: sanitizeComment(content) });
  postModel.incCommentCount(postId, 1);
  // 通知：帖子作者（回复时也可顺带提醒被回复者）
  if (post.author_id !== user.id) {
    notify(post.author_id, '有人评论了你的帖子', `《${post.title}》：${stripTags(comment.content).slice(0, 50)}`);
  }
  if (pid) {
    const parent = commentModel.findById(pid);
    if (parent && parent.user_id !== user.id && parent.user_id !== post.author_id) {
      notify(parent.user_id, '有人回复了你的评论', stripTags(comment.content).slice(0, 50));
    }
  }
  notifyMentions(content, user.id);
  return comment;
}

function deleteComment(user, id) {
  const comment = commentModel.findById(id);
  if (!comment || comment.status !== 'active') throw ApiError.notFound('评论不存在');
  if (comment.user_id !== user.id && user.role !== 'admin') throw ApiError.forbidden('无权删除该评论');
  commentModel.softDelete(id);
  postModel.incCommentCount(comment.post_id, -1);
}

function stripTags(html) {
  return String(html || '').replace(/<[^>]*>/g, '');
}

// ── 点赞 / 收藏 ──
function toggleLike(user, postId) {
  const post = postModel.findById(postId);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在或已删除');
  const liked = socialModel.isLiked(postId, user.id);
  if (liked) {
    socialModel.unlikePost(postId, user.id);
    postModel.incLikeCount(postId, -1);
    return { liked: false };
  }
  socialModel.likePost(postId, user.id);
  postModel.incLikeCount(postId, 1);
  if (post.author_id !== user.id) notify(post.author_id, '有人点赞了你的帖子', `《${post.title}》`);
  return { liked: true };
}

function toggleFavorite(user, postId) {
  const post = postModel.findById(postId);
  if (!post || post.status !== 'active') throw ApiError.notFound('帖子不存在或已删除');
  const fav = socialModel.isFavorited(postId, user.id);
  if (fav) {
    socialModel.unfavoritePost(postId, user.id);
    postModel.incFavoriteCount(postId, -1);
    return { favorited: false };
  }
  socialModel.favoritePost(postId, user.id);
  postModel.incFavoriteCount(postId, 1);
  return { favorited: true };
}

// ── 关注 ──
function toggleFollow(user, followeeId) {
  const fid = Number(followeeId);
  if (!fid) throw ApiError.badRequest('用户 ID 不合法');
  if (fid === user.id) throw ApiError.badRequest('不能关注自己');
  const following = socialModel.isFollowing(user.id, fid);
  if (following) {
    socialModel.unfollow(user.id, fid);
    return { following: false };
  }
  socialModel.follow(user.id, fid);
  notify(fid, '有人关注了你', '点击查看 Ta 的主页');
  return { following: true };
}

// ── 我的 ──
function myPosts(user, query) {
  return postModel.list({ ...query, author_id: user.id });
}
function myComments(user, query) {
  return commentModel.listByUser(user.id, query);
}

module.exports = {
  sanitizeContent,
  sanitizeComment,
  createPost,
  updatePost,
  deletePost,
  getPost,
  listPosts,
  addComment,
  deleteComment,
  toggleLike,
  toggleFavorite,
  toggleFollow,
  myPosts,
  myComments,
};
