/**
 * 日历备注路由：按月读取、保存(增/改)、删除。全部需登录，限本人。
 */
const express = require('express');
const calendarController = require('../controllers/calendarController');
const { requireAuth } = require('../middleware/auth');

const router = express.Router();

router.get('/notes', requireAuth, calendarController.listNotes);
router.post('/notes', requireAuth, calendarController.saveNote);
router.delete('/notes/:id', requireAuth, calendarController.deleteNote);

module.exports = router;
