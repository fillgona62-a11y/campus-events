/**
 * 核销路由（v5 定位签到）：定位签到、核销统计。
 * 全部需登录；签到/统计限活动发布者或管理员（服务层校验）。
 * v5 起移除口令生成/查看路由（彻底替换为定位签到）。
 */
const express = require('express');
const { z } = require('zod');
const checkinController = require('../controllers/checkinController');
const { requireAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

// 定位签到：学生学号 + 实时经纬度
const checkinSchema = z.object({
  student_id: z.string({ required_error: '学号不能为空' }).trim().min(1, '学号不能为空').max(32),
  lat: z
    .number({ required_error: '请开启定位后签到', invalid_type_error: '纬度不合法' })
    .min(-90, '纬度不合法')
    .max(90, '纬度不合法'),
  lng: z
    .number({ required_error: '请开启定位后签到', invalid_type_error: '经度不合法' })
    .min(-180, '经度不合法')
    .max(180, '经度不合法'),
});

// 学生自助定位签到：只需实时经纬度（无需学号）
const selfCheckinSchema = z.object({
  lat: z
    .number({ required_error: '请开启定位后签到', invalid_type_error: '纬度不合法' })
    .min(-90, '纬度不合法')
    .max(90, '纬度不合法'),
  lng: z
    .number({ required_error: '请开启定位后签到', invalid_type_error: '经度不合法' })
    .min(-180, '经度不合法')
    .max(180, '经度不合法'),
});

// 注意：路径中的 :id 为活动 id
// 定位签到：限活动发布者/管理员（服务层校验）；叠加 actionLimiter 防刷
router.post(
  '/events/:id/checkin',
  requireAuth,
  actionLimiter,
  validate(checkinSchema),
  checkinController.checkin
);
// 学生自助定位签到：本人 token，无需组织者
router.post(
  '/events/:id/self-checkin',
  requireAuth,
  actionLimiter,
  validate(selfCheckinSchema),
  checkinController.selfCheckin
);
router.get('/events/:id/checkin/stats', requireAuth, checkinController.stats);

module.exports = router;
