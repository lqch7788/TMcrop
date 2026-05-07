// ============================================================
// 人工管理模块 - HR审批类型定义
// 文件路径：src/types/labor/approval.ts
//
// 提供人工管理模块特有的标签映射
// ============================================================

// 导入主类型文件中的枚举（避免循环依赖）
import { ApprovalStatus } from '../approval';

// 重新导出 ApprovalType 和 ApprovalStatus
export { ApprovalType, ApprovalStatus } from '../approval';
// 重新导出 getApprovalTypeName 和 getApprovalStatusName 函数
export { getApprovalTypeName, getApprovalStatusName } from '../approval';

// ============================================================
// 审批状态标签 - 状态对应的中文label和颜色
// ============================================================

export interface ApprovalStatusLabel {
  label: string;       // 中文标签
  color: string;        // 对应颜色值（Tailwind CSS类名或十六进制）
  bgColor: string;      // 背景色
  borderColor: string;  // 边框色
}

/**
 * 审批状态标签映射表
 * 用于在UI中展示审批状态的中文名称和对应颜色
 */
export const ApprovalStatusLabels: Record<ApprovalStatus, ApprovalStatusLabel> = {
  [ApprovalStatus.DRAFT]: {
    label: '草稿',
    color: 'text-gray-600',
    bgColor: 'bg-gray-100',
    borderColor: 'border-gray-300',
  },
  [ApprovalStatus.PENDING]: {
    label: '待审批',
    color: 'text-yellow-700',
    bgColor: 'bg-yellow-50',
    borderColor: 'border-yellow-300',
  },
  [ApprovalStatus.APPROVED]: {
    label: '已通过',
    color: 'text-green-700',
    bgColor: 'bg-green-50',
    borderColor: 'border-green-300',
  },
  [ApprovalStatus.REJECTED]: {
    label: '已拒绝',
    color: 'text-red-700',
    bgColor: 'bg-red-50',
    borderColor: 'border-red-300',
  },
  [ApprovalStatus.CANCELLED]: {
    label: '已取消',
    color: 'text-gray-500',
    bgColor: 'bg-gray-50',
    borderColor: 'border-gray-200',
  },
};
