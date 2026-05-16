/**
 * KPI 指标卡片 - 可复用的关键指标展示组件
 * 设计参考：Dashboard StatCard (src/components/dashboard/cards/StatCard.tsx)
 */

import { TrendingUp, TrendingDown } from 'lucide-react';

/** KPI 卡片颜色方案映射 */
const COLOR_SCHEMES: Record<string, { bg: string; iconBg: string; trendUp: string }> = {
  emerald: { bg: 'bg-emerald-50', iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600', trendUp: 'text-emerald-600' },
  amber:   { bg: 'bg-amber-50',   iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',     trendUp: 'text-amber-600' },
  red:     { bg: 'bg-red-50',     iconBg: 'bg-gradient-to-br from-red-500 to-red-600',         trendUp: 'text-red-600' },
  blue:    { bg: 'bg-blue-50',    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',       trendUp: 'text-blue-600' },
  purple:  { bg: 'bg-purple-50',  iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',   trendUp: 'text-purple-600' },
  slate:   { bg: 'bg-slate-50',   iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',     trendUp: 'text-slate-600' },
};

export interface KpiCardProps {
  /** 图标元素（ReactNode，如 lucide-react 图标） */
  icon: React.ReactNode;
  /** 指标标签 */
  label: string;
  /** 指标数值 */
  value: string | number;
  /** 趋势百分比，正数为上升，负数为下降，不传则不显示 */
  trend?: number;
  /** 颜色方案，默认 emerald */
  colorScheme?: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  /** 点击跳转到详情页 */
  onClick?: () => void;
  /** 紧凑模式，缩小内边距和字体 */
  compact?: boolean;
}

export function KpiCard({ icon, label, value, trend, colorScheme = 'emerald', onClick, compact }: KpiCardProps) {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.emerald;

  // 紧凑模式：横向布局（图标-文字-趋势）
  if (compact) {
    return (
      <div
        className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-3 ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className={`w-8 h-8 rounded-lg ${colors.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className="text-base font-bold text-gray-900 truncate">{value}</p>
            <p className="text-[11px] text-gray-500">{label}</p>
          </div>
          {trend !== undefined && (
            <div className={`flex items-center gap-0.5 text-xs flex-shrink-0 ${trend >= 0 ? colors.trendUp : 'text-red-600'}`}>
              {trend >= 0 ? (
                <TrendingUp className="w-3 h-3" />
              ) : (
                <TrendingDown className="w-3 h-3" />
              )}
              <span>{Math.abs(trend)}%</span>
            </div>
          )}
        </div>
      </div>
    );
  }

  // 标准模式：纵向布局（上图标 + 下文字）
  return (
    <div
      className={`bg-white rounded-xl shadow-sm border border-gray-100 hover:shadow-md transition-shadow p-5 ${onClick ? 'cursor-pointer' : ''}`}
      onClick={onClick}
    >
      {/* 顶部：图标 + 数值 */}
      <div className="flex items-center justify-between">
        <div className={`w-10 h-10 rounded-lg ${colors.iconBg} flex items-center justify-center shadow-sm`}>
          {icon}
        </div>
        {/* 趋势箭头 */}
        {trend !== undefined && (
          <div className={`flex items-center gap-0.5 text-sm ${trend >= 0 ? colors.trendUp : 'text-red-600'}`}>
            {trend >= 0 ? (
              <TrendingUp className="w-4 h-4" />
            ) : (
              <TrendingDown className="w-4 h-4" />
            )}
            <span>{Math.abs(trend)}%</span>
          </div>
        )}
      </div>

      {/* 底部：数值 + 标签 */}
      <div className="mt-3">
        <p className="text-2xl font-bold text-gray-900">{value}</p>
        <p className="text-xs text-gray-500 mt-1">{label}</p>
      </div>
    </div>
  );
}
