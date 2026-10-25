/**
 * 论坛控制器：帖子/评论/点赞/收藏/关注/我的。读可选登录(optionalAuth)，写需登录+限流。
 */
const forumService = require('../services/forumService');
const socialModel = require('../models/socialModel');
const { ApiError, ok } = require('../utils/response');
const { parseId, parsePagination } = require('../middleware/validate');

function listPosts(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(
      res,
      forumService.listPosts(req.user || null, {
        page,
        page_size,
        sort: req.query.sort === 'hot' ? 'hot' : 'latest',
        topic: req.query.topic ? String(req.query.topic) : undefined,
        keyword: req.query.keyword ? String(req.query.keyword).trim() : undefined,
        author_id: req.query.author_id ? Number(req.query.author_id) || undefined : undefined,
      })
    );
  } catch (err) {
    next(err);
  }
}

function getPost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, forumService.getPost(req.user || null, id));
  } catch (err) {
    next(err);
  }
}

function createPost(req, res, next) {
  try {
    ok(res, { post: forumService.createPost(req.user, req.body) }, '发布成功');
  } catch (err) {
    next(err);
  }
}

function updatePost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, { post: forumService.updatePost(req.user, id, req.body) }, '已保存');
  } catch (err) {
    next(err);
  }
}

function deletePost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    forumService.deletePost(req.user, id);
    ok(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

function pinPost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, { post: forumService.togglePin(req.user, id) });
  } catch (err) {
    next(err);
  }
}

function addComment(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, { comment: forumService.addComment(req.user, id, req.body) }, '评论成功');
  } catch (err) {
    next(err);
  }
}

function deleteComment(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('评论 ID 不合法');
    forumService.deleteComment(req.user, id);
    ok(res, null, '已删除');
  } catch (err) {
    next(err);
  }
}

function likePost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, forumService.toggleLike(req.user, id));
  } catch (err) {
    next(err);
  }
}

function favoritePost(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('帖子 ID 不合法');
    ok(res, forumService.toggleFavorite(req.user, id));
  } catch (err) {
    next(err);
  }
}

function followUser(req, res, next) {
  try {
    ok(res, forumService.toggleFollow(req.user, req.params.id));
  } catch (err) {
    next(err);
  }
}

function myPosts(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(res, forumService.myPosts(req.user, { page, page_size }));
  } catch (err) {
    next(err);
  }
}

function myCommentsList(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(res, forumService.myComments(req.user, { page, page_size }));
  } catch (err) {
    next(err);
  }
}

function myFavorites(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(res, socialModel.listFavorites(req.user.id, { page, page_size }));
  } catch (err) {
    next(err);
  }
}

function myLikes(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(res, socialModel.listLiked(req.user.id, { page, page_size }));
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listPosts,
  getPost,
  createPost,
  updatePost,
  deletePost,
  pinPost,
  addComment,
  deleteComment,
  likePost,
  favoritePost,
  followUser,
  myPosts,
  myComments: myCommentsList,
  myFavorites,
  myLikes,
};
