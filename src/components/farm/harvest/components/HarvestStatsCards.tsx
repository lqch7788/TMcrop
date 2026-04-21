/**
 * 采收入库统计卡片组件
 */

import React from 'react';
import { Package, Warehouse } from 'lucide-react';

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

  const stats = [
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

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {stats.map((stat, index) => (
        <div key={index} className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <div className={`w-10 h-10 rounded-lg ${stat.color} flex items-center justify-center`}>
              <stat.icon className="w-5 h-5 text-white" />
            </div>
            <div>
              <p className="text-2xl font-bold text-gray-900">{stat.value}{stat.unit || ''}</p>
              <p className="text-sm text-gray-500">{stat.label}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
