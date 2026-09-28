/**
 * 生产退料 - 统计摘要卡片
 *
 * 2026-09-28 新增：与领料申请单的摘要卡片行（ApplicationTable 的「统计摘要卡片」）
 * 保持同一视觉口径，展示 4 格：本月退料单 / 本月退料金额 / 待审批 / 已驳回。
 */
import { useMemo } from 'react';
import { todayLocal } from '@/lib/dateUtils';
import type { ReturnRecord } from './types';

interface MaterialReturnSummaryCardsProps {
  /** 退料记录（统计口径为该数组全量，不受分页影响） */
  records: ReturnRecord[];
}

export function MaterialReturnSummaryCards({ records }: MaterialReturnSummaryCardsProps) {
  // 四格摘要：本月退料单数 / 本月退料金额 / 待审批单数 / 已驳回单数
  const summary = useMemo(() => {
    // 本地时区的本月前缀（如 "2026-09"），与 record.date（YYYY-MM-DD）前缀比较，避免 UTC 跨天错位
    const thisMonth = todayLocal().slice(0, 7);
    let monthCount = 0;
    let monthAmount = 0;
    let pendingCount = 0;
    let rejectedCount = 0;

    for (const record of records) {
      // 本月退料单：按退料日期落在当前自然月 + 金额 Σ(退料数量 × 单价)
      if (String(record.date || '').startsWith(thisMonth)) {
        monthCount += 1;
        monthAmount += (record.materials || []).reduce(
          (sum, m) => sum + (Number(m.returnQuantity) || 0) * (Number(m.unitPrice) || 0),
          0
        );
      }
      if (record.statusClass === 'pending') pendingCount += 1;
      if (record.statusClass === 'rejected') rejectedCount += 1;
    }

    // 金额保留 2 位小数，消除浮点累加误差
    return {
      monthCount,
      monthAmount: Math.round(monthAmount * 100) / 100,
      pendingCount,
      rejectedCount,
    };
  }, [records]);

  return (
    <div className="grid grid-cols-4 gap-3 p-4 pb-0">
      {/* 本月退料单 */}
      <div className="bg-blue-50 rounded-lg px-4 py-2">
        <p className="text-xs text-blue-600">本月退料单</p>
        <p className="text-lg font-semibold text-blue-800">{summary.monthCount} 单</p>
      </div>

      {/* 本月退料金额 */}
      <div className="bg-emerald-50 rounded-lg px-4 py-2">
        <p className="text-xs text-emerald-600">本月退料金额</p>
        <p className="text-lg font-semibold text-emerald-800">¥{summary.monthAmount.toLocaleString()}</p>
      </div>

      {/* 待审批：有积压时高亮琥珀色，无积压置灰 */}
      <div className={`rounded-lg px-4 py-2 ${summary.pendingCount > 0 ? 'bg-amber-50' : 'bg-gray-50'}`}>
        <p className={`text-xs ${summary.pendingCount > 0 ? 'text-amber-600' : 'text-gray-500'}`}>待审批</p>
        <p className={`text-lg font-semibold ${summary.pendingCount > 0 ? 'text-amber-800' : 'text-gray-600'}`}>
          {summary.pendingCount} 单
        </p>
      </div>

      {/* 已驳回：有驳回时高亮红色，无驳回置灰 */}
      <div className={`rounded-lg px-4 py-2 ${summary.rejectedCount > 0 ? 'bg-red-50' : 'bg-gray-50'}`}>
        <p className={`text-xs ${summary.rejectedCount > 0 ? 'text-red-600' : 'text-gray-500'}`}>已驳回</p>
        <p className={`text-lg font-semibold ${summary.rejectedCount > 0 ? 'text-red-800' : 'text-gray-600'}`}>
          {summary.rejectedCount} 单
        </p>
      </div>
    </div>
  );
}
