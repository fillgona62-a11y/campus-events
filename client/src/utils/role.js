/**
 * 角色判定 helper：admin / super_admin 都视为「管理员」。
 */
export function isAdmin(role) {
  return role === 'admin' || role === 'super_admin';
}
