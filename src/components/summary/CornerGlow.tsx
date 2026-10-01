/**
 * 角落发光装饰组件（2026-10-01 新增）
 *
 * 用途：在深色玻璃容器内左上/右上角叠加一个柔和的径向光晕，
 *      增强"科技感"。仅作装饰，无业务逻辑。
 */

export type GlowColor = 'emerald' | 'red' | 'amber' | 'blue';

export interface CornerGlowProps {
  /** 颜色（决定 CSS 类） */
  color?: GlowColor;
  /** 哪个角，默认 'top-right' */
  position?: 'top-right' | 'top-left' | 'bottom-right' | 'bottom-left';
  /** 自定义尺寸（px），默认 160 */
  size?: number;
  /** 自定义偏移（px），默认 -40 */
  offset?: number;
}

/** 颜色 → 径向渐变背景的 style */
const COLOR_BG: Record<GlowColor, string> = {
  emerald: 'radial-gradient(circle, rgba(16, 185, 129, 0.18) 0%, transparent 70%)',
  red: 'radial-gradient(circle, rgba(239, 68, 68, 0.18) 0%, transparent 70%)',
  amber: 'radial-gradient(circle, rgba(245, 158, 11, 0.18) 0%, transparent 70%)',
  blue: 'radial-gradient(circle, rgba(59, 130, 246, 0.18) 0%, transparent 70%)',
};

/** 位置 → 内联样式 */
function getPositionStyle(position: CornerGlowProps['position'], size: number, offset: number): React.CSSProperties {
  switch (position) {
    case 'top-right':
      return { top: offset, right: offset, width: size, height: size };
    case 'top-left':
      return { top: offset, left: offset, width: size, height: size };
    case 'bottom-right':
      return { bottom: offset, right: offset, width: size, height: size };
    case 'bottom-left':
      return { bottom: offset, left: offset, width: size, height: size };
    default:
      return { top: offset, right: offset, width: size, height: size };
  }
}

export function CornerGlow({
  color = 'emerald',
  position = 'top-right',
  size = 160,
  offset = -40,
}: CornerGlowProps) {
  return (
    <div
      aria-hidden="true"
      style={{
        position: 'absolute',
        pointerEvents: 'none',
        ...getPositionStyle(position, size, offset),
      }}
    >
      <div
        style={{
          width: '100%',
          height: '100%',
          background: COLOR_BG[color],
        }}
      />
    </div>
  );
}

export default CornerGlow;