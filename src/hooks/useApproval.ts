// ============================================================
// 审批Hook - 统一审批数据访问接口 (V2.0 - 对接 Store)
// 文件路径：src/hooks/useApproval.ts
// 架构：组件 → useApproval() → useApprovalStore → enhancedApiClient → API
// ============================================================

import { useCallback, useMemo } from 'react';
import { useApprovalStore } from '../stores/useApprovalStore';
import {
  Approval,
  ApprovalFilters,
  ApprovalStats,
  ApprovalType,
  ApprovalStatus,
  getApprovalTypeName,
  getApprovalStatusName,
} from '../types/approval';

// ============================================================
// Hook 返回类型定义
// ============================================================

export interface UseApprovalReturn {
  approvals: Approval[];
  stats: ApprovalStats;
  filters: ApprovalFilters;
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  resetFilters: () => void;
  addApproval: (approval: Partial<Approval>) => Promise<Approval | null>;
  updateApproval: (id: string, updates: Partial<Approval>) => Promise<void>;
  deleteApproval: (id: string) => Promise<boolean>;
  approve: (id: string, comment?: string) => Promise<void>;
  reject: (id: string, comment: string) => Promise<void>;
  cancel: (id: string, reason?: string) => Promise<void>;
  batchApprove: (ids: string[], comment?: string) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
  getApprovalById: (id: string) => Approval | undefined;
  getApprovalsByType: (type: ApprovalType) => Approval[];
  getApprovalsByStatus: (status: ApprovalStatus) => Approval[];
  getPendingApprovals: () => Approval[];
  getApprovedApprovals: () => Approval[];
  getRejectedApprovals: () => Approval[];
  getMyApprovals: (userId: string) => Approval[];
  getApprovalsByApplicant: (applicantId: string) => Approval[];
  refreshApprovals: () => Promise<void>;
  isLoading: boolean;
  error: string | null;
}

// ============================================================
// 主 Hook：useApproval
// ============================================================

export function useApproval(): UseApprovalReturn {
  // 2026-07-29 死循环修复：改为 selector 单独订阅字段，避免 store 任意字段 set 触发整个 hook 重渲染
  const approvals = useApprovalStore((s) => s.approvals);
  const stats = useApprovalStore((s) => s.stats);
  const filters = useApprovalStore((s) => s.filters);
  const isLoading = useApprovalStore((s) => s.isLoading);
  const error = useApprovalStore((s) => s.error);
  const setFiltersAction = useApprovalStore((s) => s.setFilters);
  const resetFiltersAction = useApprovalStore((s) => s.resetFilters);
  const addApprovalAction = useApprovalStore((s) => s.addApproval);
  const updateApprovalAction = useApprovalStore((s) => s.updateApproval);
  const deleteApprovalAction = useApprovalStore((s) => s.deleteApproval);
  const approveAction = useApprovalStore((s) => s.approve);
  const rejectAction = useApprovalStore((s) => s.reject);
  const cancelAction = useApprovalStore((s) => s.cancel);
  const batchApproveAction = useApprovalStore((s) => s.batchApprove);
  const batchRejectAction = useApprovalStore((s) => s.batchReject);
  const fetchApprovalsAction = useApprovalStore((s) => s.fetchApprovals);

  // 查询方法（从 Store 的 approvals 派生）
  const getApprovalById = useCallback((id: string) => {
    return approvals.find(a => a.id === id);
  }, [approvals]);

  const getApprovalsByType = useCallback((type: ApprovalType) => {
    return approvals.filter(a => a.type === type);
  }, [approvals]);

  const getApprovalsByStatus = useCallback((status: ApprovalStatus) => {
    return approvals.filter(a => a.status === status);
  }, [approvals]);

  const getPendingApprovals = useCallback(() => {
    return approvals.filter(a => a.status === ApprovalStatus.PENDING);
  }, [approvals]);

  const getApprovedApprovals = useCallback(() => {
    return approvals.filter(a =>
      a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED
    );
  }, [approvals]);

  const getRejectedApprovals = useCallback(() => {
    return approvals.filter(a => a.status === ApprovalStatus.REJECTED);
  }, [approvals]);

  const getMyApprovals = useCallback((userId: string) => {
    return approvals.filter(a =>
      a.status === ApprovalStatus.PENDING &&
      a.approvers.some(approver => approver.userId === userId && approver.status === 'pending')
    );
  }, [approvals]);

  const getApprovalsByApplicant = useCallback((applicantId: string) => {
    return approvals.filter(a => a.applicantId === applicantId);
  }, [approvals]);

  return useMemo(() => ({
    approvals,
    stats,
    filters,
    setFilters: setFiltersAction,
    resetFilters: resetFiltersAction,
    addApproval: addApprovalAction,
    updateApproval: updateApprovalAction,
    deleteApproval: deleteApprovalAction,
    approve: approveAction,
    reject: rejectAction,
    cancel: cancelAction,
    batchApprove: batchApproveAction,
    batchReject: batchRejectAction,
    getApprovalById,
    getApprovalsByType,
    getApprovalsByStatus,
    getPendingApprovals,
    getApprovedApprovals,
    getRejectedApprovals,
    getMyApprovals,
    getApprovalsByApplicant,
    refreshApprovals: fetchApprovalsAction,
    isLoading,
    error,
  }), [
    approvals, stats, filters, isLoading, error,
    setFiltersAction, resetFiltersAction,
    addApprovalAction, updateApprovalAction, deleteApprovalAction,
    approveAction, rejectAction, cancelAction,
    batchApproveAction, batchRejectAction, fetchApprovalsAction,
    getApprovalById, getApprovalsByType, getApprovalsByStatus,
    getPendingApprovals, getApprovedApprovals, getRejectedApprovals,
    getMyApprovals, getApprovalsByApplicant,
  ]);
}

