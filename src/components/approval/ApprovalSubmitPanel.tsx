// ============================================================
// 审批提交面板组件
// 文件路径：src/components/approval/ApprovalSubmitPanel.tsx
// 功能：业务页面提交审批的通用组件
// ============================================================

import React, { useState, useMemo } from 'react';
import { AlertTriangle, CheckCircle, Clock, DollarSign, Info, Send, X } from 'lucide-react';
import { ApprovalType } from '../../types/approval';
import { ApprovalLevel, APPROVAL_LEVEL_NAMES as getApprovalLevelName } from '../../config/approvalHierarchy';
import { useApprovalLevel } from '../../hooks/useApprovalLevel';
import { Button, UnifiedModal } from '@/components/ui';

interface ApprovalSubmitPanelProps {
  /** 审批类型 */
  approvalType: ApprovalType;
  /** 申请金额 */
  amount: number;
  /** 申请人ID */
  applicantId: string;
  /** 申请人名称 */
  applicantName: string;
  /** 申请人部门 */
  applicantDepartment: string;
  /** 业务标题 */
  title: string;
  /** 业务描述 */
  description?: string;
  /** 附加数据 */
  additionalData?: {
    leaveDays?: number;
    overtimeHours?: number;
    isHighValue?: boolean;
  };
  /** 业务关联数据 */
  businessLink?: {
    type: string;
    requestId: string;
    requestCode: string;
    [key: string]: unknown;
  };
  /** 提交前回调 */
  onSubmit?: (approvalData: {
    type: ApprovalType;
    amount: number;
    title: string;
    description?: string;
    approvalLevel: ApprovalLevel;
    approvers: Array<{ userId: string; userName: string; role: string }>;
    autoApprove: boolean;
  }) => void;
  /** 提交后回调 */
  onSuccess?: () => void;
  /** 自定义提交按钮文本 */
  submitText?: string;
  /** 是否显示快速审批提示 */
  showQuickTips?: boolean;
  /** 是否显示金额阈值信息 */
  showAmountThreshold?: boolean;
}

