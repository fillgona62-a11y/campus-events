/**
 * 管理后台路由：全部需登录且为管理员。
 */
const express = require('express');
const { z } = require('zod');
const adminController = require('../controllers/adminController');
const { requireAuth, requireAdmin } = require('../middleware/auth');
const { validate } = require('../middleware/validate');

const router = express.Router();

// 全局守卫：登录 + 管理员
router.use(requireAuth, requireAdmin);

const reviewSchema = z
  .object({
    action: z.enum(['approve', 'reject'], {
      errorMap: () => ({ message: 'action 仅支持 approve / reject' }),
    }),
    reason: z.string().trim().max(200, '拒绝理由最多 200 字').optional(),
  })
  .refine((d) => d.action !== 'reject' || (d.reason && d.reason.length > 0), {
    message: '拒绝时请填写理由',
    path: ['reason'],
  });

const userStatusSchema = z.object({
  status: z.enum(['active', 'disabled'], {
    errorMap: () => ({ message: 'status 仅支持 active / disabled' }),
  }),
});

router.get('/overview', adminController.overview);
router.get('/overview/trend', adminController.overviewTrend);
router.get('/events', adminController.listEvents);
router.put('/events/:id/review', validate(reviewSchema), adminController.reviewEvent);
router.put('/events/:id/offline', adminController.offlineEvent);
router.get('/users', adminController.listUsers);
router.put('/users/:id/status', validate(userStatusSchema), adminController.setUserStatus);
router.put('/users/:id/password/reset', adminController.resetUserPassword);
router.get('/audit-logs', adminController.listAuditLogs);
router.delete('/posts/:id', adminController.deletePost);
router.delete('/comments/:id', adminController.deleteComment);

module.exports = router;
