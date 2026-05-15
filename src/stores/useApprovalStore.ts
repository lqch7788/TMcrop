/**
 * 审批中心 Store - Zustand 替代 ApprovalContext 状态管理部分
 * 核心状态：approvals, filters, stats
 * 复杂逻辑（审批联动、超时检测）保留在 Context 中
 */
import { create } from 'zustand';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  ApprovalFilters,
  ApprovalStats,
} from '../types/approval';

const API_BASE = '/api/approvals';

// 模拟审批统计数据计算
function computeStats(approvals: Approval[]): ApprovalStats {
  return {
    total: approvals.length,
    pending: approvals.filter(a => a.status === ApprovalStatus.PENDING).length,
    approved: approvals.filter(a => a.status === ApprovalStatus.APPROVED).length,
    rejected: approvals.filter(a => a.status === ApprovalStatus.REJECTED).length,
    partiallyApproved: approvals.filter(a => a.status === ApprovalStatus.PARTIALLY_APPROVED).length,
    myPending: 0,
    mySubmitted: 0,
    overdue: 0,
    urgent: approvals.filter(a => a.priority === 'urgent' && a.status === ApprovalStatus.PENDING).length,
  };
}

interface ApprovalStore {
  // 状态
  approvals: Approval[];
  filters: ApprovalFilters;
  stats: ApprovalStats;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // 设置审批列表
  setApprovals: (approvals: Approval[]) => void;

  // 从 API 获取审批数据
  fetchApprovals: () => Promise<void>;

  // 筛选方法
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  resetFilters: () => void;

  // 直接更新单个审批（用于本地状态更新）
  updateApprovalLocal: (id: string, updates: Partial<Approval>) => void;

  // 删除审批（本地）
  deleteApprovalLocal: (id: string) => void;

  // 添加审批（本地）
  addApprovalLocal: (approval: Approval) => void;
}

export const useApprovalStore = create<ApprovalStore>((set, get) => ({
  approvals: [],
  filters: {},
  stats: computeStats([]),
  isLoaded: false,
  isLoading: false,
  error: null,

  setApprovals: (approvals) => {
    set({
      approvals,
      stats: computeStats(approvals),
      isLoaded: true,
    });
  },

  fetchApprovals: async () => {
    set({ isLoading: true, error: null });
    try {
      const response = await fetch(API_BASE);
      const result = await response.json();
      if (result.success && Array.isArray(result.data)) {
        set({
          approvals: result.data,
          stats: computeStats(result.data),
          isLoaded: true,
          isLoading: false,
        });
      } else {
        console.warn('[ApprovalStore] API返回数据无效，保留现有数据');
        set({ isLoading: false });
      }
    } catch (err) {
      console.warn('[ApprovalStore] 获取审批数据失败:', err);
      set({ error: (err as Error).message, isLoading: false });
    }
  },

  setFilters: (filters) => {
    set((state) => ({
      filters: { ...state.filters, ...filters },
    }));
  },

  resetFilters: () => {
    set({ filters: {} });
  },

  updateApprovalLocal: (id, updates) => {
    set((state) => {
      const approvals = state.approvals.map((a) =>
        a.id === id ? { ...a, ...updates } : a
      );
      return {
        approvals,
        stats: computeStats(approvals),
      };
    });
  },

  deleteApprovalLocal: (id) => {
    set((state) => {
      const approvals = state.approvals.filter((a) => a.id !== id);
      return {
        approvals,
        stats: computeStats(approvals),
      };
    });
  },

  addApprovalLocal: (approval) => {
    set((state) => {
      const approvals = [approval, ...state.approvals];
      return {
        approvals,
        stats: computeStats(approvals),
      };
    });
  },
}));
