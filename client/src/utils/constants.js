/**
 * 状态枚举与文案映射（前端）。枚举值与后端 utils/constants.js 保持一致。
 */

/** 活动状态枚举 */
export const EVENT_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  OFFLINE: 'offline',
  CANCELLED: 'cancelled',
};

/** 报名状态枚举（v2 新增候补中） */
export const REG_STATUS = {
  PENDING: 'pending',
  APPROVED: 'approved',
  REJECTED: 'rejected',
  CANCELLED: 'cancelled',
  WAITLISTED: 'waitlisted',
};

/** 活动状态文案与颜色（MUI Chip color） */
export const EVENT_STATUS_MAP = {
  pending: { label: '待审核', color: 'warning' },
  approved: { label: '已发布', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  offline: { label: '已下架', color: 'default' },
  cancelled: { label: '已取消', color: 'default' },
};

/** 报名状态文案与颜色（v2 新增候补中） */
export const REG_STATUS_MAP = {
  pending: { label: '待审核', color: 'warning' },
  approved: { label: '已成功', color: 'success' },
  rejected: { label: '已拒绝', color: 'error' },
  cancelled: { label: '已取消', color: 'default' },
  waitlisted: { label: '候补中', color: 'info' },
};

/** 审计操作类型中文映射（F6 操作日志页） */
export const AUDIT_ACTION_MAP = {
  event_review_approve: { label: '审核通过活动' },
  event_review_reject: { label: '审核拒绝活动' },
  event_offline: { label: '下架活动' },
  user_disable: { label: '禁用用户' },
  user_enable: { label: '启用用户' },
  user_password_reset: { label: '重置用户密码' },
};

/** 核销状态文案（F4） */
export const CHECKED_IN_MAP = {
  1: { label: '已核销', color: 'success' },
  0: { label: '未核销', color: 'default' },
};
