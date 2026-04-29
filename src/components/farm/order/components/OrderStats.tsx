/**
 * 订单统计卡片组件
 * 使用公共StatsCard组件统一渲染
 */

import React from 'react';
import { Package, TrendingUp, CheckCircle, Calendar } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface OrderStatsProps {
  data: {
    total: number;
    inProgress: number;
    completed: number;
    thisMonth: number;
  };
}

export function OrderStats({ data }: OrderStatsProps) {
  const stats: StatItem[] = [
    {
      label: '订单总数',
      value: data.total,
      icon: Package,
      color: 'bg-blue-500',
    },
    {
      label: '进行中',
      value: data.inProgress,
      icon: TrendingUp,
      color: 'bg-amber-500',
    },
    {
      label: '已完成',
      value: data.completed,
      icon: CheckCircle,
      color: 'bg-emerald-500',
    },
    {
      label: '本月新增',
      value: data.thisMonth,
      icon: Calendar,
      color: 'bg-purple-500',
    },
  ];

  return <StatsCard stats={stats} />;
}
