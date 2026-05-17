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
  const store = useApprovalStore();

  // 查询方法（从 Store 的 approvals 派生）
  const getApprovalById = useCallback((id: string) => {
    return store.approvals.find(a => a.id === id);
  }, [store.approvals]);

  const getApprovalsByType = useCallback((type: ApprovalType) => {
    return store.approvals.filter(a => a.type === type);
  }, [store.approvals]);

  const getApprovalsByStatus = useCallback((status: ApprovalStatus) => {
    return store.approvals.filter(a => a.status === status);
  }, [store.approvals]);

  const getPendingApprovals = useCallback(() => {
    return store.approvals.filter(a => a.status === ApprovalStatus.PENDING);
  }, [store.approvals]);

  const getApprovedApprovals = useCallback(() => {
    return store.approvals.filter(a =>
      a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED
    );
  }, [store.approvals]);

  const getRejectedApprovals = useCallback(() => {
    return store.approvals.filter(a => a.status === ApprovalStatus.REJECTED);
  }, [store.approvals]);

  const getMyApprovals = useCallback((userId: string) => {
    return store.approvals.filter(a =>
      a.status === ApprovalStatus.PENDING &&
      a.approvers.some(approver => approver.userId === userId && approver.status === 'pending')
    );
  }, [store.approvals]);

  const getApprovalsByApplicant = useCallback((applicantId: string) => {
    return store.approvals.filter(a => a.applicantId === applicantId);
  }, [store.approvals]);

  return useMemo(() => ({
    approvals: store.approvals,
    stats: store.stats,
    filters: store.filters,
    setFilters: store.setFilters,
    resetFilters: store.resetFilters,
    addApproval: store.addApproval,
    updateApproval: store.updateApproval,
    deleteApproval: store.deleteApproval,
    approve: store.approve,
    reject: store.reject,
    cancel: store.cancel,
    batchApprove: store.batchApprove,
    batchReject: store.batchReject,
    getApprovalById,
    getApprovalsByType,
    getApprovalsByStatus,
    getPendingApprovals,
    getApprovedApprovals,
    getRejectedApprovals,
    getMyApprovals,
    getApprovalsByApplicant,
    refreshApprovals: store.fetchApprovals,
    isLoading: store.isLoading,
    error: store.error,
  }), [
    store.approvals, store.stats, store.filters,
    store.setFilters, store.resetFilters,
    store.addApproval, store.updateApproval, store.deleteApproval,
    store.approve, store.reject, store.cancel,
    store.batchApprove, store.batchReject,
    store.fetchApprovals, store.isLoading, store.error,
    getApprovalById, getApprovalsByType, getApprovalsByStatus,
    getPendingApprovals, getApprovedApprovals, getRejectedApprovals,
    getMyApprovals, getApprovalsByApplicant,
  ]);
}

// ============================================================
// 便捷Hook：获取待办审批
// ============================================================

export function usePendingApprovals() {
  const store = useApprovalStore();
  const pendingApprovals = useMemo(() =>
    store.approvals.filter(a => a.status === ApprovalStatus.PENDING),
    [store.approvals]
  );

  return {
    pendingApprovals,
    pendingCount: pendingApprovals.length,
    getApprovalById: (id: string) => store.approvals.find(a => a.id === id),
    approve: store.approve,
    reject: store.reject,
  };
}

// ============================================================
// 便捷Hook：获取已办审批
// ============================================================

export function useApprovedApprovals() {
  const store = useApprovalStore();
  const approvedApprovals = useMemo(() =>
    store.approvals.filter(a =>
      a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED
    ),
    [store.approvals]
  );

  return {
    approvedApprovals,
    approvedCount: approvedApprovals.length,
    getApprovalById: (id: string) => store.approvals.find(a => a.id === id),
  };
}

// ============================================================
// 便捷Hook：获取我提交的审批
// ============================================================

interface UseMyApprovalsProps {
  applicantId: string;
}

export function useMyApprovals(props?: UseMyApprovalsProps) {
  const store = useApprovalStore();

  const myApprovals = useMemo(() => {
    if (props?.applicantId) {
      return store.approvals.filter(a => a.applicantId === props.applicantId);
    }
    // 默认使用当前登录用户ID
    const userId = localStorage.getItem('userId') || 'current_user';
    return store.approvals.filter(a => a.applicantId === userId);
  }, [store.approvals, props?.applicantId]);

  return {
    myApprovals,
    mySubmittedCount: myApprovals.length,
    getApprovalById: (id: string) => store.approvals.find(a => a.id === id),
    cancel: store.cancel,
  };
}

// ============================================================
// 便捷Hook：获取HR审批
// ============================================================

export function useHrApprovals() {
  const store = useApprovalStore();

  const hrApprovals = useMemo(() =>
    store.approvals.filter(a => a.category === 'hr'),
    [store.approvals]
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
    getApprovalById: (id: string) => store.approvals.find(a => a.id === id),
    approve: store.approve,
    reject: store.reject,
  };
}

export default useApproval;
