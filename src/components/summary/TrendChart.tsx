/**
 * 趋势图表组件 - 柱状+折线混搭图，支持双Y轴
 * 用于产量趋势、成本趋势、人工趋势等场景
 */

import { useMemo } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
  Legend, Line, ComposedChart,
} from 'recharts';
import { BarChart3 } from 'lucide-react';

// ========== 类型定义 ==========

export interface BarSeriesConfig {
  dataKey: string;
  name?: string;
  fill?: string;
  yAxisId?: 'left' | 'right';
  /** 柱半径，默认 [4,4,0,0] */
  radius?: [number, number, number, number];
  /** 柱宽 */
  barSize?: number;
}

export interface LineSeriesConfig {
  dataKey: string;
  name?: string;
  stroke?: string;
  yAxisId?: 'left' | 'right';
  strokeWidth?: number;
  dot?: boolean | { r?: number; fill?: string };
}

export interface TrendChartProps {
  /** 图表数据（数组对象，key 对应 xDataKey / bar/line 的 dataKey） */
  data: Record<string, unknown>[];
  /** X 轴数据键 */
  xDataKey: string;
  /** 柱状系列配置 */
  bars?: BarSeriesConfig[];
  /** 折线系列配置 */
  lines?: LineSeriesConfig[];
  /** 图表标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 容器高度，默认 300 */
  height?: number;
  /** 左 Y 轴格式化 */
  leftYFormatter?: (v: number) => string;
  /** 右 Y 轴格式化 */
  rightYFormatter?: (v: number) => string;
  /** 右 Y 轴单位后缀 */
  rightYUnit?: string;
  /** 右 Y 轴值域 */
  rightYDomain?: [number, number];
  /** Tooltip 格式化回调 */
  tooltipFormatter?: (value: number, name: string) => [string, string];
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 空状态提示文字 */
  emptyText?: string;
  /** 额外 CSS 类名 */
  className?: string;
  /** 使用 ComposedChart 支持混搭（默认 BarChart） */
  variant?: 'bar' | 'composed';
  /** 布局方向（横向柱状图） */
  layout?: 'horizontal' | 'vertical';
}

// ========== 常量 ==========

const TOOLTIP_STYLE = {
  backgroundColor: 'rgba(255,255,255,0.95)',
  backdropFilter: 'blur(12px)',
  borderRadius: '12px',
  border: '1px solid rgba(0,0,0,0.08)',
  boxShadow: '0 4px 16px rgba(0,0,0,0.08)',
};

// ========== 空状态 ==========

function EmptyChart({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <div className="text-center">
        <BarChart3 className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

// ========== 主组件 ==========

export function TrendChart({
  data,
  xDataKey,
  bars = [],
  lines = [],
  title,
  subtitle,
  height = 300,
  leftYFormatter,
  rightYFormatter,
  rightYUnit,
  rightYDomain = [0, 100],
  tooltipFormatter,
  showLegend = true,
  emptyText = '暂无趋势数据',
  className = '',
  variant = 'bar',
  layout = 'horizontal',
}: TrendChartProps) {
  const hasRightAxis = useMemo(
    () => bars.some((b) => b.yAxisId === 'right') || lines.some((l) => l.yAxisId === 'right'),
    [bars, lines]
  );

  if (!data || data.length === 0) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
        <div style={{ height }}><EmptyChart text={emptyText} /></div>
      </div>
    );
  }

  const ChartComponent = variant === 'composed' ? ComposedChart : BarChart;

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {title && (
        <>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
        </>
      )}
      <div style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <ChartComponent
            data={data}
            layout={layout}
            margin={{ top: 10, right: hasRightAxis ? 20 : 10, left: 0, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
            {layout === 'horizontal' ? (
              <XAxis
                dataKey={xDataKey}
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
              />
            ) : (
              <XAxis
                type="number"
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                tickFormatter={leftYFormatter}
              />
            )}
            {layout === 'horizontal' ? (
              <YAxis
                yAxisId="left"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={leftYFormatter}
              />
            ) : (
              <YAxis
                type="category"
                dataKey={xDataKey}
                tick={{ fontSize: 11 }}
                stroke="#9ca3af"
                width={80}
              />
            )}
            {hasRightAxis && layout === 'horizontal' && (
              <YAxis
                yAxisId="right"
                orientation="right"
                tick={{ fontSize: 12 }}
                stroke="#9ca3af"
                tickFormatter={rightYFormatter}
                domain={rightYDomain}
                unit={rightYUnit}
              />
            )}
            <Tooltip
              contentStyle={TOOLTIP_STYLE}
              formatter={tooltipFormatter}
            />
            {showLegend && <Legend wrapperStyle={{ fontSize: '12px' }} />}
            {/* 柱状系列 */}
            {bars.map((bar) => (
              <Bar
                key={bar.dataKey}
                yAxisId={bar.yAxisId || 'left'}
                dataKey={bar.dataKey}
                name={bar.name || bar.dataKey}
                fill={bar.fill || '#10b981'}
                radius={bar.radius || (layout === 'vertical' ? [0, 4, 4, 0] : [4, 4, 0, 0])}
                barSize={bar.barSize}
                maxBarSize={layout === 'vertical' ? 24 : undefined}
              />
            ))}
            {/* 折线系列 */}
            {lines.map((line) => (
              <Line
                key={line.dataKey}
                yAxisId={line.yAxisId || 'right'}
                type="monotone"
                dataKey={line.dataKey}
                name={line.name || line.dataKey}
                stroke={line.stroke || '#3b82f6'}
                strokeWidth={line.strokeWidth || 2}
                dot={typeof line.dot === 'object' ? line.dot : line.dot === false ? false : { r: 3, fill: line.stroke || '#3b82f6' }}
              />
            ))}
          </ChartComponent>
        </ResponsiveContainer>
      </div>
    </div>
  );
}
