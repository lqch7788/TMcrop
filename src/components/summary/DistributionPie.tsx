/**
 * 分布饼图组件 - 环形饼图，带中心文字和图例
 * 用于成本构成、质量分布、优先级分布等场景
 */

import { useMemo, useCallback } from 'react';
import {
  PieChart, Pie, Cell, Tooltip, ResponsiveContainer, Legend,
} from 'recharts';
import { PieChartIcon } from 'lucide-react';
import type { ReactNode } from 'react';

export interface PieDataItem {
  name: string;
  value: number;
  fill: string;
}

export interface DistributionPieProps {
  /** 数据源 */
  data: PieDataItem[];
  /** 图表标题 */
  title?: string;
  /** 副标题 */
  subtitle?: string;
  /** 内环半径，默认 55 */
  innerRadius?: number;
  /** 外环半径，默认 85 */
  outerRadius?: number;
  /** 饼块间距 */
  paddingAngle?: number;
  /** 容器高度，默认 280 */
  height?: number;
  /** 中心文字，不传则显示总计 */
  centerLabel?: string;
  /** 中心副文字 */
  centerSub?: string;
  /** 自定义 Tooltip 格式化 */
  tooltipFormatter?: (value: number, name: string, total: number) => [string, string];
  /** 是否显示图例 */
  showLegend?: boolean;
  /** 空状态提示文字 */
  emptyText?: string;
  /** 额外 CSS 类名 */
  className?: string;
  /** 图例垂直布局 */
  legendLayout?: 'horizontal' | 'vertical';
}

/** 空状态组件 */
function EmptyPie({ text }: { text: string }) {
  return (
    <div className="h-full flex items-center justify-center text-gray-400">
      <div className="text-center">
        <PieChartIcon className="w-8 h-8 mx-auto mb-2 opacity-30" />
        <p className="text-sm">{text}</p>
      </div>
    </div>
  );
}

export function DistributionPie({
  data,
  title,
  subtitle,
  innerRadius = 55,
  outerRadius = 85,
  paddingAngle = 3,
  height = 280,
  centerLabel,
  centerSub,
  tooltipFormatter,
  showLegend = true,
  emptyText = '暂无数据',
  className = '',
  legendLayout = 'horizontal',
}: DistributionPieProps) {
  const total = useMemo(() => data.reduce((sum, d) => sum + d.value, 0), [data]);

  const defaultFormatter = useCallback(
    (value: number, name: string): [string, string] => {
      return [`${((value / total) * 100).toFixed(1)}%`, name];
    },
    [total]
  );

  if (!data.length) {
    return (
      <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
        {title && <h3 className="font-semibold text-gray-900 mb-4">{title}</h3>}
        <div style={{ height }}><EmptyPie text={emptyText} /></div>
      </div>
    );
  }

  return (
    <div className={`bg-white rounded-xl shadow-sm border border-gray-100 p-6 ${className}`}>
      {title && (
        <>
          <h3 className="font-semibold text-gray-900 mb-1">{title}</h3>
          {subtitle && <p className="text-xs text-gray-400 mb-4">{subtitle}</p>}
        </>
      )}
      <div className="relative" style={{ height }}>
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={data}
              cx="50%"
              cy="50%"
              innerRadius={innerRadius}
              outerRadius={outerRadius}
              paddingAngle={paddingAngle}
              dataKey="value"
              stroke="none"
            >
              {data.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.fill} />
              ))}
            </Pie>
            <Tooltip
              contentStyle={{
                backgroundColor: 'rgba(255,255,255,0.95)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(0,0,0,0.08)',
              }}
              formatter={tooltipFormatter || defaultFormatter}
            />
            {showLegend && (
              <Legend
                layout={legendLayout}
                wrapperStyle={{ fontSize: '12px' }}
              />
            )}
          </PieChart>
        </ResponsiveContainer>
        {/* 中心文字叠加层 */}
        <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
          <p className="text-lg font-bold text-gray-800">
            {centerLabel || total.toLocaleString()}
          </p>
          {centerSub && <p className="text-xs text-gray-400">{centerSub}</p>}
        </div>
      </div>
      {/* 水平图例（可选关闭内联图例时显示） */}
      {!showLegend && legendLayout === 'horizontal' && (
        <div className="flex justify-center gap-5 mt-2">
          {data.map((entry) => (
            <div key={entry.name} className="flex items-center gap-1.5">
              <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: entry.fill }} />
              <span className="text-xs text-gray-500">{entry.name}</span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
