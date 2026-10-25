/**
 * JWT 鉴权中间件。
 * requireAuth：校验 token 并实时查询用户状态（disabled 立即 40301）。
 * requireAdmin：在 requireAuth 之后校验 role 为 admin/super_admin。
 * optionalAuth：有 token 则解析挂载 req.user，无 token 放行（活动详情等场景）。
 */
const { verifyToken } = require('../utils/jwt');
const { ApiError } = require('../utils/response');
const { USER_STATUS, isAdminRole } = require('../utils/constants');
const userModel = require('../models/userModel');

/** 从请求头提取 Bearer token */
function extractToken(req) {
  const header = req.headers.authorization || '';
  if (header.startsWith('Bearer ')) return header.slice(7);
  return null;
}

/** 根据 token 解析用户并校验状态，失败返回 ApiError */
function resolveUser(req) {
  const token = extractToken(req);
  if (!token) return { error: ApiError.unauthorized('未登录或登录已过期') };

  let payload;
  try {
    payload = verifyToken(token);
  } catch (e) {
    return { error: ApiError.unauthorized('未登录或登录已过期') };
  }

  // 实时查询用户状态：被禁用账号的已签发 token 立即失效
  const user = userModel.findById(payload.uid);
  if (!user) return { error: ApiError.unauthorized('账号不存在') };
  if (user.status !== USER_STATUS.ACTIVE) {
    return { error: ApiError.forbidden('账号已被禁用，请联系管理员') };
  }
  return { user };
}

function requireAuth(req, res, next) {
  const { user, error } = resolveUser(req);
  if (error) return next(error);
  req.user = user;
  next();
}

function requireAdmin(req, res, next) {
  if (!req.user || !isAdminRole(req.user.role)) {
    return next(ApiError.forbidden('仅管理员可执行该操作'));
  }
  next();
}

function optionalAuth(req, res, next) {
  const { user } = resolveUser(req);
  if (user) req.user = user;
  next();
}

module.exports = { requireAuth, requireAdmin, optionalAuth };
