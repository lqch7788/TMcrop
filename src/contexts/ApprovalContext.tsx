// ============================================================
// 审批中心 - 全局审批Context (V2.1 - 委托到 Zustand Store)
// 文件路径：src/contexts/ApprovalContext.tsx
// 架构：Context(薄封装层) → useApprovalStore → enhancedApiClient → API
// 说明：保留Context包装层以兼容现有组件，所有数据操作委托到Store
// ============================================================

import React, { createContext, useContext, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { storageGet } from '../lib/storageService';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  ApprovalFilters,
  ApprovalStats,
} from '../types/approval';
import { useApprovalStore } from '../stores/useApprovalStore';
import {
  executeApprovalIntegration,
  registerApprovalIntegration,
  registerAllHandlers,
} from '../types/approvalIntegration';
import { registerBusinessIntegration } from '../services/approvalBusinessIntegration';
import { approvalTimeoutService, useTimeoutChecker } from '../services/approvalTimeoutService';
import { TimeoutCheckResult } from '../config/approvalTimeout';

// ============================================================
// Context Value 类型定义 (保持兼容)
// ============================================================

interface ApprovalContextValue {
  // 状态
  approvals: Approval[];
  filters: ApprovalFilters;
  stats: ApprovalStats;
  isLoaded: boolean;

  // 原始状态（兼容旧接口，返回Store快照的近似值）
  getState: () => { approvals: Approval[]; filters: ApprovalFilters };

  // 筛选方法
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
  batchApprove: (ids: string[], comment?: string) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;

  // 查询方法
  getApprovalById: (id: string) => Approval | undefined;
  getApprovalsByType: (type: ApprovalType) => Approval[];
  getApprovalsByStatus: (status: ApprovalStatus) => Approval[];
  getPendingApprovals: () => Approval[];
  getApprovedApprovals: () => Approval[];
  getRejectedApprovals: () => Approval[];
  getMyApprovals: (userId: string) => Approval[];
  getApprovalsByApplicant: (applicantId: string) => Approval[];

  // 辅助方法
  getFilteredApprovals: () => Approval[];
  getStatusText: (status: ApprovalStatus) => string;
  getTypeText: (type: ApprovalType) => string;

  // 刷新方法
  refreshApprovals: () => Promise<void>;
}

const ApprovalContext = createContext<ApprovalContextValue | null>(null);

// ============================================================
// Provider Props
// ============================================================

interface ApprovalProviderProps {
  children: ReactNode;
  initialApprovals?: Approval[];
}

// ============================================================
// Provider 实现 — 委托到 useApprovalStore
// ============================================================

// 清除 localStorage（兼容旧接口，实际已无 localStorage）
export const clearApprovalsStorage = () => {};

