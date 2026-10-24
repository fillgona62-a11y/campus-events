/**
 * 敏感词过滤（基础版）：命中词以等长 * 掩码。
 * 仅为 starter 列表——真正的第一道防线是服务端 sanitize（防 XSS）；
 * 后续按需往 SENSITIVE_WORDS 里扩充即可。
 */
const SENSITIVE_WORDS = [
  // 占位示例，按学校实际需要扩充（广告/人身攻击/违规等）
];

function mask(text) {
  if (!text || !SENSITIVE_WORDS.length) return text;
  let out = String(text);
  for (const w of SENSITIVE_WORDS) {
    if (!w) continue;
    out = out.split(w).join('*'.repeat(w.length));
  }
  return out;
}

module.exports = { mask, SENSITIVE_WORDS };
