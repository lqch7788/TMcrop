// ============================================================
// 审批中心 - 全局审批Context (V2.1 - 委托到 Zustand Store)
// 文件路径：src/contexts/ApprovalContext.tsx
// 架构：Context(薄封装层) → useApprovalStore → enhancedApiClient → API
// 说明：保留Context包装层以兼容现有组件，所有数据操作委托到Store
// ============================================================

import React, { createContext, useContext, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { storageGet } from '../lib/storageService';
import { logger } from '../lib/logger';
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
  // 2026-07-29 死循环修复：改用 selector 单独订阅字段，避免 store 任意字段 set 触发整 Provider 重渲染
  // （原 `const store = useApprovalStore()` 整对象订阅 + 30+ 个 useCallback/useMemo deps 包含 store.approvals，
  //   会导致 store 任意字段变化 → Provider 重渲染 → 所有 useContext 子组件 re-render）
  const approvals = useApprovalStore((s) => s.approvals);
  const filters = useApprovalStore((s) => s.filters);
  const isLoaded = useApprovalStore((s) => s.isLoaded);
  const setFiltersAction = useApprovalStore((s) => s.setFilters);
  const resetFiltersAction = useApprovalStore((s) => s.resetFilters);
  const addApprovalAction = useApprovalStore((s) => s.addApproval);
  const updateApprovalAction = useApprovalStore((s) => s.updateApproval);
  const deleteApprovalAction = useApprovalStore((s) => s.deleteApproval);
  const approveAction = useApprovalStore((s) => s.approve);
  const rejectAction = useApprovalStore((s) => s.reject);
  const partiallyApproveAction = useApprovalStore((s) => s.partiallyApprove);
  const cancelAction = useApprovalStore((s) => s.cancel);
  const batchApproveAction = useApprovalStore((s) => s.batchApprove);
  const batchRejectAction = useApprovalStore((s) => s.batchReject);
  const fetchApprovalsAction = useApprovalStore((s) => s.fetchApprovals);

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
  useTimeoutChecker(approvals, handleTimeoutFound, 5 * 60 * 1000);

  // 统计数据（从Store的approvals计算，含超时统计）
  // 修复：deps 改用 `approvals` selector 引用，避免整个 Provider 在其他字段变化时重算
  const stats = useMemo<ApprovalStats>(() => {
    const timeoutStats = approvalTimeoutService.getTimeoutStats(approvals);
    return {
      total: approvals.length,
      pending: approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
      approved: approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
      rejected: approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
      partiallyApproved: approvals.filter(a => a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
      myPending: 0,
      mySubmitted: 0,
      overdue: timeoutStats.overdue + timeoutStats.ultimate,
      urgent: approvals.filter(a => a.priority === 'urgent' && a.status === ApprovalStatus.PENDING).length,
    };
  }, [approvals]);

  // 获取当前状态快照（兼容旧接口）
  const getState = useCallback(() => ({
    approvals: useApprovalStore.getState().approvals,
    filters: useApprovalStore.getState().filters,
  }), []);

  // 筛选方法 — 委托到Store
  const setFilters = useCallback((newFilters: Partial<ApprovalFilters>) => {
    setFiltersAction(newFilters);
  }, [setFiltersAction]);

  const resetFilters = useCallback(() => {
    resetFiltersAction();
  }, [resetFiltersAction]);

  // CRUD 操作 — 委托到Store
  const addApproval = useCallback(async (approval: Approval) => {
    await addApprovalAction(approval);
  }, [addApprovalAction]);

  const updateApproval = useCallback(async (id: string, updates: Partial<Approval>) => {
    await updateApprovalAction(id, updates);
  }, [updateApprovalAction]);

  const deleteApproval = useCallback(async (id: string) => {
    await deleteApprovalAction(id);
  }, [deleteApprovalAction]);

  // 审批操作 — 先执行业务联动（已注册到registry），再委托到Store
  // 修复：deps 用 approvals selector 引用
  const approve = useCallback(async (id: string, comment?: string) => {
    const approval = approvals.find(a => a.id === id);
    try {
      if (approval) {
        executeApprovalIntegration('approved', approval, { comment });
      }
    } catch (e) {
      logger.error('业务联动异常（不影响主流程）', e);
    }
    await approveAction(id, comment);
  }, [approvals, approveAction]);

  const reject = useCallback(async (id: string, comment: string) => {
    const approval = approvals.find(a => a.id === id);
    try {
      if (approval) {
        executeApprovalIntegration('rejected', approval, { reason: comment });
      }
    } catch (e) {
      logger.error('业务联动异常（不影响主流程）', e);
    }
    await rejectAction(id, comment);
  }, [approvals, rejectAction]);

  const partiallyApprove = useCallback(async (id: string, items: Record<string, number>, comment?: string) => {
    const approval = approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('partially_approved', approval, { approvedItems: items, comment });
    }
    // 2026-06-04 V2.1 铁律：写操作走 Store action（不再直接 await patch）
    await partiallyApproveAction(id, items, comment);
  }, [approvals, partiallyApproveAction]);

  const cancel = useCallback(async (id: string, reason?: string) => {
    const approval = approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('cancelled', approval, { reason });
    }
    await cancelAction(id, reason);
  }, [approvals, cancelAction]);

  // 批量操作 — 先执行业务联动，再委托到Store
  const batchApprove = useCallback(async (ids: string[], comment?: string) => {
    for (const id of ids) {
      const approval = approvals.find(a => a.id === id);
      if (approval) {
        executeApprovalIntegration('approved', approval, { comment });
      }
    }
    await batchApproveAction(ids, comment);
  }, [approvals, batchApproveAction]);

  const batchReject = useCallback(async (ids: string[], comment: string) => {
    for (const id of ids) {
      const approval = approvals.find(a => a.id === id);
      if (approval) {
        executeApprovalIntegration('rejected', approval, { reason: comment });
      }
    }
    await batchRejectAction(ids, comment);
  }, [approvals, batchRejectAction]);

  // 查询方法 — 从Store数据派生
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

  // 获取筛选后的审批列表
  // 修复：deps 拆成 approvals 和 filters 两个 selector
  const getFilteredApprovals = useCallback(() => {
    let result = approvals;
    const currentFilters = filters;

    if (currentFilters.keyword) {
      const keyword = currentFilters.keyword.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(keyword) ||
        a.applicantName.toLowerCase().includes(keyword) ||
        a.code.toLowerCase().includes(keyword)
      );
    }
    if (currentFilters.type?.length) {
      result = result.filter(a => currentFilters.type!.includes(a.type));
    }
    if (currentFilters.status?.length) {
      result = result.filter(a => currentFilters.status!.includes(a.status));
    }
    if (currentFilters.category?.length) {
      result = result.filter(a => currentFilters.category!.includes(a.category));
    }
    if (currentFilters.department?.length) {
      result = result.filter(a => currentFilters.department!.includes(a.applicantDepartment));
    }
    if (currentFilters.priority?.length) {
      result = result.filter(a => currentFilters.priority!.includes(a.priority));
    }
    if (currentFilters.startDate) {
      result = result.filter(a => a.applyDate >= currentFilters.startDate!);
    }
    if (currentFilters.endDate) {
      result = result.filter(a => a.applyDate <= currentFilters.endDate!);
    }

    return result;
  }, [approvals, filters]);

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
    await fetchApprovalsAction();
  }, [fetchApprovalsAction]);

  // 合并所有方法到 value
  // 修复：deps 拆成精确字段（approvals, filters, isLoaded, stats），其他 callback 引用稳定
  const value = useMemo<ApprovalContextValue>(() => ({
    approvals,
    filters,
    stats,
    isLoaded,
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
    approvals,
    filters,
    isLoaded,
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
