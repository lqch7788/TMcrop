/**
 * 采收入库统计卡片组件
 * 使用公共StatsCard组件统一渲染
 */

import React from 'react';
import { Package, Warehouse } from 'lucide-react';
import { StatsCard, StatItem } from '../../common/StatsCard';

interface HarvestRecord {
  harvestQuantity: number;
  grade: string;
  status: string;
}

interface HarvestStatsCardsProps {
  records: HarvestRecord[];
}

export function HarvestStatsCards({ records }: HarvestStatsCardsProps) {
  const totalQuantity = records.reduce((sum, r) => sum + r.harvestQuantity, 0);
  const gradeAPercent = records.length > 0
    ? Math.round(records.filter(r => r.grade === 'A').length / records.length * 100)
    : 0;
  // 待入库 = 采收中、已采收、已分级状态的数量（已入库不算待入库）
  const pendingInboundCount = records.filter(r => ['harvesting', 'harvested', 'graded'].includes(r.status)).length;

  const stats: StatItem[] = [
    {
      label: '本月采收批次',
      value: records.length,
      icon: Package,
      color: 'bg-emerald-500',
    },
    {
      label: '总采收量',
      value: totalQuantity,
      icon: Warehouse,
      color: 'bg-blue-500',
      unit: 'kg',
    },
    {
      label: 'A级占比',
      value: gradeAPercent,
      icon: Package,
      color: 'bg-amber-500',
      unit: '%',
    },
    {
      label: '待入库',
      value: pendingInboundCount,
      icon: Warehouse,
      color: 'bg-purple-500',
    },
  ];

  return <StatsCard stats={stats} />;
}
