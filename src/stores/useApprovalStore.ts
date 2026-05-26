/**
 * 审批中心 Zustand Store
 *
 * 数据流：enhancedApiClient → API → DB（无本地降级）
 * 组件不直接读写 localStorage，统一通过 Zustand Store 层管理数据。
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { useAuthStore } from './useAuthStore';
import {
  Approval,
  ApprovalType,
  ApprovalStatus,
  ApprovalFilters,
  ApprovalStats,
  getApprovalTypeName,
} from '../types/approval';

const API_BASE = '/api/approvals';

// ==================== 第一步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  type: 'type',
  type_name: 'typeName',
  category: 'category',
  title: 'title',
  description: 'description',
  applicant_id: 'applicantId',
  applicant_name: 'applicantName',
  applicant_department: 'applicantDepartment',
  apply_date: 'applyDate',
  apply_time: 'applyTime',
  current_step: 'currentStep',
  total_steps: 'totalSteps',
  approvers: 'approvers',
  records: 'records',
  status: 'status',
  business_link: 'businessLink',
  attachments: 'attachments',
  priority: 'priority',
  due_date: 'dueDate',
  reminder_count: 'reminderCount',
  related_batch_code: 'relatedBatchCode',
  related_task_ids: 'relatedTaskIds',
  notification_sent: 'notificationSent',
  amount: 'amount',
  materials: 'materials',
  workflow_id: 'workflowId',
  workflow_name: 'workflowName',
  approval_level: 'approvalLevel',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// ==================== 第二步：规范化函数 ====================

/** 后端数据 → 前端 Approval */
function normalizeApproval(db: Record<string, unknown>): Approval {
  const result: Record<string, unknown> = { ...db };
  // 应用字段映射（snake_case → camelCase）
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // JSON 字段解析
  if (typeof result.approvers === 'string') {
    try { result.approvers = JSON.parse(result.approvers as string); } catch { result.approvers = []; }
  }
  if (!Array.isArray(result.approvers)) result.approvers = [];
  if (typeof result.records === 'string') {
    try { result.records = JSON.parse(result.records as string); } catch { result.records = []; }
  }
  if (!Array.isArray(result.records)) result.records = [];
  if (typeof result.businessLink === 'string') {
    try { result.businessLink = JSON.parse(result.businessLink as string); } catch { result.businessLink = undefined; }
  }
  if (typeof result.materials === 'string') {
    try { result.materials = JSON.parse(result.materials as string); } catch { result.materials = []; }
  }
  if (!Array.isArray(result.materials)) result.materials = [];
  if (typeof result.relatedTaskIds === 'string') {
    try { result.relatedTaskIds = JSON.parse(result.relatedTaskIds as string); } catch { result.relatedTaskIds = []; }
  }
  if (typeof result.attachments === 'string') {
    try { result.attachments = JSON.parse(result.attachments as string); } catch { result.attachments = []; }
  }
  // 默认值
  result.typeName = result.typeName || getApprovalTypeName(result.type as ApprovalType) || '';
  result.status = (result.status as string) || 'pending';
  result.category = result.category || 'business';
  result.priority = result.priority || 'normal';
  result.reminderCount = result.reminderCount ?? 0;
  result.notificationSent = result.notificationSent ?? false;
  result.currentStep = result.currentStep ?? 1;
  result.totalSteps = result.totalSteps ?? 1;
  result.createdAt = result.createdAt || result.applyDate || new Date().toISOString();
  result.updatedAt = result.updatedAt || result.createdAt || new Date().toISOString();
  return result as unknown as Approval;
}

/** 前端 Approval → 后端数据 */
function denormalizeApproval(data: Partial<Approval>): Record<string, unknown> {
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    // JSON 字段序列化
    if (['approvers', 'records', 'businessLink', 'materials', 'relatedTaskIds', 'attachments'].includes(key) && typeof value === 'object') {
      result[backendKey] = JSON.stringify(value);
    } else {
      result[backendKey] = value;
    }
  }
  return result;
}

// ==================== 第三步：统计计算 ====================

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

// ==================== 第四步：Store 定义 ====================

interface ApprovalStore {
  // ========== 状态 ==========
  approvals: Approval[];
  filters: ApprovalFilters;
  stats: ApprovalStats;
  isLoaded: boolean;
  isLoading: boolean;
  error: string | null;

