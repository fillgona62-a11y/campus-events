/**
 * 论坛路由（挂 /api/v1/forum）：公开读 optionalAuth；写 requireAuth + actionLimiter + zod 校验。
 */
const express = require('express');
const { z } = require('zod');
const forumController = require('../controllers/forumController');
const { requireAuth, requireAdmin, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const videoSchema = z.object({
  type: z.enum(['upload', 'embed'], { errorMap: () => ({ message: '视频类型只能是 upload/embed' }) }),
  url: z.string().trim().min(1, '视频地址不能为空').max(500),
});
const postSchema = z.object({
  title: z.string().trim().min(1, '标题不能为空').max(80, '标题不超过 80 字'),
  content: z.string().max(20000).optional().default(''),
  media: z
    .object({ videos: z.array(videoSchema).max(5).optional().default([]) })
    .optional()
    .default({ videos: [] }),
  topics: z.array(z.string().trim().min(1).max(20)).max(5).optional().default([]),
});
const commentSchema = z.object({
  content: z.string().trim().min(1, '评论不能为空').max(1000, '评论不超过 1000 字'),
  parent_id: z.coerce.number().int().min(0).optional().default(0),
});

// 公开读
router.get('/posts', optionalAuth, forumController.listPosts);
router.get('/posts/:id', optionalAuth, forumController.getPost);
// 帖子写
router.post('/posts', requireAuth, actionLimiter, validate(postSchema), forumController.createPost);
router.put('/posts/:id', requireAuth, actionLimiter, validate(postSchema), forumController.updatePost);
router.delete('/posts/:id', requireAuth, forumController.deletePost);
// 置顶/取消置顶（管理员）
router.put('/posts/:id/pin', requireAuth, requireAdmin, forumController.pinPost);
// 互动
router.post('/posts/:id/like', requireAuth, actionLimiter, forumController.likePost);
router.post('/posts/:id/favorite', requireAuth, actionLimiter, forumController.favoritePost);
router.post('/posts/:id/comments', requireAuth, actionLimiter, validate(commentSchema), forumController.addComment);
router.delete('/comments/:id', requireAuth, forumController.deleteComment);
// 关注
router.post('/users/:id/follow', requireAuth, actionLimiter, forumController.followUser);
// 我的
router.get('/me/posts', requireAuth, forumController.myPosts);
router.get('/me/comments', requireAuth, forumController.myComments);
router.get('/me/favorites', requireAuth, forumController.myFavorites);
router.get('/me/likes', requireAuth, forumController.myLikes);

module.exports = router;
