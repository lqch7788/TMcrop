/**
 * 统计卡片（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-5：3 张统计卡片（班组数量/总人数/未分配）共用同一布局，
 * 仅图标颜色和数字不同。抽成 StatCard 消除复制粘贴 8 处 className。
 */
import { ReactNode } from 'react';
import { LucideIcon } from 'lucide-react';

export type StatCardColor = 'emerald' | 'blue' | 'amber';

const COLOR_CLASSES: Record<StatCardColor, { bg: string; text: string }> = {
  emerald: { bg: 'bg-emerald-50 border-emerald-200', text: 'text-emerald-600' },
  blue: { bg: 'bg-blue-50 border-blue-200', text: 'text-blue-600' },
  amber: { bg: 'bg-amber-50 border-amber-200', text: 'text-amber-600' },
};

export interface StatCardProps {
  icon: LucideIcon;
  label: string;
  value: ReactNode;
  color: StatCardColor;
}

export function StatCard({ icon: Icon, label, value, color }: StatCardProps) {
  const cls = COLOR_CLASSES[color];
  return (
    <div className={`${cls.bg} border rounded-lg p-3`}>
      <div className="flex items-center gap-2">
        <div className="w-8 h-8 rounded-lg bg-white flex items-center justify-center">
          {/* 2026-09-18 修复 M-11：图标按钮加 aria-label（screen reader 友好） */}
          <Icon className={`w-4 h-4 ${cls.text}`} aria-label={label} role="img" />
        </div>
        <div>
          <p className="text-xs text-gray-500">{label}</p>
          <p className="text-lg font-bold text-gray-800">{value}</p>
        </div>
      </div>
    </div>
  );
}