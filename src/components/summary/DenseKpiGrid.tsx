/**
 * 紧凑 KPI 网格（2026-10-01 新增）
 *
 * 用途：汇总看板 Hero 区的核心 4 项 KPI 紧凑网格
 * 区别于通用 KpiCardGrid：本组件自带深色玻璃风格、corner-glow、统一规格
 */

import { ReactNode } from 'react';
import { KpiCard } from './KpiCard';

export interface DenseKpiItem {
  key: string;
  icon: ReactNode;
  label: string;
  value: string | number;
  colorScheme: 'emerald' | 'amber' | 'red' | 'blue' | 'purple' | 'slate';
  onClick?: () => void;
  /** 趋势百分比，可选 */
  trend?: number;
}

export interface DenseKpiGridProps {
  items: DenseKpiItem[];
  /** 列数，默认 2（Hero 区中段） */
  columns?: 2 | 4;
}

/**
 * 紧凑 KPI 网格（深色玻璃风格，专用于汇总看板）
 */
export function DenseKpiGrid({ items, columns = 2 }: DenseKpiGridProps) {
  const colClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${colClass} gap-2`}>
      {items.map((item, index) => (
        <div key={item.key} className={`stagger-in stagger-in-${Math.min(index + 2, 6)}`}>
          <KpiCard
            icon={item.icon}
            label={item.label}
            value={item.value}
            colorScheme={item.colorScheme}
            trend={item.trend}
            onClick={item.onClick}
            variant="hero"
          />
        </div>
      ))}
    </div>
  );
}

export default DenseKpiGrid;