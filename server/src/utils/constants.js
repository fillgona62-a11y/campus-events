/**
 * 状态枚举与业务错误码单一来源（后端）。
 * 前端 utils/constants.js 持有同名枚举，文案映射只在前端维护。
 */

/** 活动状态机：pending→approved/rejected→offline/cancelled */
const EVENT_STATUS = {
  PENDING: 'pending',     // 待审核
  APPROVED: 'approved',   // 已发布
  REJECTED: 'rejected',   // 已拒绝
  OFFLINE: 'offline',     // 已下架
  CANCELLED: 'cancelled', // 已取消
};

/** 报名状态机：pending→approved/rejected/cancelled；waitlisted 为候补中（v2） */
const REG_STATUS = {
  PENDING: 'pending',       // 待审核
  APPROVED: 'approved',     // 已成功
  REJECTED: 'rejected',     // 已拒绝
  CANCELLED: 'cancelled',   // 已取消
  WAITLISTED: 'waitlisted', // 候补中（v2 新增）
};

/** 用户角色与状态 */
const USER_ROLE = { USER: 'user', ADMIN: 'admin', SUPER_ADMIN: 'super_admin' };
const USER_STATUS = { ACTIVE: 'active', DISABLED: 'disabled' };

/** 是否管理员角色（大小管理员都算管理员） */
function isAdminRole(role) {
  return role === USER_ROLE.ADMIN || role === USER_ROLE.SUPER_ADMIN;
}

/** 站内信类型 */
const NOTIFICATION_TYPE = {
  REGISTRATION_APPROVED: 'registration_approved',
  REGISTRATION_REJECTED: 'registration_rejected',
  EVENT_APPROVED: 'event_approved',
  EVENT_REJECTED: 'event_rejected',
  EVENT_CANCELLED: 'event_cancelled',
  EVENT_OFFLINE: 'event_offline',
  PASSWORD_CHANGED: 'password_changed',       // v2：自助改密提醒（F1）
  PASSWORD_RESET: 'password_reset',           // v2：密码被重置提醒（F1/F2）
  WAITLIST_PROMOTED: 'waitlist_promoted',     // v2：候补递补成功（F5）
  EVENT_REMINDER: 'event_reminder',           // v4：活动开始提醒
  DEADLINE_REMINDER: 'deadline_reminder',     // v4：报名截止提醒
};

/** 邮箱验证码用途（F3/F2/F3 联动） */
const EMAIL_CODE_PURPOSE = {
  REGISTER: 'register',
  RESET_PASSWORD: 'reset_password',
  BIND_EMAIL: 'bind_email',
};

/** 审计操作类型（F6） */
const AUDIT_ACTION = {
  EVENT_REVIEW_APPROVE: 'event_review_approve',
  EVENT_REVIEW_REJECT: 'event_review_reject',
  EVENT_OFFLINE: 'event_offline',
  USER_DISABLE: 'user_disable',
  USER_ENABLE: 'user_enable',
  USER_PASSWORD_RESET: 'user_password_reset',
  FORUM_POST_DELETE: 'forum_post_delete',
  FORUM_COMMENT_DELETE: 'forum_comment_delete',
  EVENT_PIN: 'event_pin',
};

/** 业务错误码（响应体 code 字段） */
const ERR = {
  PARAM_INVALID: 40001,       // 参数校验失败
  OLD_PASSWORD_WRONG: 40002,  // v2：旧密码不正确（F1）
  CAPTCHA_INVALID: 40010,     // 图形验证码错误或已失效（与线上一致）
  UNAUTHORIZED: 40101,        // 未登录/Token 无效
  FORBIDDEN: 40301,           // 无权限/账号被禁用
  ACCOUNT_LOCKED: 40302,      // v2：账号已锁定（F12，HTTP 423）
  NOT_FOUND: 40401,           // 资源不存在
  STUDENT_ID_EXISTS: 40901,   // 学号已注册
  ALREADY_REGISTERED: 40902,  // 已报名，请勿重复提交
  EVENT_FULL: 40903,          // 名额已满
  SIGNUP_CLOSED: 40904,       // 报名已截止
  INVALID_EVENT_STATE: 40905, // 活动状态不允许该操作
  EMAIL_EXISTS: 40906,        // v2：邮箱已被注册/绑定
  EMAIL_CODE_INVALID: 40907,  // v2：验证码不正确/已过期/已作废
  EMAIL_CODE_TOO_FREQUENT: 40908, // v2：验证码发送过于频繁（HTTP 429）
  NOT_REGISTERED: 40912,      // v2：该学号未成功报名此活动
  INTERNAL: 50000,            // 服务器内部错误
};

/** 分页默认值与上限 */
const PAGINATION = { DEFAULT_PAGE: 1, DEFAULT_PAGE_SIZE: 10, MAX_PAGE_SIZE: 50 };

module.exports = {
  EVENT_STATUS,
  REG_STATUS,
  USER_ROLE,
  USER_STATUS,
  isAdminRole,
  NOTIFICATION_TYPE,
  EMAIL_CODE_PURPOSE,
  AUDIT_ACTION,
  ERR,
  PAGINATION,
};
