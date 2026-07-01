// ============================================================
// 审批列表组件
// 文件路径：src/components/approval/ApprovalList.tsx
// 组件化结构：统一的审批列表展示
// ============================================================

import React from 'react';
import { AlertTriangle, Check, CheckCircle, ChevronRight, Clock, XCircle } from 'lucide-react';
import { type Approval } from '../../types/approval';
// tsc 1361: ApprovalStatus 在原模块被 'import type' 导入，但这里当值用。改为值导入。
import * as ApprovalNS from '../../types/approval';
const { ApprovalStatus } = ApprovalNS as any;
import { ApprovalLevelBadge } from './ApprovalLevelBadge';
import { ApprovalLevel } from '../../config/approvalHierarchy';
import { Button } from '@/components/ui';

interface ApprovalListProps {
  approvals: Approval[];
  onView?: (id: string) => void;
  onApprove?: (id: string) => void;
  onReject?: (id: string) => void;
  onPartialApprove?: (approval: Approval) => void;
  showActions?: boolean;
  emptyText?: string;
  // 权限控制 props，默认都为 true
  canApprove?: boolean;
  canReject?: boolean;
  canExport?: boolean;
}

export function ApprovalList({
  approvals,
  onView,
  onApprove,
  onReject,
  onPartialApprove,
  showActions = true,
  emptyText = '暂无审批记录',
  canApprove = true,
  canReject = true,
  canExport = true,
}: ApprovalListProps) {
  const getStatusIcon = (status: any) => {
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

  const getStatusText = (status: any) => {
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

  const getStatusBadgeClass = (status: any) => {
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
                <div className="flex items-center gap-2 mt-2 flex-wrap">
                  <span className="px-2 py-0.5 bg-gray-100 text-gray-700 text-xs rounded-full">
                    {approval.typeName}
                  </span>
                  {approval.approvalLevel && (
                    <ApprovalLevelBadge level={approval.approvalLevel} compact />
                  )}
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
                <Button variant="ghost" size="sm" onClick={() => onView(approval.id)} className="text-emerald-600 hover:text-emerald-700 p-0 h-auto">
                  查看详情 <ChevronRight className="w-4 h-4" />
                </Button>
              )}
            </div>
          </div>

          {showActions && approval.status === ApprovalStatus.PENDING && (
            <div className="mt-4 pt-4 border-t border-gray-100 flex gap-2">
              {onApprove && canApprove && (
                <Button onClick={() => onApprove(approval.id)}>
                  <Check className="w-4 h-4" /> 通过
                </Button>
              )}
              {onPartialApprove && canApprove && (
                <Button variant="secondary" onClick={() => onPartialApprove(approval)}>
                  <Check className="w-4 h-4" /> 部分通过
                </Button>
              )}
              {onReject && canReject && (
                <Button variant="destructive" onClick={() => onReject(approval.id)}>
                  <XCircle className="w-4 h-4" /> 拒绝
                </Button>
              )}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default ApprovalList;
