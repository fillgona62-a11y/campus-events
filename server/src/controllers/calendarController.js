/**
 * 日历备注控制器：按月读取、保存(增/改一体)、删除。全部限本人（requireAuth + user_id 过滤）。
 */
const calendarNoteModel = require('../models/calendarNoteModel');
const { ApiError, ok } = require('../utils/response');
const { parseId } = require('../middleware/validate');

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const MONTH_RE = /^\d{4}-\d{2}$/;
const MAX_LEN = 500;

/** GET /calendar/notes?month=YYYY-MM → { notes: [{id,date,content,updated_at}] } */
function listNotes(req, res, next) {
  try {
    const month = String(req.query.month || '');
    if (!MONTH_RE.test(month)) throw ApiError.badRequest('月份格式应为 YYYY-MM');
    ok(res, { notes: calendarNoteModel.listByUserMonth(req.user.id, month) });
  } catch (err) {
    next(err);
  }
}

/** POST /calendar/notes { date, content } → 新建或更新当日备注 */
function saveNote(req, res, next) {
  try {
    const date = String(req.body.date || '').trim();
    const content = String(req.body.content == null ? '' : req.body.content).trim();
    if (!DATE_RE.test(date)) throw ApiError.badRequest('日期格式应为 YYYY-MM-DD');
    if (!content) throw ApiError.badRequest('备注内容不能为空');
    if (content.length > MAX_LEN) throw ApiError.badRequest(`备注内容不能超过 ${MAX_LEN} 字`);
    const note = calendarNoteModel.upsert(req.user.id, date, content);
    ok(res, { note }, '备注已保存');
  } catch (err) {
    next(err);
  }
}

/** DELETE /calendar/notes/:id → 删除本人备注 */
function deleteNote(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('备注 ID 不合法');
    const changes = calendarNoteModel.remove(id, req.user.id);
    if (!changes) throw ApiError.notFound('备注不存在或无权删除');
    ok(res, null, '备注已删除');
  } catch (err) {
    next(err);
  }
}

module.exports = { listNotes, saveNote, deleteNote };