export function ApprovalSubmitPanel({
  approvalType,
  amount,
  applicantId,
  applicantName,
  applicantDepartment,
  title,
  description,
  additionalData,
  businessLink,
  onSubmit,
  onSuccess,
  submitText = '提交审批',
  showQuickTips = true,
  showAmountThreshold = true,
}: ApprovalSubmitPanelProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const { resolveLevel } = useApprovalLevel();

  // 解析审批级别
  const levelResult = useMemo(() => {
    return resolveLevel(approvalType, amount, additionalData);
  }, [approvalType, amount, additionalData, resolveLevel]);

  // 判断审批流程
  const getApprovalFlowInfo = (level: ApprovalLevel, config: any) => {

    if (level === ApprovalLevel.EXEMPT) {
      return {
        icon: <CheckCircle className="w-5 h-5 text-green-600" />,
        color: 'bg-green-50 border-green-200',
        textColor: 'text-green-700',
        title: '免审批',
        description: '金额低于阈值，将自动通过',
      };
    }

    if (level === ApprovalLevel.QUICK) {
      return {
        icon: <Clock className="w-5 h-5 text-yellow-600" />,
        color: 'bg-yellow-50 border-yellow-200',
        textColor: 'text-yellow-700',
        title: `快速审批（${config.name}）`,
        description: '单人审批，快速通过',
      };
    }

    if (level === ApprovalLevel.STANDARD) {
      return {
        icon: <AlertTriangle className="w-5 h-5 text-blue-600" />,
        color: 'bg-blue-50 border-blue-200',
        textColor: 'text-blue-700',
        title: `标准审批（${config.name}）`,
        description: '部门主管 + 经理二级审批',
      };
    }

    return {
      icon: <AlertTriangle className="w-5 h-5 text-red-600" />,
      color: 'bg-red-50 border-red-200',
      textColor: 'text-red-700',
      title: `严格审批（${config.name}）`,
      description: '部门主管 + 经理 + 总监三级审批',
    };
  };

  const flowInfo = getApprovalFlowInfo(resolveLevel || ApprovalLevel.STANDARD, null);

  // 处理提交
  const handleSubmit = async () => {
    if (onSubmit) {
      onSubmit({
        type: approvalType,
        amount,
        title,
        description,
        approvalLevel: levelResult.level,
        approvers: levelResult.approvers,
        autoApprove: levelResult.autoApprove,
      });
    }

    setIsSubmitting(true);

    // 模拟提交
    await new Promise(resolve => setTimeout(resolve, 1000));

    setIsSubmitting(false);
    setShowConfirm(false);

    if (onSuccess) {
      onSuccess();
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-4 py-3 bg-gray-50 border-b border-gray-200">
        <div className="flex items-center gap-2">
          <Send className="w-4 h-4 text-indigo-600" />
          <span className="font-medium text-gray-900">提交审批</span>
        </div>
      </div>

      <div className="p-4 space-y-4">
        {/* 审批级别预览 */}
        <div className={`p-4 rounded-lg border ${flowInfo.color}`}>
          <div className="flex items-start gap-3">
            <div className="mt-0.5">{flowInfo.icon}</div>
            <div className="flex-1">
              <div className={`font-semibold ${flowInfo.textColor}`}>
                {flowInfo.title}
              </div>
              <div className="text-sm text-gray-600 mt-1">
                {flowInfo.description}
              </div>
              <div className="text-xs text-gray-500 mt-2">
                判断依据：{levelResult.reason}
              </div>
            </div>
          </div>
        </div>

        {/* 金额阈值信息 */}
        {showAmountThreshold && (
          <div className="bg-gray-50 rounded-lg p-3">
            <div className="flex items-center gap-2 mb-2">
              <DollarSign className="w-4 h-4 text-gray-500" />
              <span className="text-sm font-medium text-gray-700">金额信息</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">申请金额：</div>
              <div className="font-medium text-gray-900">¥{amount.toLocaleString()}</div>
              <div className="text-gray-500">审批级别：</div>
              <div className="font-medium text-gray-900">
                {getApprovalLevelName(levelResult.level)}
              </div>
            </div>
          </div>
        )}

        {/* 快速提示 */}
        {showQuickTips && levelResult.autoApprove && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-3">
            <div className="flex items-start gap-2">
              <CheckCircle className="w-4 h-4 text-green-600 mt-0.5" />
              <div className="text-sm text-green-700">
                <p className="font-medium">恭喜！您的申请金额在免审批阈值内</p>
                <p className="mt-1">系统将自动通过，无需等待审批</p>
              </div>
            </div>
          </div>
        )}

        {/* 提交按钮 */}
        <div className="pt-2">
          <Button
            onClick={() => setShowConfirm(true)}
            disabled={isSubmitting}
            className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
          >
            {isSubmitting ? (
              <>
                <span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
                提交中...
              </>
            ) : (
              <>
                <Send className="w-4 h-4" />
                {submitText}
              </>
            )}
          </Button>
        </div>
      </div>

      {/* 确认弹窗 */}
      <UnifiedModal
        isOpen={showConfirm}
        onClose={() => setShowConfirm(false)}
        title="确认提交审批"
        size="md"
        footer={
          <div className="flex gap-3">
            <Button variant="secondary" onClick={() => setShowConfirm(false)} className="flex-1">
              <X className="w-4 h-4" /> 取消
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="flex-1 bg-indigo-600 hover:bg-indigo-700 disabled:bg-indigo-400"
            >
              {isSubmitting ? '提交中...' : '确认提交'}
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div className="bg-gray-50 rounded-lg p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <Info className="w-4 h-4 text-gray-400" />
              <span className="text-gray-600">审批信息</span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div className="text-gray-500">标题：</div>
              <div className="font-medium text-gray-900 truncate">{title}</div>
              <div className="text-gray-500">金额：</div>
              <div className="font-medium text-gray-900">¥{amount.toLocaleString()}</div>
              <div className="text-gray-500">审批级别：</div>
              <div className="font-medium text-gray-900">{flowInfo.title}</div>
              <div className="text-gray-500">审批人数：</div>
              <div className="font-medium text-gray-900">{levelResult.approverCount}人</div>
            </div>
          </div>

          {levelResult.approvers.length > 0 && (
            <div className="bg-gray-50 rounded-lg p-3">
              <div className="text-sm font-medium text-gray-700 mb-2">审批流程：</div>
              <div className="space-y-1">
                {levelResult.approvers.map((approver, index) => (
                  <div key={index} className="flex items-center gap-2 text-sm">
                    <span className="w-5 h-5 rounded-full bg-indigo-100 text-indigo-600 text-xs flex items-center justify-center">
                      {index + 1}
                    </span>
                    <span className="text-gray-900">{approver.userName}</span>
                    <span className="text-gray-400">({approver.role})</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </UnifiedModal>
    </div>
  );
}

export default ApprovalSubmitPanel;
