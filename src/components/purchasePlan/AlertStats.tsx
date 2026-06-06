/**
 * 采购计划预警统计组件
 */
import React, { useMemo } from 'react';
import { ShoppingCart } from 'lucide-react';
import type { PurchasePlan } from '../../types/purchase';
import { calculateOverdueAlert } from '../../types/purchase';

interface AlertStatsProps {
  // 采购计划数据
  purchasePlansData: PurchasePlan[];
}

/**
 * 采购计划预警统计组件
 */
export function AlertStats({ purchasePlansData }: AlertStatsProps) {
  // H-5: 用 useMemo 一次遍历算 2 个值（避免 O(2n) 双 filter）
  const { overdueCount, warningCount } = useMemo(() => {
    let overdue = 0;
    let warning = 0;
    for (const p of purchasePlansData) {
      const level = calculateOverdueAlert(p).level;
      if (level === 'overdue') overdue++;
      else if (level === 'warning') warning++;
    }
    return { overdueCount: overdue, warningCount: warning };
  }, [purchasePlansData]);

  return (
    <div className="bg-white rounded-xl p-6 shadow-none">
      <div className="flex items-center gap-3">
        <div className="w-12 h-12 rounded-lg bg-gradient-to-br from-emerald-500 to-green-600 flex items-center justify-center">
          <ShoppingCart className="w-6 h-6 text-white" />
        </div>
        <div>
          <h1 className="text-2xl font-bold text-gray-900">采购计划</h1>
          <p className="text-gray-500">物资采购计划的管理与审批</p>
        </div>
        {/* 逾期预警统计 */}
        <div className="ml-auto flex items-center gap-4">
          {overdueCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-red-50 border border-red-200 rounded-lg">
              <span className="text-red-500 text-lg">🔴</span>
              <div>
                <div className="text-xs text-red-500">已逾期</div>
                <div className="text-lg font-bold text-red-600">{overdueCount} 项</div>
              </div>
            </div>
          )}
          {warningCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-orange-50 border border-orange-200 rounded-lg">
              <span className="text-orange-500 text-lg">⚠️</span>
              <div>
                <div className="text-xs text-orange-500">即将到期</div>
                <div className="text-lg font-bold text-orange-600">{warningCount} 项</div>
              </div>
            </div>
          )}
          {overdueCount === 0 && warningCount === 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 bg-green-50 border border-green-200 rounded-lg">
              <span className="text-green-500 text-lg">✓</span>
              <div>
                <div className="text-xs text-green-500">暂无预警</div>
                <div className="text-lg font-bold text-green-600">0 项</div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

export default AlertStats;
