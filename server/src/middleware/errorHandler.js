/**
 * 统一错误处理中间件：将各类异常转换为 {code, message} 响应。
 */
const { ApiError } = require('../utils/response');
const { ERR } = require('../utils/constants');

/** API 404：未匹配到的 /api 路由 */
function apiNotFound(req, res, next) {
  next(new ApiError(ERR.NOT_FOUND, '接口不存在', 404));
}

// eslint-disable-next-line no-unused-vars
function errorHandler(err, req, res, next) {
  // 业务异常
  if (err instanceof ApiError) {
    return res.status(err.httpStatus).json({ code: err.code, message: err.message });
  }

  // zod 校验失败（兜底，正常由 validate 中间件转换）
  if (err && err.name === 'ZodError') {
    const message = err.issues && err.issues[0] ? err.issues[0].message : '参数校验失败';
    return res.status(400).json({ code: ERR.PARAM_INVALID, message });
  }

  // JSON 解析失败 / 请求体过大
  if (err && err.type === 'entity.parse.failed') {
    return res.status(400).json({ code: ERR.PARAM_INVALID, message: '请求体格式错误' });
  }
  if (err && err.type === 'entity.too.large') {
    return res.status(400).json({ code: ERR.PARAM_INVALID, message: '请求体过大' });
  }

  // multer 上传错误
  if (err && err.name === 'MulterError') {
    const message =
      err.code === 'LIMIT_FILE_SIZE' ? '文件大小超过 2MB 限制' : '文件上传失败';
    return res.status(400).json({ code: ERR.PARAM_INVALID, message });
  }

  // SQLite 唯一约束兜底（如并发下 UNIQUE 冲突）
  if (err && err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
    return res.status(409).json({ code: ERR.ALREADY_REGISTERED, message: '请勿重复提交' });
  }

  console.error('[server] 未捕获异常：', err);
  return res
    .status(500)
    .json({ code: ERR.INTERNAL, message: '服务器内部错误，请稍后重试' });
}

module.exports = { apiNotFound, errorHandler };
