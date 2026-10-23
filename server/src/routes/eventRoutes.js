/**
 * 活动路由：分类、公开列表/详情、发布/编辑/取消、我发布的、报名名单与导出、报名。
 */
const express = require('express');
const { z } = require('zod');
const eventController = require('../controllers/eventController');
const registrationController = require('../controllers/registrationController');
const { requireAuth, optionalAuth } = require('../middleware/auth');
const { validate } = require('../middleware/validate');
const { actionLimiter } = require('../middleware/rateLimit');

const router = express.Router();

/** 合法时间字符串（可解析为 Date） */
const timeString = (label) =>
  z
    .string({ required_error: `${label}不能为空` })
    .refine((s) => !Number.isNaN(Date.parse(s)), `${label}格式不正确`);

const eventSchema = z
  .object({
    title: z
      .string({ required_error: '活动标题不能为空' })
      .trim()
      .min(1, '活动标题不能为空')
      .max(80, '活动标题最多 80 字'),
    category_id: z
      .number({ required_error: '请选择活动分类', invalid_type_error: '分类不合法' })
      .int('分类不合法')
      .positive('分类不合法'),
    location: z
      .string({ required_error: '活动地点不能为空' })
      .trim()
      .min(1, '活动地点不能为空')
      .max(120, '活动地点最多 120 字'),
    start_time: timeString('开始时间'),
    end_time: timeString('结束时间'),
    signup_deadline: timeString('报名截止时间'),
    capacity: z
      .number({ required_error: '人数上限不能为空', invalid_type_error: '人数上限必须为数字' })
      .int('人数上限必须为整数')
      .min(0, '人数上限不能为负（0 表示不限）')
      .max(100000, '人数上限过大'),
    require_approval: z.boolean({ invalid_type_error: '审核开关不合法' }).optional().default(false),
    description: z.string().max(20000, '活动简介过长').optional().nullable(),
    cover_url: z
      .string()
      .max(255)
      .refine((s) => s.startsWith('/uploads/'), '封面图路径不合法')
      .optional()
      .nullable(),
  })
  .refine((d) => Date.parse(d.end_time) > Date.parse(d.start_time), {
    message: '结束时间必须晚于开始时间',
    path: ['end_time'],
  })
  .refine((d) => Date.parse(d.signup_deadline) <= Date.parse(d.start_time), {
    message: '报名截止时间不能晚于活动开始时间',
    path: ['signup_deadline'],
  });

const registerSchema = z.object({
  remark: z.string().trim().max(200, '备注最多 200 字').optional(),
});

// 分类
router.get('/categories', eventController.listCategories);

// 我发布的活动（需在 /events/:id 之前注册，避免路径冲突——前缀不同，仅作保险）
router.get('/my/events', requireAuth, eventController.myEvents);

// 公开活动列表与详情
router.get('/events', eventController.listPublic);
router.get('/events/:id', optionalAuth, eventController.detail);

// 发布 / 编辑 / 取消
router.post('/events', requireAuth, actionLimiter, validate(eventSchema), eventController.create);
router.put('/events/:id', requireAuth, actionLimiter, validate(eventSchema), eventController.update);
router.post('/events/:id/cancel', requireAuth, actionLimiter, eventController.cancel);

// 报名名单与导出
router.get('/events/:id/registrations', requireAuth, eventController.listRegistrations);
router.get('/events/:id/registrations/export', requireAuth, eventController.exportRegistrations);
router.get('/events/:id/registrations/trend', requireAuth, eventController.registrationsTrend);

// 学生报名（幂等，限流防重复提交）
router.post(
  '/events/:id/register',
  requireAuth,
  actionLimiter,
  validate(registerSchema),
  registrationController.register
);

module.exports = router;
