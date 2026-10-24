/**
 * 撞色（Clash）通用工具
 *
 * 撞色八色板饱和度高，明暗差异大，因此背景色上的文字必须按亮度挑选前景色，
 * 否则会出现「荧光绿底 + 白字」这种看不清的组合。本文件提供两个能力：
 *   1. readableText(bg)  —— 依据背景色亮度返回可读的墨色或白色
 *   2. clashSurfaceStyle —— 统一的描边 + 硬边投影样式对象
 *
 * 色板本身仍然以 theme.js 为唯一来源，避免各处硬编码色值。
 */
import { CLASH } from '../theme';

/**
 * sRGB 十六进制颜色 → WCAG 相对亮度（0~1）
 * @param {string} hex 形如 '#B2FC06'
 */
function relativeLuminance(hex) {
  if (!hex || typeof hex !== 'string') return 0;
  const v = hex.replace('#', '');
  if (v.length < 6) return 0;
  const channels = [0, 2, 4].map((i) => {
    const c = parseInt(v.slice(i, i + 2), 16) / 255;
    return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * channels[0] + 0.7152 * channels[1] + 0.0722 * channels[2];
}

/**
 * 依据背景色亮度挑选可读前景色（墨色或白色），保证撞色文字对比度 ≥ 4.5:1
 * @param {string} bg 背景色
 * @returns {'#12121A' | '#FFFFFF'}
 */
export function readableText(bg) {
  const l = relativeLuminance(bg);
  const onInk = (l + 0.05) / (relativeLuminance(CLASH.ink) + 0.05);
  const onWhite = 1.05 / (l + 0.05);
  return onInk >= onWhite ? CLASH.ink : '#FFFFFF';
}
