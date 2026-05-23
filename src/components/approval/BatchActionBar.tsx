// ============================================================
// 批量操作栏组件
// 文件路径：src/components/approval/BatchActionBar.tsx
// 组件化结构：支持批量审批操作的选择栏
// ============================================================

import React from 'react';
import { CheckSquare, Square, CheckCircle, XCircle, Download } from 'lucide-react';
import { ApprovalType } from '../../types/approval';
import type { Approval } from '../../types/approval';
import { Button } from '../ui/button';

// HR敏感类型 - 不支持批量审批
const HR_SENSITIVE_TYPES: ApprovalType[] = [
  ApprovalType.RESIGNATION,      // 离职
  ApprovalType.RECRUITMENT,      // 招聘
  ApprovalType.ONBOARDING,       // 入职
  ApprovalType.SALARY_ADJUSTMENT, // 调薪
  ApprovalType.SALARY_BUDGET,    // 工资预算
  ApprovalType.TRANSFER,         // 转岗
];

interface BatchActionBarProps {
  selectedIds: Set<string>;
  allIds: string[];
  pendingApprovals: Approval[];
  onSelectAll: (selectAll: boolean) => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onExport: () => void;
  canApprove?: boolean;
  canReject?: boolean;
  canExport?: boolean;
}

export function BatchActionBar({
  selectedIds,
  allIds,
  pendingApprovals,
  onSelectAll,
  onBatchApprove,
  onBatchReject,
  onExport,
  canApprove = true,
  canReject = true,
  canExport = true,
}: BatchActionBarProps) {
  // 检查是否支持批量审批
  const isBatchSupported = (approval: Approval): boolean => {
    return !HR_SENSITIVE_TYPES.includes(approval.type);
  };

  // 获取可批量操作的待审批单
  const batchSupportedIds = pendingApprovals
    .filter(a => isBatchSupported(a))
    .map(a => a.id);

  // 计算是否全选
  const isAllSelected = selectedIds.size > 0 && selectedIds.size === batchSupportedIds.length;
  const isIndeterminate = selectedIds.size > 0 && selectedIds.size < batchSupportedIds.length;

  // 获取选中的可批量审批单（排除HR敏感类型）
  const selectedBatchApprovals = pendingApprovals.filter(
    a => selectedIds.has(a.id) && isBatchSupported(a)
  );

  // 判断选中项中是否有不支持批量操作的
  const hasUnsupportedSelected = pendingApprovals.some(
    a => selectedIds.has(a.id) && !isBatchSupported(a)
  );

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-center justify-between gap-4">
        {/* 左侧：全选和统计 */}
        <div className="flex items-center gap-4">
          <Button
            variant="ghost"
            onClick={() => onSelectAll(!isAllSelected)}
            className="flex items-center gap-2 text-gray-600 hover:text-gray-900 p-1 h-auto"
          >
            {isAllSelected ? (
              <CheckSquare className="w-5 h-5 text-emerald-600" />
            ) : (
              <Square className="w-5 h-5" />
            )}
            <span className="text-sm font-medium">全选</span>
          </Button>

          <div className="h-6 w-px bg-gray-200" />

          <span className="text-sm text-gray-500">
            已选择 <span className="font-semibold text-gray-900">{selectedIds.size}</span> 项
            {hasUnsupportedSelected && (
              <span className="text-amber-600 ml-1">
                （含{pendingApprovals.filter(a => selectedIds.has(a.id) && !isBatchSupported(a)).length}项不支持批量）
              </span>
            )}
          </span>
        </div>

        {/* 右侧：批量操作按钮 */}
        <div className="flex items-center gap-2">
          {canApprove && (
            <>
              <Button
                onClick={onBatchApprove}
                disabled={selectedBatchApprovals.length === 0}
                className={`
                  ${selectedBatchApprovals.length === 0
                    ? 'bg-emerald-500 text-white cursor-not-allowed opacity-60'
                    : 'bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white shadow-sm'
                  }
                  transition-all duration-200 font-medium
                `}
              >
                <CheckCircle className="w-4 h-4" />
                批量通过
              </Button>
              <Button
                onClick={onBatchReject}
                disabled={selectedBatchApprovals.length === 0}
                className={`
                  ${selectedBatchApprovals.length === 0
                    ? 'bg-red-500 text-white cursor-not-allowed opacity-60'
                    : 'bg-red-600 hover:bg-red-700 active:bg-red-800 text-white shadow-sm'
                  }
                  transition-all duration-200 font-medium
                `}
              >
                <XCircle className="w-4 h-4" />
                批量拒绝
              </Button>
            </>
          )}

          {canExport && (
            <>
              <div className="h-6 w-px bg-gray-200" />
              <Button
                onClick={onExport}
                disabled={selectedIds.size === 0}
                className={`
                  ${selectedIds.size === 0
                    ? 'bg-blue-500 text-white cursor-not-allowed opacity-60'
                    : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white shadow-sm'
                  }
                  transition-all duration-200 font-medium
                `}
              >
                <Download className="w-4 h-4" />
                批量导出
              </Button>
            </>
          )}
        </div>
      </div>

      {/* 提示信息 */}
      {hasUnsupportedSelected && (
        <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
          <p className="text-sm text-amber-800">
            <span className="font-medium">提示：</span>
            以下审批类型不支持批量操作：离职、招聘、入职、调薪、工资预算、转岗
          </p>
        </div>
      )}
    </div>
  );
}

export default BatchActionBar;
