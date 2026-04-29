/**
 * 种源统计卡片组件
 * 使用公共StatsCard组件统一渲染
 */

import React from 'react';
import { Package, Warehouse, TrendingUp, AlertTriangle } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface SeedSourceStatsProps {
  data: {
    total: number;
    totalQuantity: number;
    monthCount: number;
    alertCount: number;
  };
}

export function SeedSourceStats({ data }: SeedSourceStatsProps) {
  // 构建统计项数组，适配StatsCard组件格式
  const stats: StatItem[] = [
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

  return <StatsCard stats={stats} />;
}
