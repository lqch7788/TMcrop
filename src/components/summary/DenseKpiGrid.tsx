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
  /** 副标文字（"暂无数据"），P1-10 */
  secondary?: string;
  /** 数据可信度，hero 变体专属，P0-1 */
  dataSource?: 'live' | 'demo' | 'empty';
}

export interface DenseKpiGridProps {
  items: DenseKpiItem[];
  /** 列数，默认 2（Hero 区中段） */
  columns?: 2 | 4;
  /** P1-9：本次数字更新的 items（用于 number-pop 微动效） */
  popKeys?: Set<string>;
}

/**
 * 紧凑 KPI 网格（深色玻璃风格，专用于汇总看板）
 */
export function DenseKpiGrid({ items, columns = 2, popKeys }: DenseKpiGridProps) {
  const colClass = columns === 2 ? 'grid-cols-2' : 'grid-cols-2 md:grid-cols-4';

  return (
    <div className={`grid ${colClass} gap-2`}>
      {items.map((item, index) => (
        <div
          key={item.key}
          className={`stagger-in stagger-in-${Math.min(index + 2, 6)} ${popKeys?.has(item.key) ? 'number-pop' : ''}`}
        >
          <KpiCard
            icon={item.icon}
            label={item.label}
            value={item.value}
            colorScheme={item.colorScheme}
            trend={item.trend}
            secondary={item.secondary}
            dataSource={item.dataSource}
            onClick={item.onClick}
            variant="hero"
          />
        </div>
      ))}
    </div>
  );
}

export default DenseKpiGrid;