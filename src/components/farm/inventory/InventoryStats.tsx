/**
 * 库存统计卡片组件
 * 样式与订单管理统计卡片保持一致（OrderStats 风格）
 *
 * 2026-07-28 审核 LOW：当前 InventoryV3.tsx 已直接使用 Store 的 stats 状态显示统计，本组件无调用方
 *   保留文件作为未来扩展用（用户授权前不删除）
 */

import React from 'react';
import { Package, Boxes, AlertTriangle, Clock } from 'lucide-react';

interface InventoryStatsProps {
  data: {
    totalInstances: number;
    totalQuantity: number;
    lowStockCount: number;
    expiringCount: number;
  } | null;
}

export function InventoryStats({ data }: InventoryStatsProps) {
  const cards = [
    {
      label: '总库存实例',
      value: data?.totalInstances ?? 0,
      color: 'bg-blue-500',
      icon: Package,
    },
    {
      label: '总库存数量',
      value: data?.totalQuantity ?? 0,
      color: 'bg-emerald-500',
      icon: Boxes,
    },
    {
      label: '低库存预警',
      value: data?.lowStockCount ?? 0,
      color: 'bg-amber-500',
      icon: AlertTriangle,
    },
    {
      label: '即将过期',
      value: data?.expiringCount ?? 0,
      color: 'bg-purple-500',
      icon: Clock,
    },
  ];

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {cards.map((card, index) => {
        const IconComponent = card.icon;
        return (
          <div
            key={index}
            className="bg-white rounded-lg p-3 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
          >
            <div className="flex items-center gap-2">
              <div className={`w-8 h-8 rounded-lg ${card.color} flex items-center justify-center`}>
                <IconComponent className="w-4 h-4 text-white" />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{card.value}</p>
                <p className="text-xs text-gray-500">{card.label}</p>
              </div>
            </div>
          </div>
        );
      })}
    </div>
  );
}
