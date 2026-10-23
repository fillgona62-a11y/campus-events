/**
 * 认证与用户 API。
 */
import client from './client';

/** 获取图形验证码（SVG，一次性使用）→ {id, svg, expires_in} */
export function getCaptcha() {
  return client.get('/auth/captcha');
}

/** 注册：{student_id, name, email, email_code, password, phone?, captcha_id, captcha_code} → {token, user} */
export function register(data) {
  return client.post('/auth/register', data);
}

/** 登录：{student_id, password} → {token, user} */
export function login(data) {
  return client.post('/auth/login', data);
}

/** 当前用户（含未读通知数）→ {user} */
export function me() {
  return client.get('/auth/me');
}

/** 完善资料：{name?, phone?} → {user} */
export function updateMe(data) {
  return client.put('/users/me', data);
}

/**
 * 发送邮箱验证码（F3/F2/F3 联动）。
 * @param {{email:string, purpose:'register'|'reset_password'|'bind_email', student_id?:string}} data
 * → {expires_in, dev_code?}
 */
export function sendEmailCode(data) {
  return client.post('/auth/email-code/send', data);
}

/** 自助修改密码（需登录）：{old_password, new_password} → null */
export function changePassword(data) {
  return client.post('/auth/password', data);
}

/** 忘记密码重置（免登录）：{student_id, email, email_code, new_password} → null */
export function resetPassword(data) {
  return client.post('/auth/password/reset', data);
}

/** 绑定/更换邮箱（需登录）：{email, email_code} → {user} */
export function bindEmail(data) {
  return client.put('/users/me/email', data);
}