  // ========== 数据加载 ==========
  setApprovals: (approvals: Approval[]) => void;
  fetchApprovals: (filters?: Record<string, string>) => Promise<void>;

  // ========== 筛选方法 ==========
  setFilters: (filters: Partial<ApprovalFilters>) => void;
  resetFilters: () => void;

  // ========== 本地状态操作（兼容旧接口） ==========
  updateApprovalLocal: (id: string, updates: Partial<Approval>) => void;
  deleteApprovalLocal: (id: string) => void;
  addApprovalLocal: (approval: Approval) => void;

  // ========== CRUD 操作（通过 API） ==========
  addApproval: (approval: Partial<Approval>) => Promise<Approval | null>;
  updateApproval: (id: string, updates: Partial<Approval>) => Promise<void>;
  deleteApproval: (id: string) => Promise<boolean>;

  // ========== 审批操作（通过 API + 联动） ==========
  approve: (id: string, comment?: string) => Promise<void>;
  reject: (id: string, comment: string) => Promise<void>;
  cancel: (id: string, reason?: string) => Promise<void>;
  batchApprove: (ids: string[], comment?: string) => Promise<void>;
  batchReject: (ids: string[], comment: string) => Promise<void>;
}

export const useApprovalStore = create<ApprovalStore>()(
  (set, get) => ({
      // ========== 初始状态 ==========
      approvals: [],
      filters: {},
      stats: computeStats([]),
      isLoaded: false,
      isLoading: false,
      error: null,

      // ========== 数据加载 ==========

      setApprovals: (approvals) => {
        set({ approvals, stats: computeStats(approvals), isLoaded: true });
      },

      fetchApprovals: async () => {
        set({ isLoading: true, error: null });
        try {
          const response = await enhancedApiClient.get<{ success: boolean; data: unknown[] }>(
            API_BASE,
            {}
          );
          if (response.success && Array.isArray(response.data)) {
            const approvals = response.data.map(item => normalizeApproval(item as Record<string, unknown>));
            set({ approvals, stats: computeStats(approvals), isLoaded: true, isLoading: false });
          } else if (!response.success) {
            console.warn('[ApprovalStore] API 返回数据无效，保留现有数据');
            set({ isLoading: false });
          }
        } catch (err) {
          console.warn('[ApprovalStore] 获取审批数据失败:', err);
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      // ========== 筛选方法 ==========

      setFilters: (filters) => {
        set((state) => ({ filters: { ...state.filters, ...filters } }));
      },

      resetFilters: () => {
        set({ filters: {} });
      },

      // ========== 本地状态操作（兼容旧接口） ==========

      updateApprovalLocal: (id, updates) => {
        set((state) => {
          const approvals = state.approvals.map((a) =>
            a.id === id ? { ...a, ...updates } : a
          );
          return { approvals, stats: computeStats(approvals) };
        });
      },

      deleteApprovalLocal: (id) => {
        set((state) => {
          const approvals = state.approvals.filter((a) => a.id !== id);
          return { approvals, stats: computeStats(approvals) };
        });
      },

      addApprovalLocal: (approval) => {
        set((state) => {
          const approvals = [approval, ...state.approvals];
          return { approvals, stats: computeStats(approvals) };
        });
      },

      // ========== CRUD 操作（通过 API） ==========

      addApproval: async (approval) => {
        try {
          const body = denormalizeApproval(approval);
          const response = await enhancedApiClient.post<{ success: boolean; data: unknown }>(
            API_BASE, body
          );
          if (response.success && response.data) {
            const newApproval = normalizeApproval(response.data as Record<string, unknown>);
            set((state) => {
              const approvals = [newApproval, ...state.approvals];
              return { approvals, stats: computeStats(approvals) };
            });
            return newApproval;
          }
          return null;
        } catch (error) {
          console.error('[ApprovalStore] 创建审批失败:', error);
          return null;
        }
      },

      updateApproval: async (id, updates) => {
        try {
          const body = denormalizeApproval(updates);
          const response = await enhancedApiClient.put<{ success: boolean; data: unknown }>(
            `${API_BASE}/${id}`, body
          );
          if (response.success) {
            set((state) => {
              const approvals = state.approvals.map((a) =>
                a.id === id ? { ...a, ...updates } : a
              );
              return { approvals, stats: computeStats(approvals) };
            });
          }
        } catch (error) {
          console.error('[ApprovalStore] 更新审批失败:', error);
        }
      },

      deleteApproval: async (id) => {
        try {
          const response = await enhancedApiClient.delete<{ success: boolean }>(`${API_BASE}/${id}`);
          if (response.success) {
            set((state) => {
              const approvals = state.approvals.filter((a) => a.id !== id);
              return { approvals, stats: computeStats(approvals) };
            });
            return true;
          }
          return false;
        } catch (error) {
          console.error('[ApprovalStore] 删除审批失败:', error);
          return false;
        }
      },

      // ========== 审批操作（通过 API + 联动） ==========

      approve: async (id, comment) => {
        const approverId = useAuthStore.getState().currentUser?.oid || '';
        const approverName = useAuthStore.getState().currentUser?.realName || '系统';
        try {
          const response = await enhancedApiClient.patch<{ success: boolean; data?: unknown; error?: string }>(
            `${API_BASE}/${id}/action`,
            { action: 'approve', comment, approverId, approverName }
          );
          if (response.success) {
            // 乐观更新本地状态
            set((state) => {
              const approvals = state.approvals.map((a) =>
                a.id === id ? { ...a, status: ApprovalStatus.APPROVED as string, updatedAt: new Date().toISOString() } : a
              );
              return { approvals, stats: computeStats(approvals as Approval[]) };
            });
            // 重新加载以获取最新数据
            await get().fetchApprovals();
          } else {
            console.error('[ApprovalStore] 审批失败:', response.error);
          }
        } catch (error) {
          console.error('[ApprovalStore] 审批操作失败:', error);
        }
      },

      reject: async (id, comment) => {
        const approverId = useAuthStore.getState().currentUser?.oid || '';
        const approverName = useAuthStore.getState().currentUser?.realName || '系统';
        try {
          const response = await enhancedApiClient.patch<{ success: boolean; data?: unknown; error?: string }>(
            `${API_BASE}/${id}/action`,
            { action: 'reject', comment, approverId, approverName }
          );
          if (response.success) {
            set((state) => {
              const approvals = state.approvals.map((a) =>
                a.id === id ? { ...a, status: ApprovalStatus.REJECTED as string, updatedAt: new Date().toISOString() } : a
              );
              return { approvals, stats: computeStats(approvals as Approval[]) };
            });
            await get().fetchApprovals();
          } else {
            console.error('[ApprovalStore] 拒绝失败:', response.error);
          }
        } catch (error) {
          console.error('[ApprovalStore] 拒绝操作失败:', error);
        }
      },

      cancel: async (id, reason) => {
        const approverId = useAuthStore.getState().currentUser?.oid || '';
        const approverName = useAuthStore.getState().currentUser?.realName || '系统';
        try {
          const response = await enhancedApiClient.patch<{ success: boolean }>(
            `${API_BASE}/${id}/action`,
            { action: 'cancel', comment: reason, approverId, approverName }
          );
          if (response.success) {
            set((state) => {
              const approvals = state.approvals.map((a) =>
                a.id === id ? { ...a, status: ApprovalStatus.CANCELLED as string, updatedAt: new Date().toISOString() } : a
              );
              return { approvals, stats: computeStats(approvals as Approval[]) };
            });
            await get().fetchApprovals();
          }
        } catch (error) {
          console.error('[ApprovalStore] 撤回失败:', error);
        }
      },

      batchApprove: async (ids, comment) => {
        const approverId = useAuthStore.getState().currentUser?.oid || '';
        const approverName = useAuthStore.getState().currentUser?.realName || '系统';
        try {
          const promises = ids.map(id =>
            enhancedApiClient.patch(`${API_BASE}/${id}/action`, {
              action: 'approve', comment, approverId, approverName,
            })
          );
          await Promise.all(promises);
          await get().fetchApprovals();
        } catch (error) {
          console.error('[ApprovalStore] 批量通过失败:', error);
          throw error;
        }
      },

      batchReject: async (ids, comment) => {
        const approverId = useAuthStore.getState().currentUser?.oid || '';
        const approverName = useAuthStore.getState().currentUser?.realName || '系统';
        try {
          const promises = ids.map(id =>
            enhancedApiClient.patch(`${API_BASE}/${id}/action`, {
              action: 'reject', comment, approverId, approverName,
            })
          );
          await Promise.all(promises);
          await get().fetchApprovals();
        } catch (error) {
          console.error('[ApprovalStore] 批量拒绝失败:', error);
          throw error;
        }
      },
    })
);
