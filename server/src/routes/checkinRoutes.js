/**
 * 核销路由（F4）：口令生成/查看、核销、核销统计，集中独立文件。
 * 全部需登录；口令生成/查看/统计限活动发布者或管理员（服务层校验）；
 * 核销接口供发布者/管理员在现场录入（学生不直接调用）。
 */
const express = require('express');
const { z } = require('zod');
const checkinController = require('../controllers/checkinController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

const checkinSchema = z.object({
  student_id: z.string({ required_error: '学号不能为空' }).trim().min(1, '学号不能为空').max(32),
  code: z
    .string({ required_error: '核销口令不能为空' })
    .trim()
    .regex(/^\d{6}$/, '核销口令为 6 位数字'),
});

// 注意：路径中的 :id 为活动 id
router.post('/events/:id/checkin-code', requireAuth, checkinController.generateCode);
router.get('/events/:id/checkin-code', requireAuth, checkinController.getCode);
// 核销：限活动发布者/管理员（服务层校验）；叠加 actionLimiter 防 6 位口令爆破
router.post(
  '/events/:id/checkin',
  requireAuth,
  actionLimiter,
  validate(checkinSchema),
  checkinController.checkin
);
router.get('/events/:id/checkin/stats', requireAuth, checkinController.stats);

module.exports = router;
