import React from 'react';
import { Badge } from '@/components/ui';
import { ApprovalStatus, getApprovalStatusName } from '../../../types/approval';

/**
 * StatusBadge - 审批状态标签组件
 * 各状态对应颜色正确：绿色=通过，黄色=待处理，红色=拒绝
 * 从 antd Tag 替换为 @/components/ui Badge
 */
interface StatusBadgeProps {
  status: ApprovalStatus;
  onClick?: () => void;
}

/**
 * 状态颜色映射 - 对应 Badge variant
 * - 通过(APPROVED): success 绿色
 * - 待处理(PENDING): warning 黄色
 * - 拒绝(REJECTED): destructive 红色
 * - 草稿(DRAFT): secondary 灰色
 * - 部分通过(PARTIALLY_APPROVED): warning 黄色
 * - 已撤回(CANCELLED): secondary 灰色
 */
const getStatusVariant = (status: ApprovalStatus): 'success' | 'warning' | 'destructive' | 'secondary' => {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return 'success';
    case ApprovalStatus.PENDING:
    case ApprovalStatus.PARTIALLY_APPROVED:
      return 'warning';
    case ApprovalStatus.REJECTED:
      return 'destructive';
    case ApprovalStatus.DRAFT:
    case ApprovalStatus.CANCELLED:
      return 'secondary';
    default:
      return 'secondary';
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick }) => {
  const variant = getStatusVariant(status);
  const text = getApprovalStatusName(status);

  return (
    <Badge
      variant={variant}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        fontWeight: 500,
      }}
      onClick={onClick}
    >
      {text}
    </Badge>
  );
};

export default StatusBadge;
