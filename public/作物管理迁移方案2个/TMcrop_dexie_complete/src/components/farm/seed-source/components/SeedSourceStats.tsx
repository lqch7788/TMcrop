/**
 * 种源统计卡片组件
 */

import React from 'react';
import { Package, Warehouse, TrendingUp, AlertTriangle } from 'lucide-react';

interface SeedSourceStatsProps {
  data: {
    total: number;
    totalQuantity: number;
    monthCount: number;
    alertCount: number;
  };
}

export function SeedSourceStats({ data }: SeedSourceStatsProps) {
  const stats = [
    {
      label: '总种源数',
      value: data.total,
      icon: Package,
      color: 'bg-emerald-500'
    },
    {
      label: '库存总量',
      value: data.totalQuantity.toLocaleString(),
      icon: Warehouse,
      color: 'bg-blue-500',
      unit: '株/粒'
    },
    {
      label: '本月新增',
      value: data.monthCount,
      icon: TrendingUp,
      color: 'bg-amber-500'
    },
    {
      label: '库存预警',
      value: data.alertCount,
      icon: AlertTriangle,
      color: 'bg-red-500'
    }
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">
                {stat.value}
                {stat.unit && <span className="text-sm text-gray-500 ml-1">{stat.unit}</span>}
              </p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
