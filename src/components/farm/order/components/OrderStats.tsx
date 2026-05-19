/**
 * 订单统计卡片组件
 * 样式与生产计划页面统计卡片保持一致
 */

import React from 'react';
import { Package, TrendingUp, CheckCircle, Calendar } from 'lucide-react';

interface OrderStatsProps {
  data: {
    total: number;
    inProgress: number;
    completed: number;
    thisMonth: number;
  };
}

export function OrderStats({ data }: OrderStatsProps) {
  const stats = [
    {
      label: '订单总数',
      value: data.total,
      color: 'bg-blue-500',
      icon: Package,
    },
    {
      label: '进行中',
      value: data.inProgress,
      color: 'bg-amber-500',
      icon: TrendingUp,
    },
    {
      label: '已完成',
      value: data.completed,
      color: 'bg-emerald-500',
      icon: CheckCircle,
    },
    {
      label: '本月新增',
      value: data.thisMonth,
      color: 'bg-purple-500',
      icon: Calendar,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => {
        const IconComponent = stat.icon;
        return (
          <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100 hover:shadow-md transition-shadow">
            <div className="flex items-center gap-3">
              <div className={`w-12 h-12 rounded-xl ${stat.color} flex items-center justify-center`}>
                <IconComponent className="w-6 h-6 text-white" />
              </div>
              <div>
                <p className="text-3xl font-bold text-gray-900">{stat.value}</p>
                <p className="text-sm text-gray-500">{stat.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
