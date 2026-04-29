/**
 * 种植统计卡片组件
 * 使用公共StatsCard组件统一渲染
 */

import React from 'react';
import { Trees, Sprout, CheckCircle, TrendingUp } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface PlantingStatsProps {
  data: {
    total: number;
    growing: number;
    harvested: number;
    monthCount: number;
  };
}

export function PlantingStats({ data }: PlantingStatsProps) {
  const stats: StatItem[] = [
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

  return <StatsCard stats={stats} />;
}
