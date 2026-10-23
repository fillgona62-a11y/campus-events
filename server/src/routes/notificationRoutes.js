/**
 * 站内信路由：列表、标记已读、全部已读。
 */
const express = require('express');
const notificationController = require('../controllers/notificationController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/notifications', requireAuth, notificationController.list);
// 注意：read-all 必须注册在 /:id/read 之前，避免被路径参数吞掉
router.put('/notifications/read-all', requireAuth, notificationController.markAllRead);
router.put('/notifications/:id/read', requireAuth, notificationController.markRead);

module.exports = router;
