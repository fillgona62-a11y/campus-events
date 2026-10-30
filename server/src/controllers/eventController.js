/**
 * 活动控制器：分类、公开列表、详情、发布/编辑/取消、我发布的活动、报名名单与导出。
 */
const eventModel = require('../models/eventModel');
const categoryModel = require('../models/categoryModel');
const registrationModel = require('../models/registrationModel');
const eventService = require('../services/eventService');
const { ApiError, ok } = require('../utils/response');
const { ERR, EVENT_STATUS, isAdminRole } = require('../utils/constants');
const { parsePagination, parseId } = require('../middleware/validate');
const { buildRegistrationsCsv } = require('../utils/csv');

/** GET /categories */
function listCategories(req, res, next) {
  try {
    ok(res, { list: categoryModel.listAll() });
  } catch (err) {
    next(err);
  }
}

/**
 * 解析可选的月份范围参数（日历页数据源）：须为可解析时间字符串，否则 40001。
 * @param {*} raw req.query.start_from / req.query.start_to
 * @param {string} label 参数名（错误提示用）
 * @returns {string|undefined}
 */
function parseTimeRangeParam(raw, label) {
  if (!raw) return undefined;
  const value = String(raw);
  if (Number.isNaN(Date.parse(value))) {
    throw ApiError.badRequest(`${label}格式不正确`);
  }
  return value;
}

/** GET /events 公开列表（仅已发布且未结束；支持月份范围 start_from/start_to，日历页数据源） */
function listPublic(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    const categoryId = parseId(req.query.category_id);
    const data = eventModel.listPublic({
      keyword: req.query.keyword ? String(req.query.keyword).trim() : undefined,
      category_id: categoryId || undefined,
      start_from: parseTimeRangeParam(req.query.start_from, '开始时间范围'),
      start_to: parseTimeRangeParam(req.query.start_to, '结束时间范围'),
      page,
      page_size,
    });
    ok(res, data);
  } catch (err) {
    next(err);
  }
}

/** GET /events/hot 热门活动（按报名数降序，首页推荐位） */
function listHot(req, res, next) {
  try {
    let limit = parseInt(req.query.limit, 10);
    if (!Number.isInteger(limit) || limit < 1) limit = 6;
    if (limit > 20) limit = 20;
    ok(res, { list: eventModel.listHot(limit) });
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id 详情（非已发布状态仅发布者/管理员可见），登录时附 my_registration 与候补人数 */
function detail(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    const event = eventModel.findById(id);
    if (!event) throw ApiError.notFound('活动不存在');

    const viewer = req.user;
    const isOwnerOrAdmin =
      viewer && (viewer.id === event.organizer_id || isAdminRole(viewer.role));
    if (event.status !== EVENT_STATUS.APPROVED && !isOwnerOrAdmin) {
      // 对公众隐藏非公开状态活动
      throw ApiError.notFound('活动不存在或未发布');
    }

    let myRegistration = null;
    if (viewer) {
      const reg = registrationModel.findByEventAndUser(id, viewer.id);
      if (reg) myRegistration = { id: reg.id, status: reg.status };
    }
    // 候补人数（无敏感信息，组织者/管理员视角同样可见）
    const waitlistCount = registrationModel.countWaitlisted(id);
    ok(res, { event, my_registration: myRegistration, waitlist_count: waitlistCount });
  } catch (err) {
    next(err);
  }
}

/** POST /events 发布活动（初始待审核） */
function create(req, res, next) {
  try {
    const event = eventService.create(req.user.id, req.body);
    ok(res, { event }, '提交成功，等待管理员审核');
  } catch (err) {
    next(err);
  }
}

/** PUT /events/:id 编辑（本人，改后重新审核） */
function update(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    const event = eventService.update(req.user.id, id, req.body);
    ok(res, { event }, '修改已提交，等待管理员重新审核');
  } catch (err) {
    next(err);
  }
}

/** POST /events/:id/cancel 取消活动（本人） */
function cancel(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    eventService.cancel(req.user.id, id);
    ok(res, null, '活动已取消');
  } catch (err) {
    next(err);
  }
}

/** GET /my/events 我发布的活动 */
function myEvents(req, res, next) {
  try {
    const { page, page_size } = parsePagination(req.query);
    ok(res, eventModel.listByOrganizer(req.user.id, { page, page_size }));
  } catch (err) {
    next(err);
  }
}

/** 校验名单查看权限：发布者本人或管理员 */
function assertEventManagePermission(user, eventId) {
  const event = eventModel.findById(eventId);
  if (!event) throw ApiError.notFound('活动不存在');
  if (user.id !== event.organizer_id && !isAdminRole(user.role)) {
    throw ApiError.forbidden('仅活动发布者或管理员可查看报名名单');
  }
  return event;
}

/** GET /events/:id/registrations 报名名单（支持核销状态筛选，候补行附顺位） */
function listRegistrations(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    assertEventManagePermission(req.user, id);
    const { page, page_size } = parsePagination(req.query);
    const status = req.query.status ? String(req.query.status) : undefined;
    let checkedIn;
    if (req.query.checked_in === '0' || req.query.checked_in === '1') {
      checkedIn = Number(req.query.checked_in);
    }
    ok(res, registrationModel.listByEvent(id, { status, checked_in: checkedIn, page, page_size }));
  } catch (err) {
    next(err);
  }
}

/**
 * GET /events/:id/registrations/trend 单活动报名趋势（发布者/管理员）。
 * Query：days?（默认 30，1~90）；口径同全站趋势（有效报名，UTC+8 归日期）。
 */
function registrationsTrend(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    assertEventManagePermission(req.user, id);
    let days = parseInt(req.query.days, 10);
    if (!Number.isInteger(days) || days < 1) days = 30;
    if (days > 90) days = 90;
    ok(res, registrationModel.trendByEvent(id, days));
  } catch (err) {
    next(err);
  }
}

/** GET /events/:id/registrations/export 导出 CSV（带 BOM） */
function exportRegistrations(req, res, next) {
  try {
    const id = parseId(req.params.id);
    if (!id) throw ApiError.badRequest('活动 ID 不合法');
    assertEventManagePermission(req.user, id);
    const rows = registrationModel.listForExport(id);
    const csv = buildRegistrationsCsv(rows);
    const filename = `event_${id}_registrations.csv`;
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${filename}"; filename*=UTF-8''${encodeURIComponent(filename)}`
    );
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listCategories,
  listPublic,
  listHot,
  detail,
  create,
  update,
  cancel,
  myEvents,
  listRegistrations,
  registrationsTrend,
  exportRegistrations,
};