export function ApprovalProvider({ children, initialApprovals: _initialApprovals }: ApprovalProviderProps) {
  // 直接使用 Zustand Store 作为唯一数据源
  const store = useApprovalStore();

  // 注册业务联动处理器（仅注册一次）
  useEffect(() => {
    registerAllHandlers();
    registerBusinessIntegration();
  }, []);

  // 超时检测处理器
  const handleTimeoutFound = useCallback((approval: Approval, result: TimeoutCheckResult) => {
    console.log('【审批中心】发现超时审批', {
      approvalCode: approval.code,
      level: result.level,
      waitedHours: result.waitedHours.toFixed(1),
    });
  }, []);

  // 启动定时超时检查（从Store获取approvals）
  useTimeoutChecker(store.approvals, handleTimeoutFound, 5 * 60 * 1000);

  // 统计数据（从Store的approvals计算，含超时统计）
  const stats = useMemo<ApprovalStats>(() => {
    const timeoutStats = approvalTimeoutService.getTimeoutStats(store.approvals);
    return {
      total: store.approvals.length,
      pending: store.approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
      approved: store.approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
      rejected: store.approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
      partiallyApproved: store.approvals.filter(a => a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
      myPending: 0,
      mySubmitted: 0,
      overdue: timeoutStats.overdue + timeoutStats.ultimate,
      urgent: store.approvals.filter(a => a.priority === 'urgent' && a.status === ApprovalStatus.PENDING).length,
    };
  }, [store.approvals]);

  // 获取当前状态快照（兼容旧接口）
  const getState = useCallback(() => ({
    approvals: useApprovalStore.getState().approvals,
    filters: useApprovalStore.getState().filters,
  }), []);

  // 筛选方法 — 委托到Store
  const setFilters = useCallback((filters: Partial<ApprovalFilters>) => {
    store.setFilters(filters);
  }, [store.setFilters]);

  const resetFilters = useCallback(() => {
    store.resetFilters();
  }, [store.resetFilters]);

  // CRUD 操作 — 委托到Store
  const addApproval = useCallback(async (approval: Approval) => {
    await store.addApproval(approval);
  }, [store.addApproval]);

  const updateApproval = useCallback(async (id: string, updates: Partial<Approval>) => {
    await store.updateApproval(id, updates);
  }, [store.updateApproval]);

  const deleteApproval = useCallback(async (id: string) => {
    await store.deleteApproval(id);
  }, [store.deleteApproval]);

  // 审批操作 — 先执行业务联动，再委托到Store
  const approve = useCallback(async (id: string, comment?: string) => {
    const approval = store.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('approved', approval, { comment });
    }
    await store.approve(id, comment);
  }, [store.approvals, store.approve]);

  const reject = useCallback(async (id: string, comment: string) => {
    const approval = store.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('rejected', approval, { reason: comment });
    }
    await store.reject(id, comment);
  }, [store.approvals, store.reject]);

  const partiallyApprove = useCallback(async (id: string, items: Record<string, number>, comment?: string) => {
    const approval = store.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('partially_approved', approval, { approvedItems: items, comment });
    }
    const approverId = storageGet('userId') || '';
    const approverName = storageGet('username') || '系统';
    try {
      const { enhancedApiClient } = await import('../lib/apiClient');
      await enhancedApiClient.patch(`/api/approvals/${id}/action`, {
        action: 'partially_approve', comment, approvedItems: items, approverId, approverName,
      });
      await store.fetchApprovals();
    } catch (error) {
      console.error('Failed to partially approve:', error);
    }
  }, [store.approvals, store.fetchApprovals]);

  const cancel = useCallback(async (id: string, reason?: string) => {
    const approval = store.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('cancelled', approval, { reason });
    }
    await store.cancel(id, reason);
  }, [store.approvals, store.cancel]);

  // 批量操作 — 先执行业务联动，再委托到Store
  const batchApprove = useCallback(async (ids: string[], comment?: string) => {
    for (const id of ids) {
      const approval = store.approvals.find(a => a.id === id);
      if (approval) {
        executeApprovalIntegration('approved', approval, { comment });
      }
    }
    await store.batchApprove(ids, comment);
  }, [store.approvals, store.batchApprove]);

  const batchReject = useCallback(async (ids: string[], comment: string) => {
    for (const id of ids) {
      const approval = store.approvals.find(a => a.id === id);
      if (approval) {
        executeApprovalIntegration('rejected', approval, { reason: comment });
      }
    }
    await store.batchReject(ids, comment);
  }, [store.approvals, store.batchReject]);

  // 查询方法 — 从Store数据派生
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

  // 获取筛选后的审批列表
  const getFilteredApprovals = useCallback(() => {
    let result = store.approvals;
    const filters = store.filters;

    if (filters.keyword) {
      const keyword = filters.keyword.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(keyword) ||
        a.applicantName.toLowerCase().includes(keyword) ||
        a.code.toLowerCase().includes(keyword)
      );
    }
    if (filters.type?.length) {
      result = result.filter(a => filters.type!.includes(a.type));
    }
    if (filters.status?.length) {
      result = result.filter(a => filters.status!.includes(a.status));
    }
    if (filters.category?.length) {
      result = result.filter(a => filters.category!.includes(a.category));
    }
    if (filters.department?.length) {
      result = result.filter(a => filters.department!.includes(a.applicantDepartment));
    }
    if (filters.priority?.length) {
      result = result.filter(a => filters.priority!.includes(a.priority));
    }
    if (filters.startDate) {
      result = result.filter(a => a.applyDate >= filters.startDate!);
    }
    if (filters.endDate) {
      result = result.filter(a => a.applyDate <= filters.endDate!);
    }

    return result;
  }, [store.approvals, store.filters]);

  // 辅助方法：获取状态文本
  const getStatusText = useCallback((status: ApprovalStatus): string => {
    const statusMap: Record<ApprovalStatus, string> = {
      [ApprovalStatus.DRAFT]: '草稿',
      [ApprovalStatus.PENDING]: '待审批',
      [ApprovalStatus.APPROVED]: '已通过',
      [ApprovalStatus.PARTIALLY_APPROVED]: '部分通过',
      [ApprovalStatus.REJECTED]: '已拒绝',
      [ApprovalStatus.CANCELLED]: '已撤回',
    };
    return statusMap[status] || status;
  }, []);

  // 辅助方法：获取类型文本
  const getTypeText = useCallback((type: ApprovalType): string => {
    const typeMap: Record<ApprovalType, string> = {
      [ApprovalType.MATERIAL_REQUEST]: '领料单',
      [ApprovalType.PURCHASE_REQUEST]: '采购申请',
      [ApprovalType.PRODUCTION_PLAN]: '生产计划',
      [ApprovalType.HARVEST_REQUEST]: '采收申请',
      [ApprovalType.RETURN_MATERIAL]: '退料单',
      [ApprovalType.LEAVE]: '请假',
      [ApprovalType.OVERTIME]: '加班',
      [ApprovalType.TRANSFER]: '调岗',
      [ApprovalType.RESIGNATION]: '离职',
    };
    return typeMap[type] || type;
  }, []);

  // 刷新审批数据
  const refreshApprovals = useCallback(async () => {
    await store.fetchApprovals();
  }, [store.fetchApprovals]);

  // 合并所有方法到 value
  const value = useMemo<ApprovalContextValue>(() => ({
    approvals: store.approvals,
    filters: store.filters,
    stats,
    isLoaded: store.isLoaded,
    getState,
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
    refreshApprovals,
  }), [
    store.approvals,
    store.filters,
    store.isLoaded,
    stats,
    getState,
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
    refreshApprovals,
  ]);

  return (
    <ApprovalContext.Provider value={value}>
      {children}
    </ApprovalContext.Provider>
  );
}

// ============================================================
// Hook
// ============================================================

export function useApprovalContext(): ApprovalContextValue {
  const context = useContext(ApprovalContext);
  if (!context) {
    throw new Error('useApprovalContext must be used within ApprovalProvider');
  }
  return context;
}

// ============================================================
// 默认导出
// ============================================================

export default ApprovalContext;
