/**
 * 种植统计卡片组件
 */

import React from 'react';
import { Trees, Sprout, CheckCircle, TrendingUp } from 'lucide-react';

interface PlantingStatsProps {
  data: {
    total: number;
    growing: number;
    harvested: number;
    monthCount: number;
  };
}

export function PlantingStats({ data }: PlantingStatsProps) {
  const stats = [
    {
      label: '总批次数',
      value: data.total,
      icon: Trees,
      color: 'bg-emerald-500'
    },
    {
      label: '生长期',
      value: data.growing,
      icon: Sprout,
      color: 'bg-amber-500'
    },
    {
      label: '已采收',
      value: data.harvested,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      label: '本月新增',
      value: data.monthCount,
      icon: TrendingUp,
      color: 'bg-blue-500'
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
              <p className="text-2xl font-bold text-gray-900">{stat.value}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
