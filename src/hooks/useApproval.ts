// ============================================================
// 审批Hook - 统一审批数据访问接口
// 文件路径：src/hooks/useApproval.ts
// 组件化结构：提供简洁的Hook接口访问审批Context
// ============================================================

import { useCallback, useMemo } from 'react';
import { useApprovalContext } from '../contexts/ApprovalContext';
import {
  Approval,
  ApprovalFilters,
  ApprovalStats,
  ApprovalType,
  ApprovalStatus,
} from '../types/approval';

// ============================================================
// Hook 返回类型定义
// ============================================================

export interface UseApprovalReturn {
  // 数据（全部）
  approvals: Approval[];

  // 统计数据
  stats: ApprovalStats;

  // 筛选状态
  filters: ApprovalFilters;

  // 筛选操作
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  resetFilters: () => void;

  // CRUD 操作
  addApproval: (approval: Approval) => void;
  updateApproval: (id: string, updates: Partial<Approval>) => void;
  deleteApproval: (id: string) => void;

  // 审批操作
  approve: (id: string, comment?: string) => void;
  reject: (id: string, comment: string) => void;
  partiallyApprove: (id: string, items: Record<string, number>, comment?: string) => void;
  cancel: (id: string, reason?: string) => void;

  // 批量审批操作
  batchApprove: (ids: string[], comment?: string) => void;
  batchReject: (ids: string[], comment: string) => void;

  // 查询方法
  getApprovalById: (id: string) => Approval | undefined;
  getApprovalsByType: (type: ApprovalType) => Approval[];
  getApprovalsByStatus: (status: ApprovalStatus) => Approval[];
  getPendingApprovals: () => Approval[];
  getApprovedApprovals: () => Approval[];
  getRejectedApprovals: () => Approval[];
  getMyApprovals: (userId: string) => Approval[];
  getApprovalsByApplicant: (applicantId: string) => Approval[];
  getFilteredApprovals: () => Approval[];

  // 辅助方法
  getStatusText: (status: ApprovalStatus) => string;
  getTypeText: (type: ApprovalType) => string;
}

// ============================================================
// Hook 实现
// ============================================================

export function useApproval(): UseApprovalReturn {
  const context = useApprovalContext();

  if (!context) {
    throw new Error('useApproval must be used within ApprovalProvider');
  }

  const {
    approvals,
    stats,
    filters,
    setFilters,
    resetFilters,
    addApproval,
    updateApproval,
    deleteApproval,
    approve,
    reject,
    partiallyApprove,
    cancel,
    batchApprove,
    batchReject,
    getApprovalById,
    getApprovalsByType,
    getApprovalsByStatus,
    getPendingApprovals,
    getApprovedApprovals,
    getRejectedApprovals,
    getMyApprovals,
    getApprovalsByApplicant,
    getFilteredApprovals,
    getStatusText,
    getTypeText,
  } = context;

  return {
    approvals,
    stats,
    filters,
    setFilters,
    resetFilters,
    addApproval,
    updateApproval,
    deleteApproval,
    approve,
    reject,
    partiallyApprove,
    cancel,
    batchApprove,
    batchReject,
    getApprovalById,
    getApprovalsByType,
    getApprovalsByStatus,
    getPendingApprovals,
    getApprovedApprovals,
    getRejectedApprovals,
    getMyApprovals,
    getApprovalsByApplicant,
    getFilteredApprovals,
    getStatusText,
    getTypeText,
  };
}

// ============================================================
// 便捷Hook：获取待办审批
// ============================================================

export function usePendingApprovals() {
  const context = useApprovalContext();

  if (!context) {
    throw new Error('usePendingApprovals must be used within ApprovalProvider');
  }

  const pendingApprovals = context.getPendingApprovals();

  return {
    pendingApprovals,
    pendingCount: pendingApprovals.length,
    getApprovalById: context.getApprovalById,
    approve: context.approve,
    reject: context.reject,
    partiallyApprove: context.partiallyApprove,
  };
}

// ============================================================
// 便捷Hook：获取已办审批
// ============================================================

export function useApprovedApprovals() {
  const context = useApprovalContext();

  if (!context) {
    throw new Error('useApprovedApprovals must be used within ApprovalProvider');
  }

  const approvedApprovals = context.getApprovedApprovals();

  return {
    approvedApprovals,
    approvedCount: approvedApprovals.length,
    getApprovalById: context.getApprovalById,
  };
}

// ============================================================
// 便捷Hook：获取我提交的审批
// ============================================================

interface UseMyApprovalsProps {
  applicantId: string;
}

export function useMyApprovals(props?: UseMyApprovalsProps) {
  const context = useApprovalContext();

  if (!context) {
    throw new Error('useMyApprovals must be used within ApprovalProvider');
  }

  // 如果没有提供 applicantId，返回全部（实际应根据当前用户ID）
  const myApprovals = props?.applicantId
    ? context.getApprovalsByApplicant(props.applicantId)
    : context.approvals;

  return {
    myApprovals,
    mySubmittedCount: myApprovals.length,
    getApprovalById: context.getApprovalById,
    cancel: context.cancel,
  };
}

// ============================================================
// 便捷Hook：获取HR审批（请假/加班/调岗/离职）
// ============================================================

export function useHrApprovals() {
  const context = useApprovalContext();

  if (!context) {
    throw new Error('useHrApprovals must be used within ApprovalProvider');
  }

  const hrApprovals = context.approvals.filter(a =>
    a.category === 'hr'
  );

  const leaveApprovals = hrApprovals.filter(a => a.type === ApprovalType.LEAVE);
  const overtimeApprovals = hrApprovals.filter(a => a.type === ApprovalType.OVERTIME);
  const transferApprovals = hrApprovals.filter(a => a.type === ApprovalType.TRANSFER);
  const resignApprovals = hrApprovals.filter(a => a.type === ApprovalType.RESIGNATION);

  return {
    hrApprovals,
    leaveApprovals,
    overtimeApprovals,
    transferApprovals,
    resignApprovals,
    getApprovalById: context.getApprovalById,
    approve: context.approve,
    reject: context.reject,
    partiallyApprove: context.partiallyApprove,
  };
}

export default useApproval;
