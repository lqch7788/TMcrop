// ============================================================
// 审批时间轴组件
// 文件路径：src/components/approval/ApprovalTimeline.tsx
// 组件化结构：展示审批流程的时间线
// ============================================================

import React from 'react';
import { CheckCircle, XCircle, Clock, User, AlertTriangle } from 'lucide-react';
import type { ApprovalRecord, Approver } from '../../types/approval';

interface ApprovalTimelineProps {
  records: ApprovalRecord[];
  approvers: Approver[];
  currentStep: number;
}

export function ApprovalTimeline({ records, approvers, currentStep }: ApprovalTimelineProps) {
  // 获取审批记录对应的步骤
  const getStepFromRecord = (record: ApprovalRecord): number => {
    const approver = approvers.find(a => a.userId === record.approverId);
    return approver?.order || 0;
  };

  // 排序记录（按时间）
  const sortedRecords = [...records].sort(
    (a, b) => new Date(b.actionTime).getTime() - new Date(a.actionTime).getTime()
  );

  // 获取动作图标
  const getActionIcon = (action: string) => {
    switch (action) {
      case 'approve':
        return <CheckCircle className="w-5 h-5 text-emerald-600" />;
      case 'reject':
        return <XCircle className="w-5 h-5 text-red-600" />;
      case 'partially_approve':
        return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'cancel':
        return <XCircle className="w-5 h-5 text-gray-600" />;
      default:
        return <Clock className="w-5 h-5 text-gray-400" />;
    }
  };

  // 获取动作文本
  const getActionText = (action: string): string => {
    switch (action) {
      case 'approve':
        return '审批通过';
      case 'reject':
        return '审批拒绝';
      case 'partially_approve':
        return '部分通过';
      case 'cancel':
        return '已撤回';
      default:
        return action;
    }
  };

  // 格式化时间
  const formatTime = (timeStr: string): string => {
    try {
      const date = new Date(timeStr);
      return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return timeStr;
    }
  };

  return (
    <div className="space-y-4">
      <h4 className="text-sm font-semibold text-gray-900">审批流程</h4>

      {/* 时间线 */}
      <div className="relative">
        {approvers.map((approver, index) => {
          const isCompleted = approver.status === 'approved' || approver.status === 'rejected' || approver.status === 'partially_approved';
          const isCurrent = approver.order === currentStep && approver.status === 'pending';
          const isFuture = approver.order > currentStep;

          // 查找对应的审批记录
          const record = records.find(r => {
            const recordApprover = approvers.find(a => a.userId === r.approverId);
            return recordApprover?.order === approver.order;
          });

          return (
            <div key={approver.userId + approver.order} className="relative flex gap-4">
              {/* 时间线连接线 */}
              {index > 0 && (
                <div
                  className={`absolute left-[19px] top-0 w-0.5 h-4 -translate-y-4 ${
                    isCompleted || isCurrent ? 'bg-emerald-600' : 'bg-gray-200'
                  }`}
                />
              )}

              {/* 图标 */}
              <div className="relative z-10 flex-shrink-0">
                {isCompleted ? (
                  getActionIcon(record?.action || approver.status)
                ) : isCurrent ? (
                  <div className="w-10 h-10 rounded-full bg-yellow-100 border-2 border-yellow-500 flex items-center justify-center">
                    <User className="w-5 h-5 text-yellow-600" />
                  </div>
                ) : (
                  <div className="w-10 h-10 rounded-full bg-gray-100 border-2 border-gray-400 flex items-center justify-center">
                    <Clock className="w-5 h-5 text-gray-400" />
                  </div>
                )}
              </div>

              {/* 内容 */}
              <div className="flex-1 pb-6">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{approver.userName}</span>
                  <span className="text-xs px-2 py-0.5 bg-gray-100 text-gray-600 rounded">
                    {approver.role || '审批人'}
                  </span>
                  {isCurrent && (
                    <span className="text-xs px-2 py-0.5 bg-yellow-100 text-yellow-700 rounded">
                      待审批
                    </span>
                  )}
                </div>

                {/* 状态 */}
                <div className="mt-1">
                  {approver.status === 'approved' && (
                    <span className="text-sm text-emerald-600">已通过</span>
                  )}
                  {approver.status === 'rejected' && (
                    <span className="text-sm text-red-600">已拒绝</span>
                  )}
                  {approver.status === 'partially_approved' && (
                    <span className="text-sm text-amber-600">部分通过</span>
                  )}
                  {approver.status === 'pending' && !isCurrent && (
                    <span className="text-sm text-gray-400">等待中</span>
                  )}
                  {approver.status === 'skipped' && (
                    <span className="text-sm text-gray-400">已跳过</span>
                  )}
                </div>

                {/* 审批记录详情 */}
                {record && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <div className="flex items-center gap-2 text-sm">
                      {getActionIcon(record.action)}
                      <span className="text-gray-700">{getActionText(record.action)}</span>
                    </div>
                    {record.comment && (
                      <p className="mt-1 text-sm text-gray-600 pl-7">{record.comment}</p>
                    )}
                    <p className="mt-1 text-xs text-gray-400 pl-7">
                      {formatTime(record.actionTime)}
                    </p>
                  </div>
                )}

                {/* 当前审批人提示 */}
                {isCurrent && !record && (
                  <div className="mt-2 p-3 bg-yellow-50 border border-yellow-200 rounded-lg">
                    <p className="text-sm text-yellow-800">
                      <AlertTriangle className="w-4 h-4 inline mr-1" />
                      等待此审批人处理
                    </p>
                  </div>
                )}

                {/* 未来审批人 */}
                {isFuture && (
                  <div className="mt-2 p-3 bg-gray-50 rounded-lg">
                    <p className="text-sm text-gray-500">等待前序审批完成后此审批人将收到通知</p>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* 统计信息 */}
      <div className="pt-4 border-t border-gray-100">
        <div className="flex gap-4 text-sm text-gray-500">
          <span>审批进度：{approvers.filter(a => a.status !== 'pending').length}/{approvers.length}</span>
          <span>·</span>
          <span>当前步骤：第 {currentStep} 步</span>
        </div>
      </div>
    </div>
  );
}

export default ApprovalTimeline;
