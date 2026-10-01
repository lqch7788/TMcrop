/**
 * KPI 指标卡片 - 可复用的关键指标展示组件
 * 设计参考：Dashboard StatCard (src/components/dashboard/cards/StatCard.tsx)
 *
 * 2026-10-01 第二轮升级：
 * - 新增 secondary 副标（"暂无数据" / 单位）
 * - 新增 dataSource 徽章（live / demo / empty）— P0-1
 */

import { TrendingUp, TrendingDown } from 'lucide-react';
import type { ReactNode } from 'react';

/** KPI 卡片颜色方案映射 */
const COLOR_SCHEMES: Record<string, {
  bg: string;
  iconBg: string;
  trendUp: string;
  /** hero 模式专属（2026-10-01 第二版：浅色基底，不再深色） */
  heroBg: string;
  heroText: string;
  heroSub: string;
  heroBorder: string;
}> = {
  emerald: {
    bg: 'bg-emerald-50',
    iconBg: 'bg-gradient-to-br from-emerald-500 to-emerald-600',
    trendUp: 'text-emerald-600',
    heroBg: 'bg-emerald-50/50',
    heroText: 'text-emerald-700',
    heroSub: 'text-emerald-600/80',
    heroBorder: 'border-emerald-200/60',
  },
  amber: {
    bg: 'bg-amber-50',
    iconBg: 'bg-gradient-to-br from-amber-500 to-amber-600',
    trendUp: 'text-amber-600',
    heroBg: 'bg-amber-50/50',
    heroText: 'text-amber-700',
    heroSub: 'text-amber-600/80',
    heroBorder: 'border-amber-200/60',
  },
  red: {
    bg: 'bg-red-50',
    iconBg: 'bg-gradient-to-br from-red-500 to-red-600',
    trendUp: 'text-red-600',
    heroBg: 'bg-red-50/50',
    heroText: 'text-red-700',
    heroSub: 'text-red-600/80',
    heroBorder: 'border-red-200/60',
  },
  blue: {
    bg: 'bg-blue-50',
    iconBg: 'bg-gradient-to-br from-blue-500 to-blue-600',
    trendUp: 'text-blue-600',
    heroBg: 'bg-blue-50/50',
    heroText: 'text-blue-700',
    heroSub: 'text-blue-600/80',
    heroBorder: 'border-blue-200/60',
  },
  purple: {
    bg: 'bg-purple-50',
    iconBg: 'bg-gradient-to-br from-purple-500 to-purple-600',
    trendUp: 'text-purple-600',
    heroBg: 'bg-purple-50/50',
    heroText: 'text-purple-700',
    heroSub: 'text-purple-600/80',
    heroBorder: 'border-purple-200/60',
  },
  slate: {
    bg: 'bg-slate-50',
    iconBg: 'bg-gradient-to-br from-slate-500 to-slate-600',
    trendUp: 'text-slate-600',
    heroBg: 'bg-slate-50/50',
    heroText: 'text-slate-700',
    heroSub: 'text-slate-600/80',
    heroBorder: 'border-slate-200/60',
  },
};

export interface KpiCardProps {
  /** 图标元素（ReactNode，如 lucide-react 图标） */
  icon: ReactNode;
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
  /**
   * 视觉变体：
   * - 'standard'（默认）：浅色卡片
   * - 'hero'：深色玻璃（用于汇总看板 Hero 区）
   */
  variant?: 'standard' | 'hero';
  /** 副标文字（用于"暂无数据"提示或附加信息），P1-10 */
  secondary?: string;
  /** 数据可信度，hero 变体专属 — P0-1
   * - 'live'：实时真实数据（emerald 点）
   * - 'demo'：含演示数据（amber 点）
   * - 'empty'：空数据（slate 点）
   * - undefined：不显示徽章
   */
  dataSource?: 'live' | 'demo' | 'empty';
}

export function KpiCard({
  icon,
  label,
  value,
  trend,
  colorScheme = 'emerald',
  onClick,
  compact,
  variant: variantProp = 'standard',
  secondary,
  dataSource,
}: KpiCardProps) {
  const colors = COLOR_SCHEMES[colorScheme] || COLOR_SCHEMES.emerald;

  // 数据可信度徽章配置 — P0-1
  const DATA_SOURCE_DOT: Record<NonNullable<KpiCardProps['dataSource']>, string> = {
    live: 'health-dot health-dot-green health-dot-green-pulse',
    demo: 'health-dot health-dot-yellow',
    empty: 'health-dot health-dot-gray',
  };
  const DATA_SOURCE_LABEL: Record<NonNullable<KpiCardProps['dataSource']>, string> = {
    live: '实时数据',
    demo: '含演示数据',
    empty: '暂无数据',
  };

  // ============ Hero 变体（2026-10-01 第二版：浅色基底） ============
  if (variantProp === 'hero') {
    return (
      <div
        className={`relative ${colors.heroBg} border ${colors.heroBorder} rounded-xl px-4 py-3 overflow-hidden hover:shadow-md transition-shadow ${onClick ? 'cursor-pointer' : ''}`}
        onClick={onClick}
      >
        <div className="flex items-center gap-3">
          <div className={`w-9 h-9 rounded-lg ${colors.iconBg} flex items-center justify-center shadow-sm flex-shrink-0`}>
            {icon}
          </div>
          <div className="flex-1 min-w-0">
            <p className={`text-2xl font-bold tabular-nums leading-tight truncate ${colors.heroText}`}>
              {value}
            </p>
            <p className={`text-[11px] mt-0.5 ${colors.heroSub} truncate`}>{label}</p>
            {/* P1-10：value=0 / undefined 时显示副标「暂无数据」 */}
            {(value === 0 || value === '0' || value === '' || secondary) && (
              <p className="text-[10px] text-slate-400 mt-0.5 truncate">
                {secondary ?? (value === 0 || value === '0' ? '暂无数据' : '')}
              </p>
            )}
          </div>
          <div className="flex flex-col items-end gap-1 flex-shrink-0">
            {trend !== undefined && (
              <div
                className={`flex items-center gap-0.5 text-xs ${
                  trend >= 0 ? 'text-emerald-600' : 'text-red-600'
                }`}
              >
                {trend >= 0 ? (
                  <TrendingUp className="w-3 h-3" />
                ) : (
                  <TrendingDown className="w-3 h-3" />
                )}
                <span>{Math.abs(trend)}%</span>
              </div>
            )}
            {/* P0-1：数据可信度徽章 */}
            {dataSource && (
              <span
                className={DATA_SOURCE_DOT[dataSource]}
                title={DATA_SOURCE_LABEL[dataSource]}
              />
            )}
          </div>
        </div>
      </div>
    );
  }

  // ============ Compact 紧凑模式：浅色 ============
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

  // ============ Standard 标准模式：浅色 ============
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
