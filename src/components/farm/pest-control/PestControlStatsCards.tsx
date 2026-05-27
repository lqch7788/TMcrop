/**
 * 病虫害防治记录统计卡片组件
 * V12.0 新增
 * 4个统计卡片：总记录数、化学防治、生物防治、物理防治
 */
import React from 'react';
import { Sprout } from 'lucide-react';

interface PestControlStatsCardsProps {
  stats: {
    total: number;
    chemical: number;
    bio: number;
    physical: number;
  };
}

export function PestControlStatsCards({ stats }: PestControlStatsCardsProps) {
  const cards = [
    {
      label: '总记录数',
      value: stats.total,
      icon: Sprout,
      bgColor: 'bg-emerald-500',
    },
    {
      label: '化学防治',
      value: stats.chemical,
      icon: Sprout,
      bgColor: 'bg-red-500',
    },
    {
      label: '生物防治',
      value: stats.bio,
      icon: Sprout,
      bgColor: 'bg-green-500',
    },
    {
      label: '物理防治',
      value: stats.physical,
      icon: Sprout,
      bgColor: 'bg-blue-500',
    },
  ];

  return (
    <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
      {cards.map((card) => (
        <div
          key={card.label}
          className="bg-white rounded-lg p-3 shadow-sm border border-gray-100"
        >
          <div className="flex items-center gap-2">
            <div className={`w-8 h-8 rounded-lg ${card.bgColor} flex items-center justify-center`}>
              <card.icon className="w-4 h-4 text-white" />
            </div>
            <div>
              <p className="text-lg font-bold text-gray-900">{card.value}</p>
              <p className="text-xs text-gray-500">{card.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
