/**
 * 报名路由：取消报名、发布者审核、我的报名。
 */
const express = require('express');
const { z } = require('zod');
const registrationController = require('../controllers/registrationController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const reviewSchema = z.object({
  action: z.enum(['approve', 'reject'], {
    errorMap: () => ({ message: 'action 仅支持 approve / reject' }),
  }),
});

router.get('/my/registrations', requireAuth, registrationController.myRegistrations);
router.post(
  '/registrations/:id/cancel',
  requireAuth,
  actionLimiter,
  registrationController.cancel
);
router.put(
  '/registrations/:id/review',
  requireAuth,
  actionLimiter,
  validate(reviewSchema),
  registrationController.review
);
// 候补手动提升 / 移出（发布者/管理员；权限在服务层校验）
router.put(
  '/registrations/:id/waitlist/promote',
  requireAuth,
  actionLimiter,
  registrationController.promoteWaitlist
);
router.post(
  '/registrations/:id/waitlist/remove',
  requireAuth,
  actionLimiter,
  registrationController.removeWaitlist
);

module.exports = router;
