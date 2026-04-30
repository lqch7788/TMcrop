// ============================================================
// 审批列表组件
// 文件路径：src/components/approval/ApprovalList.tsx
// 组件化结构：统一的审批列表展示
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, Clock, ChevronRight, AlertTriangle } from 'lucide-react';
import type { Approval, ApprovalStatus } from '../../types/approval';

interface ApprovalListProps {
  approvals: Approval[];
  onView?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPartialApprove?: (approval: Approval) => void;
  showActions?: boolean;
  emptyText?: string;
}

export function ApprovalList({
  approvals,
  onView,
  onApprove,
  onReject,
  onPartialApprove,
  showActions = true,
  emptyText = '暂无审批记录',
}: ApprovalListProps) {
  const getStatusIcon = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return <CheckCircle className="w-5 h-5 text-emerald-500" />;
      case ApprovalStatus.REJECTED:
        return <XCircle className="w-5 h-5 text-red-500" />;
      case ApprovalStatus.PARTIALLY_APPROVED:
        return <AlertTriangle className="w-5 h-5 text-amber-500" />;
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />;
    }
  };

  const getStatusText = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.DRAFT:
        return '草稿';
      case ApprovalStatus.PENDING:
        return '待审批';
      case ApprovalStatus.APPROVED:
        return '已通过';
      case ApprovalStatus.PARTIALLY_APPROVED:
        return '部分通过';
      case ApprovalStatus.REJECTED:
        return '已拒绝';
      case ApprovalStatus.CANCELLED:
        return '已撤回';
      default:
        return status;
    }
  };

  const getStatusBadgeClass = (status: ApprovalStatus) => {
    switch (status) {
      case ApprovalStatus.APPROVED:
        return 'bg-emerald-100 text-emerald-700';
      case ApprovalStatus.REJECTED:
        return 'bg-red-100 text-red-700';
      case ApprovalStatus.PARTIALLY_APPROVED:
        return 'bg-amber-100 text-amber-700';
      case ApprovalStatus.PENDING:
        return 'bg-yellow-100 text-yellow-700';
      case ApprovalStatus.CANCELLED:
        return 'bg-gray-100 text-gray-700';
      default:
        return 'bg-gray-100 text-gray-700';
    }
  };

  if (approvals.length === 0) {
    return (
      <div className="bg-white rounded-xl p-12 text-center">
        <p className="text-gray-500">{emptyText}</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {approvals.map((approval) => (
        <div
          key={approval.id}
          className="bg-white rounded-xl p-5 shadow-sm border border-gray-100 hover:shadow-md transition-shadow"
        >
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              {getStatusIcon(approval.status)}
              <div>
                <h3 className="font-semibold text-gray-900">{approval.title}</h3>
                <p className="text-sm text-gray-500 mt-1">
                  {approval.applicantName} · {approval.applicantDepartment} · {approval.applyDate}
                </p>
                <div className="flex items-center gap-2 mt-2">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {approval.typeName}
                  </span>
                  <span className="text-xs text-gray-400">
                    审批进度：{approval.currentStep}/{approval.totalSteps}
                  </span>
                  {approval.priority === 'urgent' && (
                    <span className="px-2 py-0.5 bg-red-100 text-red-700 text-xs rounded-full">
                      加急
                    </span>
                  )}
                </div>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className={`px-2 py-1 rounded-full text-xs font-medium ${getStatusBadgeClass(approval.status)}`}>
                {getStatusText(approval.status)}
              </span>
              {onView && (
                <button
                  onClick={() => onView(approval.id)}
                  className="text-emerald-600 hover:text-emerald-700 text-sm font-medium flex items-center gap-1"
                >
                  查看详情 <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </div>
          </div>

          {showActions && approval.status === ApprovalStatus.PENDING && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              {onApprove && (
                <button
                  onClick={() => onApprove(approval.id)}
                  className="h-10 px-4 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 text-sm font-medium"
                >
                  通过
                </button>
              )}
              {onPartialApprove && (
                <button
                  onClick={() => onPartialApprove(approval)}
                  className="h-10 px-4 border border-blue-200 text-blue-600 rounded-lg hover:bg-blue-50 text-sm font-medium"
                >
                  部分通过
                </button>
              )}
              {onReject && (
                <button
                  onClick={() => onReject(approval.id)}
                  className="h-10 px-4 border border-red-200 text-red-600 rounded-lg hover:bg-red-50 text-sm font-medium"
                >
                  拒绝
                </button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ApprovalList;
