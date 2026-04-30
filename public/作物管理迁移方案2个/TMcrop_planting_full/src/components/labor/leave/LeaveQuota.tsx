import { Award, Calendar, Heart, Umbrella } from 'lucide-react';
import type { LeaveQuota as LeaveQuotaType } from './types';

/**
 * 请假配额显示卡片组件
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

  return (
    <div className="bg-white rounded-xl shadow-sm p-6">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-semibold text-gray-900">请假配额</h3>
        <span className="text-sm text-gray-500">{quota.year}年</span>
      </div>

      <div className="space-y-4">
        {/* 年假 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center flex-shrink-0">
            <Calendar className="w-4 h-4 text-amber-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">年假</span>
              <span className="text-sm text-gray-500">
                {quota.annualLeaveRemaining} / {quota.annualLeaveTotal} 天
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-amber-500 rounded-full transition-all duration-300"
                style={{ width: `${annualPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">已用 {quota.annualLeaveUsed} 天</p>
          </div>
        </div>

        {/* 病假 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-blue-100 flex items-center justify-center flex-shrink-0">
            <Heart className="w-4 h-4 text-blue-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">病假</span>
              <span className="text-sm text-gray-500">
                {quota.sickLeaveRemaining} / {quota.sickLeaveTotal} 天
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-500 rounded-full transition-all duration-300"
                style={{ width: `${sickPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">已用 {quota.sickLeaveUsed} 天</p>
          </div>
        </div>

        {/* 其他假 */}
        <div className="flex items-start gap-3">
          <div className="w-8 h-8 rounded-lg bg-purple-100 flex items-center justify-center flex-shrink-0">
            <Umbrella className="w-4 h-4 text-purple-600" />
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-medium text-gray-700">其他假</span>
              <span className="text-sm text-gray-500">
                {quota.otherLeaveRemaining} / {quota.otherLeaveTotal} 天
              </span>
            </div>
            <div className="h-2 bg-gray-100 rounded-full overflow-hidden">
              <div
                className="h-full bg-purple-500 rounded-full transition-all duration-300"
                style={{ width: `${otherPercent}%` }}
              />
            </div>
            <p className="text-xs text-gray-400 mt-1">已用 {quota.otherLeaveUsed} 天</p>
          </div>
        </div>
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
