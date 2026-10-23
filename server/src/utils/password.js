/**
 * 密码工具（F1）：管理员重置用户时的一次性临时密码生成 + 新密码强度校验。
 */
const crypto = require('crypto');

/**
 * 生成一次性临时密码：12 位，大小写字母 + 数字，去除易混淆字符（0/O/1/l/I）。
 * @returns {string} 12 位临时密码
 */
function generateTempPassword() {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789';
  let password = '';
  for (let i = 0; i < 12; i++) {
    password += chars[crypto.randomInt(0, chars.length)];
  }
  return password;
}

/**
 * 新密码强度校验：至少 6 位（前后端双校验，服务端为最终防线）。
 * @param {string} password 明文新密码
 * @returns {boolean} 合法返回 true
 */
function isStrongEnough(password) {
  return typeof password === 'string' && password.length >= 6 && password.length <= 64;
}

module.exports = { generateTempPassword, isStrongEnough };
