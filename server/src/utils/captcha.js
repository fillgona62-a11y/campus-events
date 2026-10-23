/**
 * 图形验证码生成（svg-captcha）。
 * 输出 SVG 字符串，无需 canvas 等原生依赖，跨平台可移植。
 */
const svgCaptcha = require('svg-captcha');
const config = require('../config');
const captchaModel = require('../models/captchaModel');

/**
 * 生成一条图形验证码
 * @returns {{id:string, svg:string, expires_in:number}}
 */
function generate() {
  const cap = svgCaptcha.create({
    size: 4,                 // 4 位字符
    ignoreChars: '0o1ilI',   // 去掉易混淆字符
    noise: 2,                // 干扰线
    color: true,
    background: '#f2f5f9',
    width: 120,
    height: 44,
    fontSize: 40,
  });
  const record = captchaModel.create(config.captcha.ttlSeconds, cap.text);
  return { id: record.id, svg: cap.data, expires_in: config.captcha.ttlSeconds };
}

/**
 * 校验并消费图形验证码
 * @returns {boolean}
 */
function verify(id, input) {
  return captchaModel.consume(id, input);
}

module.exports = { generate, verify };
