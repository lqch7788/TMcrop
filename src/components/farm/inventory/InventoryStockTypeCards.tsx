/**
 * 库存按类型分类的紧凑型汇总条（种源/种苗/成品）
 * 放在主统计卡片下方，单行横排
 */

import React from 'react';
import { Leaf, Sprout, Package } from 'lucide-react';
import { StockType } from '../../../types/inventory';

interface InventoryStockTypeCardsProps {
  byStockType: Record<string, { count: number; quantity: number }> | undefined;
}

export function InventoryStockTypeCards({ byStockType }: InventoryStockTypeCardsProps) {
  const items = [
    {
      key: 'seed',
      label: '种源',
      icon: Leaf,
      color: 'amber',
      data: byStockType?.[StockType.SEED] || { count: 0, quantity: 0 },
    },
    {
      key: 'seedling',
      label: '种苗',
      icon: Sprout,
      color: 'green',
      data: byStockType?.[StockType.SEEDLING] || { count: 0, quantity: 0 },
    },
    {
      key: 'product',
      label: '成品',
      icon: Package,
      color: 'emerald',
      data: byStockType?.[StockType.PRODUCT] || { count: 0, quantity: 0 },
    },
  ];

  const colorMap: Record<string, { text: string; textMuted: string; bg: string }> = {
    amber: { text: 'text-amber-700', textMuted: 'text-amber-500', bg: 'bg-amber-50' },
    green: { text: 'text-green-700', textMuted: 'text-green-500', bg: 'bg-green-50' },
    emerald: { text: 'text-emerald-700', textMuted: 'text-emerald-500', bg: 'bg-emerald-50' },
  };

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 px-4 py-2 flex items-center divide-x divide-gray-100">
      <div className="text-xs text-gray-500 pr-3 shrink-0">分类汇总</div>
      {items.map((item) => {
        const IconComponent = item.icon;
        const c = colorMap[item.color];
        return (
          <div key={item.key} className="flex items-center gap-2 px-4 first:pl-3">
            <div className={`w-7 h-7 rounded-md ${c.bg} flex items-center justify-center`}>
              <IconComponent className={`w-3.5 h-3.5 ${c.text}`} />
            </div>
            <div className="flex items-baseline gap-1.5 whitespace-nowrap">
              <span className={`text-sm font-semibold ${c.text}`}>{item.label}</span>
              <span className="text-base font-bold text-gray-900 tabular-nums">{item.data.count}</span>
              <span className="text-xs text-gray-500">实例</span>
              <span className="text-gray-300">/</span>
              <span className="text-sm font-semibold text-gray-700 tabular-nums">{item.data.quantity}</span>
              <span className="text-xs text-gray-500">数量</span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
