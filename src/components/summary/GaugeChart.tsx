/**
 * SVG 仪表盘组件 - 270°弧形仪表盘，带指针和刻度
 * 用于指标看板展示达成率
 */

export interface GaugeChartProps {
  /** 百分比值 (0-100) */
  percentage: number;
  /** 底部标签 */
  label: string;
  /** 颜色主题 */
  colorScheme?: 'emerald' | 'amber' | 'red';
  /** 宽高尺寸，默认 200 */
  size?: number;
}

/** 颜色主题映射 */
const COLOR_MAP: Record<string, string> = {
  emerald: '#10b981',
  amber: '#f59e0b',
  red: '#ef4444',
};

export function GaugeChart({ percentage, label, colorScheme = 'emerald', size = 200 }: GaugeChartProps) {
  const cx = size / 2;
  const cy = size / 2 + 10;
  const radius = 65;
  const strokeWidth = 14;
  const fullCircumference = 2 * Math.PI * radius;
  const arcRatio = 270 / 360;
  const arcLength = fullCircumference * arcRatio;
  const gapLength = fullCircumference - arcLength;
  const valueLength = arcLength * Math.min(percentage / 100, 1);

  const arcColor = COLOR_MAP[colorScheme] || COLOR_MAP.emerald;

  // 指针计算
  const startAngleDeg = 225;
  const totalSweepDeg = 270;
  const currentAngleDeg = startAngleDeg + (Math.min(percentage / 100, 1)) * totalSweepDeg;
  const needleLength = radius - 18;
  const angleRad = (currentAngleDeg * Math.PI) / 180;
  const needleX = cx + needleLength * Math.cos(angleRad);
  const needleY = cy + needleLength * Math.sin(angleRad);

  const tickPositions = [0, 25, 50, 75, 100];

  return (
    <div className="flex flex-col items-center">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="overflow-visible">
        {/* 背景圆弧 */}
        <circle
          cx={cx}
          cy={cy}
          r={radius}
          fill="none"
          stroke="#e5e7eb"
          strokeWidth={strokeWidth}
          strokeDasharray={`${arcLength} ${gapLength}`}
          strokeDashoffset={0}
          strokeLinecap="round"
          transform={`rotate(135, ${cx}, ${cy})`}
        />
        {/* 数值圆弧 */}
        {percentage > 0 && (
          <circle
            cx={cx}
            cy={cy}
            r={radius}
            fill="none"
            stroke={arcColor}
            strokeWidth={strokeWidth}
            strokeDasharray={`${valueLength} ${fullCircumference - valueLength}`}
            strokeDashoffset={0}
            strokeLinecap="round"
            transform={`rotate(135, ${cx}, ${cy})`}
            style={{ transition: 'stroke-dasharray 0.6s ease' }}
          />
        )}
        {/* 刻度标记 */}
        {tickPositions.map((tick) => {
          const tickAngleDeg = startAngleDeg + (tick / 100) * totalSweepDeg;
          const tickRad = (tickAngleDeg * Math.PI) / 180;
          const innerR = radius - strokeWidth / 2 - 4;
          const outerR = radius + strokeWidth / 2 + 4;
          return (
            <line
              key={tick}
              x1={cx + innerR * Math.cos(tickRad)}
              y1={cy + innerR * Math.sin(tickRad)}
              x2={cx + outerR * Math.cos(tickRad)}
              y2={cy + outerR * Math.sin(tickRad)}
              stroke="#d1d5db"
              strokeWidth={2}
            />
          );
        })}
        {/* 指针 */}
        <line
          x1={cx}
          y1={cy}
          x2={needleX}
          y2={needleY}
          stroke="#374151"
          strokeWidth={2.5}
          strokeLinecap="round"
          style={{ transition: 'all 0.6s ease' }}
        />
        {/* 中心圆点 */}
        <circle cx={cx} cy={cy} r={5} fill="#374151" />
        <circle cx={cx} cy={cy} r={2.5} fill="white" />
        {/* 中心文字 */}
        <text
          x={cx}
          y={cy + 36}
          textAnchor="middle"
          className="text-2xl"
          fontWeight="bold"
          fill="#1e293b"
        >
          {Math.round(percentage)}%
        </text>
      </svg>
      <span className="text-sm text-gray-500 -mt-2">{label}</span>
    </div>
  );
}
