/**
 * JWT 签发与校验。payload：{uid, role, iat, exp}，有效期默认 7 天。
 */
const jwt = require('jsonwebtoken');
const config = require('../config');

/**
 * 为用户签发 token
 * @param {{id:number, role:string}} user
 * @returns {string}
 */
function signToken(user) {
  return jwt.sign({ uid: user.id, role: user.role }, config.jwtSecret, {
    expiresIn: config.jwtExpiresIn,
  });
}

/**
 * 校验 token，失败抛异常（由调用方捕获转为 40101）
 * @param {string} token
 * @returns {{uid:number, role:string}}
 */
function verifyToken(token) {
  return jwt.verify(token, config.jwtSecret);
}

module.exports = { signToken, verifyToken };
