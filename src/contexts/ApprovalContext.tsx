// ============================================================
// 审批中心 - 全局审批Context
// 文件路径：src/contexts/ApprovalContext.tsx
// 组件化结构：统一管理审批模块的共享数据
// 支持 API 持久化
// ============================================================

import React, { createContext, useContext, useReducer, useMemo, useCallback, useEffect, ReactNode } from 'react';
import { approvalReducer, initialApprovalState, type ApprovalState } from '../reducers/approvalReducer';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  ApprovalFilters,
  ApprovalStats,
  BusinessLink,
} from '../types/approval';
import { approvals as mockApprovals } from '../data/mockData';
import {
  executeApprovalIntegration,
  registerApprovalIntegration,
  registerAllHandlers,
} from '../types/approvalIntegration';

// ============================================================
// API 配置
// ============================================================
const API_BASE = '/api/approvals';

// ============================================================
// Context Value 类型定义
// ============================================================

interface ApprovalContextValue {
  // 状态
  approvals: Approval[];
  filters: ApprovalFilters;
  stats: ApprovalStats;
  isLoaded: boolean;

  // 原始状态（用于需要访问全部数据的场景）
  getState: () => ApprovalState;

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
// Provider 实现
// ============================================================

// 清除 localStorage（可选，用于重置演示数据）
export const clearApprovalsStorage = () => {
  // localStorage 已不再使用，保留接口兼容性
};

export function ApprovalProvider({ children, initialApprovals }: ApprovalProviderProps) {
  // 使用 reducer 管理状态
  const [state, dispatch] = useReducer(approvalReducer, {
    ...initialApprovalState,
    approvals: initialApprovals || [],
  });

  // 从 API 加载审批数据
  const loadApprovalsFromAPI = useCallback(async () => {
    try {
      const response = await fetch(API_BASE);
      const result = await response.json();
      if (result.success && Array.isArray(result.data) && result.data.length > 0) {
        // API 返回有效数据
        dispatch({ type: 'SET_APPROVALS', payload: result.data });
      } else if (result.success && Array.isArray(result.data) && result.data.length === 0) {
        // API 返回空数据，使用 mock 数据（数据库可能为空）
        console.warn('API returned empty approvals, using mock data');
        dispatch({ type: 'SET_APPROVALS', payload: mockApprovals });
      } else {
        console.warn('Failed to load approvals from API:', result.error);
        // 如果 API 加载失败，使用 mock 数据
        dispatch({ type: 'SET_APPROVALS', payload: mockApprovals });
      }
    } catch (error) {
      console.warn('Failed to load approvals from API, using mock data:', error);
      // 如果 API 加载失败，使用 mock 数据
      dispatch({ type: 'SET_APPROVALS', payload: mockApprovals });
    }
  }, []);

  // 注册业务联动处理器（仅注册一次）
  useEffect(() => {
    registerAllHandlers();
  }, []);

  // 组件挂载时从 API 加载数据
  useEffect(() => {
    loadApprovalsFromAPI();
  }, [loadApprovalsFromAPI]);

  // 计算统计数据
  const stats = useMemo<ApprovalStats>(() => {
    const now = new Date();
    const overdueThreshold = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    return {
      total: state.approvals.length,
      pending: state.approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
      approved: state.approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
      rejected: state.approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
      partiallyApproved: state.approvals.filter(a => a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
      myPending: 0, // 需要结合当前用户ID计算
      mySubmitted: 0, // 需要结合当前用户ID计算
      overdue: state.approvals.filter(a =>
        a.status === ApprovalStatus.PENDING &&
        a.applyDate < overdueThreshold.toISOString().substring(0, 10)
      ).length,
      urgent: state.approvals.filter(a => a.priority === 'urgent' && a.status === ApprovalStatus.PENDING).length,
    };
  }, [state.approvals]);

  // 获取当前状态
  const getState = useCallback(() => state, [state]);

  // 筛选方法
  const setFilters = useCallback((filters: Partial<ApprovalFilters>) => {
    dispatch({ type: 'SET_FILTERS', payload: filters });
  }, []);

  const resetFilters = useCallback(() => {
    dispatch({ type: 'RESET_FILTERS' });
  }, []);

  // CRUD 操作（通过 API）
  const addApproval = useCallback(async (approval: Approval) => {
    try {
      const response = await fetch(API_BASE, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(approval),
      });
      const result = await response.json();
      if (result.success) {
        // 重新加载数据
        await loadApprovalsFromAPI();
      } else {
        console.error('Failed to add approval via API:', result.error);
      }
    } catch (error) {
      console.error('Failed to add approval via API:', error);
    }
  }, [loadApprovalsFromAPI]);

  const updateApproval = useCallback(async (id: string, updates: Partial<Approval>) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      const result = await response.json();
      if (result.success) {
        // 重新加载数据
        await loadApprovalsFromAPI();
      } else {
        console.error('Failed to update approval via API:', result.error);
      }
    } catch (error) {
      console.error('Failed to update approval via API:', error);
    }
  }, [loadApprovalsFromAPI]);

  const deleteApproval = useCallback(async (id: string) => {
    try {
      const response = await fetch(`${API_BASE}/${id}`, { method: 'DELETE' });
      const result = await response.json();
      if (result.success) {
        // 重新加载数据
        await loadApprovalsFromAPI();
      } else {
        console.error('Failed to delete approval via API:', result.error);
      }
    } catch (error) {
      console.error('Failed to delete approval via API:', error);
    }
  }, [loadApprovalsFromAPI]);

  // 审批操作（通过 API）
  const approve = useCallback(async (id: string, comment?: string) => {
    const approval = state.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('approved', approval, { comment });
    }
    try {
      await fetch(`${API_BASE}/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'approve', comment }),
      });
      await loadApprovalsFromAPI();
    } catch (error) {
      console.error('Failed to approve via API:', error);
    }
  }, [state.approvals, loadApprovalsFromAPI]);

  const reject = useCallback(async (id: string, comment: string) => {
    const approval = state.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('rejected', approval, { reason: comment });
    }
    try {
      await fetch(`${API_BASE}/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'reject', comment }),
      });
      await loadApprovalsFromAPI();
    } catch (error) {
      console.error('Failed to reject via API:', error);
    }
  }, [state.approvals, loadApprovalsFromAPI]);

  const partiallyApprove = useCallback(async (id: string, items: Record<string, number>, comment?: string) => {
    const approval = state.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('partially_approved', approval, { approvedItems: items, comment });
    }
    try {
      await fetch(`${API_BASE}/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'partially_approve', comment, approvedItems: items }),
      });
      await loadApprovalsFromAPI();
    } catch (error) {
      console.error('Failed to partially approve via API:', error);
    }
  }, [state.approvals, loadApprovalsFromAPI]);

  const cancel = useCallback(async (id: string, reason?: string) => {
    const approval = state.approvals.find(a => a.id === id);
    if (approval) {
      executeApprovalIntegration('cancelled', approval, { reason });
    }
    try {
      await fetch(`${API_BASE}/${id}/action`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'cancel', comment: reason }),
      });
      await loadApprovalsFromAPI();
    } catch (error) {
      console.error('Failed to cancel via API:', error);
    }
  }, [state.approvals, loadApprovalsFromAPI]);

  // 查询方法
  const getApprovalById = useCallback((id: string) => {
    return state.approvals.find(a => a.id === id);
  }, [state.approvals]);

  const getApprovalsByType = useCallback((type: ApprovalType) => {
    return state.approvals.filter(a => a.type === type);
  }, [state.approvals]);

  const getApprovalsByStatus = useCallback((status: ApprovalStatus) => {
    return state.approvals.filter(a => a.status === status);
  }, [state.approvals]);

  const getPendingApprovals = useCallback(() => {
    return state.approvals.filter(a => a.status === ApprovalStatus.PENDING);
  }, [state.approvals]);

  const getApprovedApprovals = useCallback(() => {
    return state.approvals.filter(a =>
      a.status === ApprovalStatus.APPROVED || a.status === ApprovalStatus.PARTIALLY_APPROVED
    );
  }, [state.approvals]);

  const getRejectedApprovals = useCallback(() => {
    return state.approvals.filter(a => a.status === ApprovalStatus.REJECTED);
  }, [state.approvals]);

  const getMyApprovals = useCallback((userId: string) => {
    return state.approvals.filter(a =>
      a.status === ApprovalStatus.PENDING &&
      a.approvers.some(approver => approver.userId === userId && approver.status === 'pending')
    );
  }, [state.approvals]);

  const getApprovalsByApplicant = useCallback((applicantId: string) => {
    return state.approvals.filter(a => a.applicantId === applicantId);
  }, [state.approvals]);

  // 获取筛选后的审批列表
  const getFilteredApprovals = useCallback(() => {
    let result = state.approvals;

    // 关键词筛选
    if (state.filters.keyword) {
      const keyword = state.filters.keyword.toLowerCase();
      result = result.filter(a =>
        a.title.toLowerCase().includes(keyword) ||
        a.applicantName.toLowerCase().includes(keyword) ||
        a.code.toLowerCase().includes(keyword)
      );
    }

    // 类型筛选
    if (state.filters.type?.length) {
      result = result.filter(a => state.filters.type!.includes(a.type));
    }

    // 状态筛选
    if (state.filters.status?.length) {
      result = result.filter(a => state.filters.status!.includes(a.status));
    }

    // 类别筛选
    if (state.filters.category?.length) {
      result = result.filter(a => state.filters.category!.includes(a.category));
    }

    // 部门筛选
    if (state.filters.department?.length) {
      result = result.filter(a => state.filters.department!.includes(a.applicantDepartment));
    }

    // 优先级筛选
    if (state.filters.priority?.length) {
      result = result.filter(a => state.filters.priority!.includes(a.priority));
    }

    // 日期筛选
    if (state.filters.startDate) {
      result = result.filter(a => a.applyDate >= state.filters.startDate!);
    }
    if (state.filters.endDate) {
      result = result.filter(a => a.applyDate <= state.filters.endDate!);
    }

    return result;
  }, [state.approvals, state.filters]);

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

  // 合并所有方法到 value
  const value = useMemo<ApprovalContextValue>(() => ({
    approvals: state.approvals,
    filters: state.filters,
    stats,
    isLoaded: true,
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
  }), [
    state.approvals,
    state.filters,
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
