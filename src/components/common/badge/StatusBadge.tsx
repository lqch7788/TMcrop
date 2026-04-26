import React from 'react';
import { Tag } from 'antd';
import { ApprovalStatus, getApprovalStatusName } from '../../../types/approval';

/**
 * StatusBadge - 审批状态标签组件
 * 各状态对应颜色正确：绿色=通过，黄色=待处理，红色=拒绝
 */
interface StatusBadgeProps {
  status: ApprovalStatus;
  onClick?: () => void;
}

/**
 * 状态颜色映射
 * - 通过(APPROVED): 绿色 #52C41A
 * - 待处理(PENDING): 黄色 #FAAD14
 * - 拒绝(REJECTED): 红色 #FF4D4F
 * - 草稿(DRAFT): 灰色 #D9D9D9
 * - 部分通过(PARTIALLY_APPROVED): 蓝色 #1677FF
 * - 已撤回(CANCELLED): 灰色 #8C8C8C
 */
const getStatusColor = (status: ApprovalStatus): string => {
  switch (status) {
    case ApprovalStatus.APPROVED:
      return '#52C41A'; // 绿色 - 通过
    case ApprovalStatus.PENDING:
    case ApprovalStatus.PARTIALLY_APPROVED:
      return '#FAAD14'; // 黄色 - 待处理/部分通过
    case ApprovalStatus.REJECTED:
      return '#FF4D4F'; // 红色 - 拒绝
    case ApprovalStatus.DRAFT:
      return '#D9D9D9'; // 灰色 - 草稿
    case ApprovalStatus.CANCELLED:
      return '#8C8C8C'; // 灰色 - 已撤回
    default:
      return '#D9D9D9';
  }
};

const StatusBadge: React.FC<StatusBadgeProps> = ({ status, onClick }) => {
  const color = getStatusColor(status);
  const text = getApprovalStatusName(status);

  return (
    <Tag
      color={color}
      style={{
        cursor: onClick ? 'pointer' : 'default',
        fontWeight: 500,
      }}
      onClick={onClick}
    >
      {text}
    </Tag>
  );
};

export default StatusBadge;
