/**
 * 标签状态徽章 — 显示数量 + 状态标记
 * 用于 LabelTable 数量列
 */
import React from 'react';

interface LabelBadgeProps {
  status: string;
  quantity?: number;
  /** 标签单位（默认"株"，种源可能为"粒/颗/kg"等） */
  unit?: string;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: '', bg: '', text: '' },
  moved_out: { label: '已移出', bg: 'bg-orange-100', text: 'text-orange-700' },
  voided: { label: '已作废', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function LabelBadge({ status, quantity, unit = '株' }: LabelBadgeProps) {
  const cfg = STATUS_MAP[status];
  if (!cfg?.label) {
    return <span className="text-xs">{quantity ?? '-'} {unit}</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs">{quantity ?? '-'} {unit}</span>
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    </span>
  );
}

export default LabelBadge;
