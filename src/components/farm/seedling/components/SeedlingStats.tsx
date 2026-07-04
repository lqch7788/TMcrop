/**
 * 育苗统计卡片组件（2026-07-04 v2 升级为 6 状态）
 * 使用公共 StatsCard 组件统一渲染
 */

import React from 'react';
import { Sprout, Clock, CheckCircle, TrendingUp, Scissors, XCircle, AlertTriangle } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface SeedlingStatsProps {
  data: {
    total: number;
    sown: number;                 // 已播种
    inProgress: number;           // 生长中
    transplantReady: number;     // 待出圃
    completed: number;           // 已出圃
    cancelled: number;           // 已取消
    abnormal: number;            // 异常
    monthCount: number;           // 本月新增
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
      label: '已播种',
      value: data.sown,
      icon: Clock,
      color: 'bg-blue-500'
    },
    {
      label: '生长中',
      value: data.inProgress,
      icon: Clock,
      color: 'bg-amber-500'
    },
    {
      label: '待出圃',
      value: data.transplantReady,
      icon: Scissors,
      color: 'bg-cyan-500'
    },
    {
      label: '已出圃',
      value: data.completed,
      icon: CheckCircle,
      color: 'bg-green-500'
    },
    {
      label: '异常结束',
      value: data.abnormal,
      icon: AlertTriangle,
      color: 'bg-red-500'
    },
    {
      label: '本月新增',
      value: data.monthCount,
      icon: TrendingUp,
      color: 'bg-indigo-500'
    },
  ];

  return <StatsCard stats={stats} />;
}
