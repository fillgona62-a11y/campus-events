/**
 * 统一响应工具与业务异常类。
 * 成功：{code:0, message:'ok', data}；失败：{code:非0, message:'中文错误描述'}。
 */
const { ERR } = require('./constants');

/** 业务异常：携带业务错误码与 HTTP 状态码，由 errorHandler 统一转换为响应 */
class ApiError extends Error {
  /**
   * @param {number} code 业务错误码（见 utils/constants ERR）
   * @param {string} message 中文错误描述
   * @param {number} httpStatus HTTP 状态码
   */
  constructor(code, message, httpStatus = 400) {
    super(message);
    this.name = 'ApiError';
    this.code = code;
    this.httpStatus = httpStatus;
  }

  static badRequest(message) {
    return new ApiError(ERR.PARAM_INVALID, message, 400);
  }
  static unauthorized(message = '未登录或登录已过期') {
    return new ApiError(ERR.UNAUTHORIZED, message, 401);
  }
  static forbidden(message = '无权限执行该操作') {
    return new ApiError(ERR.FORBIDDEN, message, 403);
  }
  static notFound(message = '资源不存在') {
    return new ApiError(ERR.NOT_FOUND, message, 404);
  }
}

/** 成功响应 */
function ok(res, data = null, message = 'ok') {
  res.json({ code: 0, message, data });
}

module.exports = { ApiError, ok };
