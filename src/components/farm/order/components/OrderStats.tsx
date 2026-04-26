/**
 * 订单统计卡片组件
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
      icon: Package,
      color: 'bg-blue-500',
      textColor: 'text-blue-600',
    },
    {
      label: '进行中',
      value: data.inProgress,
      icon: TrendingUp,
      color: 'bg-amber-500',
      textColor: 'text-amber-600',
    },
    {
      label: '已完成',
      value: data.completed,
      icon: CheckCircle,
      color: 'bg-emerald-500',
      textColor: 'text-emerald-600',
    },
    {
      label: '本月新增',
      value: data.thisMonth,
      icon: Calendar,
      color: 'bg-purple-500',
      textColor: 'text-purple-600',
    },
  ];

  return (
    <div className="grid grid-cols-4 gap-4">
      {stats.map((stat) => (
        <div
          key={stat.label}
          className="bg-white rounded-xl p-4 shadow-sm border border-gray-100"
        >
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm text-gray-500 mb-1">{stat.label}</p>
              <p className={`text-2xl font-bold ${stat.textColor}`}>
                {stat.value}
              </p>
            </div>
            <div className={`${stat.color} p-3 rounded-lg`}>
              <stat.icon className="w-6 h-6 text-white" />
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
