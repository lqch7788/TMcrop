/**
 * 育苗统计卡片组件
 * 使用公共StatsCard组件统一渲染
 */

import React from 'react';
import { Sprout, Clock, CheckCircle, TrendingUp } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface SeedlingStatsProps {
  data: {
    total: number;
    inProgress: number;
    completed: number;
    monthCount: number;
  };
}

export function SeedlingStats({ data }: SeedlingStatsProps) {
  const stats: StatItem[] = [
    {
      label: '总批次数',
      value: data.total,
      icon: Sprout,
      color: 'bg-emerald-500'
    },
    {
      label: '进行中',
      value: data.inProgress,
      icon: Clock,
      color: 'bg-amber-500'
    },
    {
      label: '已完成',
      value: data.completed,
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
