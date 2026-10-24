/**
 * ClashDecor.jsx — 撞色风格共享装饰组件
 *
 * 供各页面复用，避免每个页面各写一套 SVG：
 *   ClashStar    四角星（参考图核心装饰符号）
 *   ClashStripe  撞色渐变细条（分区隔）
 *   ClashBlob    柔和撞色光斑（背景层次）
 *   ClashTitle   撞色大标题（渐变字 + 星星点缀）
 */
import { CLASH } from '../theme';

/**
 * 四角星装饰。用 currentColor 继承颜色。
 * @param {{size?: number, className?: string, style?: object}} props
 */
export function ClashStar({ size = 16, className = '', style }) {
  return (
    <span
      aria-hidden="true"
      className={`clash-star ${className}`}
      style={{ width: size, height: size, ...style }}
    />
  );
}

/**
 * 撞色渐变细条。
 * @param {{className?: string, style?: object}} props
 */
export function ClashStripe({ className = '', style }) {
  return <div aria-hidden="true" className={`clash-stripe ${className}`} style={style} />;
}

/**
 * 背景光斑（纯装饰，绝对定位）。
 * @param {{color?: string, size?: number, top?: string, left?: string, right?: string, bottom?: string, opacity?: number}} props
 */
export function ClashBlob({
  color = CLASH.lime,
  size = 220,
  top,
  left,
  right,
  bottom,
  opacity = 0.35,
}) {
  const pos = { top, left, right, bottom };
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none absolute rounded-full blur-3xl"
      style={{
        width: size,
        height: size,
        backgroundColor: color,
        opacity,
        filter: 'blur(60px)',
        ...pos,
      }}
    />
  );
}

/**
 * 撞色大标题：渐变文字 + 四角星点缀。
 * @param {{children: React.ReactNode, subtitle?: string, align?: 'left'|'center', star?: boolean}} props
 */
export function ClashTitle({ children, subtitle, align = 'left', star = true }) {
  return (
    <div className={align === 'center' ? 'text-center' : ''}>
      <h1 className="flex items-center gap-2 text-2xl font-extrabold tracking-tight md:text-3xl">
        <span className="clash-text-gradient">{children}</span>
        {star && <ClashStar size={20} style={{ color: CLASH.magenta }} />}
      </h1>
      {subtitle && (
        <p className="mt-1 text-sm text-ink-mute md:text-base">{subtitle}</p>
      )}
    </div>
  );
}

/**
 * 撞色标签色轮：按索引取色，让分类在视觉上一眼可辨。
 * @param {number} index
 * @param {string[]} palette
 */
export function clashColorAt(index, palette) {
  const list = palette && palette.length ? palette : [CLASH.lime, CLASH.magenta, CLASH.violet, CLASH.cyan, CLASH.lemon, CLASH.mint, CLASH.haze, CLASH.royal];
  const i = Math.abs(Number(index) || 0) % list.length;
  return list[i];
}

export default ClashStar;
