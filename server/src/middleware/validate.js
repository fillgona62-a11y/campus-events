/**
 * zod 请求体校验中间件：校验失败统一转为 40001；成功后以解析结果覆盖 req.body。
 */
const { ApiError } = require('../utils/response');
const { ERR, PAGINATION } = require('../utils/constants');

/**
 * @param {import('zod').ZodSchema} schema
 */
function validate(schema) {
  return (req, res, next) => {
    const result = schema.safeParse(req.body);
    if (!result.success) {
      const issue = result.error.issues[0];
      const message = issue ? issue.message : '参数校验失败';
      return next(new ApiError(ERR.PARAM_INVALID, message, 400));
    }
    req.body = result.data;
    next();
  };
}

/**
 * 解析分页 query 参数：page 从 1 开始，page_size 默认 10、上限 50。
 * @param {object} query req.query
 * @returns {{page:number, page_size:number}}
 */
function parsePagination(query) {
  let page = parseInt(query.page, 10);
  let pageSize = parseInt(query.page_size, 10);
  if (!Number.isInteger(page) || page < 1) page = PAGINATION.DEFAULT_PAGE;
  if (!Number.isInteger(pageSize) || pageSize < 1) pageSize = PAGINATION.DEFAULT_PAGE_SIZE;
  if (pageSize > PAGINATION.MAX_PAGE_SIZE) pageSize = PAGINATION.MAX_PAGE_SIZE;
  return { page, page_size: pageSize };
}

/** 解析路径参数 id（正整数），非法返回 null */
function parseId(raw) {
  const id = parseInt(raw, 10);
  return Number.isInteger(id) && id > 0 ? id : null;
}

module.exports = { validate, parsePagination, parseId };
