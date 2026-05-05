// ============================================================
// 分级审批徽章组件
// 文件路径：src/components/approval/ApprovalLevelBadge.tsx
// 功能：显示审批级别的徽章和说明
// ============================================================

import React from 'react';
import { Shield, ShieldCheck, ShieldAlert, ShieldX, CheckCircle, Zap, Users, UserCheck } from 'lucide-react';
import { ApprovalLevel, APPROVAL_LEVEL_NAMES } from '../../config/approvalHierarchy';

// ============================================================
// 审批级别配置
// ============================================================

const LEVEL_CONFIG: Record<ApprovalLevel, {
  icon: React.ReactNode;
  bgColor: string;
  textColor: string;
  borderColor: string;
}> = {
  [ApprovalLevel.EXEMPT]: {
    icon: <CheckCircle className="w-4 h-4" />,
    bgColor: 'bg-green-50',
    textColor: 'text-green-700',
    borderColor: 'border-green-200',
  },
  [ApprovalLevel.QUICK]: {
    icon: <Zap className="w-4 h-4" />,
    bgColor: 'bg-yellow-50',
    textColor: 'text-yellow-700',
    borderColor: 'border-yellow-200',
  },
  [ApprovalLevel.STANDARD]: {
    icon: <Users className="w-4 h-4" />,
    bgColor: 'bg-blue-50',
    textColor: 'text-blue-700',
    borderColor: 'border-blue-200',
  },
  [ApprovalLevel.STRICT]: {
    icon: <ShieldX className="w-4 h-4" />,
    bgColor: 'bg-red-50',
    textColor: 'text-red-700',
    borderColor: 'border-red-200',
  },
};

// ============================================================
// Props 类型定义
// ============================================================

interface ApprovalLevelBadgeProps {
  /** 审批级别 */
  level: ApprovalLevel | string;
  /** 是否显示图标 */
  showIcon?: boolean;
  /** 是否显示描述 */
  showDescription?: boolean;
  /** 是否为紧凑模式 */
  compact?: boolean;
  /** 自定义样式 */
  className?: string;
}

interface ApprovalLevelInfoProps {
  /** 审批级别 */
  level: ApprovalLevel | string;
  /** 审批人数 */
  approverCount?: number;
  /** 是否自动通过 */
  autoApprove?: boolean;
  /** 自定义说明 */
  customReason?: string;
}

// ============================================================
// 审批级别徽章组件
// ============================================================

export function ApprovalLevelBadge({
  level,
  showIcon = true,
  compact = false,
  className = '',
}: ApprovalLevelBadgeProps) {
  const validLevel = Object.values(ApprovalLevel).includes(level as ApprovalLevel)
    ? (level as ApprovalLevel)
    : ApprovalLevel.STANDARD;

  const config = LEVEL_CONFIG[validLevel];
  const name = APPROVAL_LEVEL_NAMES[validLevel] || '未知级别';

  if (compact) {
    return (
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${config.bgColor} ${config.textColor} ${className}`}
      >
        {showIcon && config.icon}
        {name}
      </span>
    );
  }

  return (
    <span
      className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-lg border ${config.bgColor} ${config.textColor} ${config.borderColor} ${className}`}
    >
      {showIcon && config.icon}
      <span className="font-medium">{name}</span>
    </span>
  );
}

// ============================================================
// 审批级别信息组件
// ============================================================

export function ApprovalLevelInfo({
  level,
  approverCount = 0,
  autoApprove = false,
  customReason,
}: ApprovalLevelInfoProps) {
  const validLevel = Object.values(ApprovalLevel).includes(level as ApprovalLevel)
    ? (level as ApprovalLevel)
    : ApprovalLevel.STANDARD;

  const config = LEVEL_CONFIG[validLevel];
  const name = APPROVAL_LEVEL_NAMES[validLevel] || '未知级别';

  const defaultReason = autoApprove
    ? '系统自动审批通过，无需人工操作'
    : `需要 ${approverCount} 位审批人进行审批`;

  return (
    <div className={`p-4 rounded-lg border ${config.bgColor} ${config.borderColor}`}>
      <div className="flex items-center gap-2 mb-2">
        <span className={config.textColor}>{config.icon}</span>
        <span className={`font-semibold ${config.textColor}`}>{name}</span>
        {autoApprove && (
          <span className="px-2 py-0.5 bg-green-100 text-green-700 text-xs rounded-full">
            自动通过
          </span>
        )}
      </div>
      <p className={`text-sm ${config.textColor} opacity-80`}>
        {customReason || defaultReason}
      </p>
    </div>
  );
}

// ============================================================
// 审批级别说明组件（用于表单提示）
// ============================================================

interface ApprovalLevelTooltipProps {
  type: string;
  amount: number;
  reason: string;
}

export function ApprovalLevelTooltip({ type, amount, reason }: ApprovalLevelTooltipProps) {
  return (
    <div className="text-xs text-gray-500 space-y-1">
      <div className="flex items-center gap-2">
        <span className="text-gray-400">类型:</span>
        <span className="text-gray-700">{type}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">金额:</span>
        <span className="text-gray-700">¥{amount.toLocaleString()}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className="text-gray-400">原因:</span>
        <span className="text-gray-700">{reason}</span>
      </div>
    </div>
  );
}

export default ApprovalLevelBadge;