// ============================================================
// 便捷Hook：获取待办审批
// ============================================================

export function usePendingApprovals() {
  // 2026-07-29 死循环修复：selector 化
  const approvals = useApprovalStore((s) => s.approvals);
  const approveAction = useApprovalStore((s) => s.approve);
  const rejectAction = useApprovalStore((s) => s.reject);
  const pendingApprovals = useMemo(() =>
    approvals.filter(a => a.status === ApprovalStatus.PENDING),
    [approvals]
  );

  return {
    pendingApprovals,
    pendingCount: pendingApprovals.length,
    getApprovalById: (id: string) => approvals.find(a => a.id === id),
    approve: approveAction,
    reject: rejectAction,
  };
}

// ============================================================
// 便捷Hook：获取已办审批
// ============================================================

export function useApprovedApprovals() {
  // 2026-07-29 死循环修复：selector 化
  const approvals = useApprovalStore((s) => s.approvals);
  const approvedApprovals = useMemo(() =>
    approvals.filter(a =>
      a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED
    ),
    [approvals]
  );

  return {
    approvedApprovals,
    approvedCount: approvedApprovals.length,
    getApprovalById: (id: string) => approvals.find(a => a.id === id),
  };
}

// ============================================================
// 便捷Hook：获取我提交的审批
// ============================================================

interface UseMyApprovalsProps {
  applicantId: string;
}

export function useMyApprovals(props?: UseMyApprovalsProps) {
  // 2026-07-29 死循环修复：selector 化
  const approvals = useApprovalStore((s) => s.approvals);
  const cancelAction = useApprovalStore((s) => s.cancel);

  const myApprovals = useMemo(() => {
    if (props?.applicantId) {
      return approvals.filter(a => a.applicantId === props.applicantId);
    }
    // 默认使用当前登录用户ID
    const userId = localStorage.getItem('userId') || 'current_user';
    return approvals.filter(a => a.applicantId === userId);
  }, [approvals, props?.applicantId]);

  return {
    myApprovals,
    mySubmittedCount: myApprovals.length,
    getApprovalById: (id: string) => approvals.find(a => a.id === id),
    cancel: cancelAction,
  };
}

// ============================================================
// 便捷Hook：获取HR审批
// ============================================================

export function useHrApprovals() {
  // 2026-07-29 死循环修复：selector 化
  const approvals = useApprovalStore((s) => s.approvals);
  const approveAction = useApprovalStore((s) => s.approve);
  const rejectAction = useApprovalStore((s) => s.reject);

  const hrApprovals = useMemo(() =>
    approvals.filter(a => a.category === 'hr'),
    [approvals]
  );

  const leaveApprovals = useMemo(() =>
    hrApprovals.filter(a => a.type === ApprovalType.LEAVE),
    [hrApprovals]
  );

  const overtimeApprovals = useMemo(() =>
    hrApprovals.filter(a => a.type === ApprovalType.OVERTIME),
    [hrApprovals]
  );

  const transferApprovals = useMemo(() =>
    hrApprovals.filter(a => a.type === ApprovalType.TRANSFER),
    [hrApprovals]
  );

  const resignApprovals = useMemo(() =>
    hrApprovals.filter(a => a.type === ApprovalType.RESIGNATION),
    [hrApprovals]
  );

  return {
    hrApprovals,
    leaveApprovals,
    overtimeApprovals,
    transferApprovals,
    resignApprovals,
    getApprovalById: (id: string) => approvals.find(a => a.id === id),
    approve: approveAction,
    reject: rejectAction,
  };
}

export default useApproval;
