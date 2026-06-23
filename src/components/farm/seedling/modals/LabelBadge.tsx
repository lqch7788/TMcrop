/**
 * 标签状态徽章 — 显示数量 + 状态标记
 * 用于 LabelTable 数量列
 */
import React from 'react';

interface LabelBadgeProps {
  status: string;
  quantity?: number;
}

const STATUS_MAP: Record<string, { label: string; bg: string; text: string }> = {
  active: { label: '', bg: '', text: '' },
  moved_out: { label: '已移出', bg: 'bg-orange-100', text: 'text-orange-700' },
  voided: { label: '已作废', bg: 'bg-gray-100', text: 'text-gray-500' },
};

export function LabelBadge({ status, quantity }: LabelBadgeProps) {
  const cfg = STATUS_MAP[status];
  if (!cfg?.label) {
    return <span className="text-xs">{quantity ?? '-'} 株</span>;
  }
  return (
    <span className="inline-flex items-center gap-1">
      <span className="text-xs">{quantity ?? '-'} 株</span>
      <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${cfg.bg} ${cfg.text}`}>
        {cfg.label}
      </span>
    </span>
  );
}

export default LabelBadge;
