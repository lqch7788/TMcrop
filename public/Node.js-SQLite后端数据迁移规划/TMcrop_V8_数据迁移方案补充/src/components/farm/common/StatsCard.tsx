/**
 * 通用统计卡片组件
 * 提供统一的统计数据卡片布局和样式
 * 适用于种源管理、育苗管理、订单管理、采收管理等模块的统计展示
 */

import React from 'react';
import { LucideIcon } from 'lucide-react';

// 统计项配置接口
export interface StatItem {
  /** 标签文本 */
  label: string;
  /** 数值 */
  value: number | string;
  /** 单位（可选） */
  unit?: string;
  /** 图标组件 */
  icon: LucideIcon;
  /** 图标背景色 */
  color: 'bg-emerald-500' | 'bg-blue-500' | 'bg-amber-500' | 'bg-purple-500' | 'bg-red-500' | 'bg-gray-500';
}

// StatsCard组件属性
export interface StatsCardProps {
  /** 统计项列表 */
  stats: StatItem[];
  /** 自定义样式类名（可选） */
  className?: string;
}

/**
 * 通用统计卡片组件
 * 渲染4列网格布局的统计卡片
 *
 * @example
 * ```tsx
 * <StatsCard stats={[
 *   { label: '总数量', value: 100, icon: Package, color: 'bg-emerald-500' },
 *   { label: '进行中', value: 50, icon: Clock, color: 'bg-blue-500' },
 *   { label: '已完成', value: 30, icon: CheckCircle, color: 'bg-amber-500' },
 *   { label: '本月新增', value: 20, icon: Plus, color: 'bg-purple-500' },
 * ]} />
 * ```
 */
export function StatsCard({ stats, className = '' }: StatsCardProps) {
  return (
    <div className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 ${className}`}>
      {stats.map((stat, index) => (
        <div
          key={index}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-3">
            {/* 图标容器 */}
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            {/* 数值和标签 */}
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
                {stat.unit || ''}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}

export default StatsCard;
