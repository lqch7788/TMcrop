import { Calendar, Heart, Umbrella } from 'lucide-react';
import type { LeaveQuota as LeaveQuotaType } from './types';

/**
 * 请假配额显示卡片组件 - 紧凑型
 */
interface LeaveQuotaCardProps {
  quota: LeaveQuotaType;
}

export function LeaveQuotaCard({ quota }: LeaveQuotaCardProps) {
  // 年假配额
  const annualPercent = quota.annualLeaveTotal > 0
    ? Math.round((quota.annualLeaveUsed / quota.annualLeaveTotal) * 100)
    : 0;

  // 病假配额
  const sickPercent = quota.sickLeaveTotal > 0
    ? Math.round((quota.sickLeaveUsed / quota.sickLeaveTotal) * 100)
    : 0;

  // 其他假配额
  const otherPercent = quota.otherLeaveTotal > 0
    ? Math.round((quota.otherLeaveUsed / quota.otherLeaveTotal) * 100)
    : 0;

  const quotaCards = [
    {
      icon: Calendar,
      label: '年假',
      used: quota.annualLeaveUsed,
      total: quota.annualLeaveTotal,
      remaining: quota.annualLeaveRemaining,
      percent: annualPercent,
      bgColor: 'bg-amber-50',
      iconColor: 'text-amber-600',
      barColor: 'bg-amber-500',
    },
    {
      icon: Heart,
      label: '病假',
      used: quota.sickLeaveUsed,
      total: quota.sickLeaveTotal,
      remaining: quota.sickLeaveRemaining,
      percent: sickPercent,
      bgColor: 'bg-blue-50',
      iconColor: 'text-blue-600',
      barColor: 'bg-blue-500',
    },
    {
      icon: Umbrella,
      label: '其他假',
      used: quota.otherLeaveUsed,
      total: quota.otherLeaveTotal,
      remaining: quota.otherLeaveRemaining,
      percent: otherPercent,
      bgColor: 'bg-purple-50',
      iconColor: 'text-purple-600',
      barColor: 'bg-purple-500',
    },
  ];

  return (
    <div className="bg-white rounded-lg p-3 border border-gray-100">
      <div className="flex items-center justify-between mb-2">
        <h3 className="text-sm font-semibold text-gray-900">请假配额</h3>
        <span className="text-xs text-gray-500">{quota.year}年</span>
      </div>

      <div className="grid grid-cols-3 gap-2">
        {quotaCards.map((card, idx) => (
          <div key={idx} className={`${card.bgColor} rounded-lg p-2`}>
            <div className="flex items-center gap-2 mb-1">
              <card.icon className={`w-4 h-4 ${card.iconColor}`} />
              <span className="text-xs font-medium text-gray-700">{card.label}</span>
            </div>
            <div className="text-lg font-bold text-gray-900">
              {card.remaining}<span className="text-xs font-normal text-gray-500 ml-1">/ {card.total}天</span>
            </div>
            <div className="h-1.5 bg-white rounded-full overflow-hidden mt-1">
              <div
                className={`h-full ${card.barColor} rounded-full transition-all duration-300`}
                style={{ width: `${card.percent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-0.5">已用{card.used}天</p>
          </div>
        ))}
      </div>
    </div>
  );
}

/**
 * 模拟请假配额数据
 */
export function getMockLeaveQuota(staffId: string, staffName: string): LeaveQuotaType {
  // 模拟数据，实际应从API获取
  return {
    staffId,
    staffName,
    year: new Date().getFullYear(),
    annualLeaveTotal: 15,
    annualLeaveUsed: 5,
    annualLeaveRemaining: 10,
    sickLeaveTotal: 10,
    sickLeaveUsed: 2,
    sickLeaveRemaining: 8,
    otherLeaveTotal: 5,
    otherLeaveUsed: 1,
    otherLeaveRemaining: 4,
  };
}

export default LeaveQuotaCard;
