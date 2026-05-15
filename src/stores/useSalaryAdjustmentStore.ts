/**
 * 调薪申请 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/salary_adjustment（后端可能无此接口，降级到本地存储）
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 调薪记录（camelCase，前端使用） */
export interface SalaryAdjustmentData {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentSalary: number;
  proposedSalary: number;
  adjustmentAmount: number;
  adjustmentRatio: number;
  adjustmentType: string;
  effectiveDate: string;
  reason: string;
  status: string;
  statusLabel?: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== 第二步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  worker_id: 'employeeId',
  workerId: 'employeeId',
  worker_name: 'employeeName',
  workerName: 'employeeName',
  department: 'department',
  position: 'position',
  current_salary: 'currentSalary',
  currentSalary: 'currentSalary',
  proposed_salary: 'proposedSalary',
  proposedSalary: 'proposedSalary',
  adjustment_amount: 'adjustmentAmount',
  adjustmentAmount: 'adjustmentAmount',
  adjustment_ratio: 'adjustmentRatio',
  adjustmentRatio: 'adjustmentRatio',
  adjustment_type: 'adjustmentType',
  adjustmentType: 'adjustmentType',
  effective_date: 'effectiveDate',
  effectiveDate: 'effectiveDate',
  reason: 'reason',
  status: 'status',
  status_label: 'statusLabel',
  statusLabel: 'statusLabel',
  approver: 'approver',
  approve_time: 'approveTime',
  approveTime: 'approveTime',
  remarks: 'remarks',
  create_time: 'createTime',
  createTime: 'createTime',
  update_time: 'updateTime',
  updateTime: 'updateTime',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据 */
function normalize(db: Record<string, unknown>): SalaryAdjustmentData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `SA_${Date.now()}`;
  result.currentSalary = Number(result.currentSalary || result.current_salary || 0);
  result.proposedSalary = Number(result.proposedSalary || result.proposed_salary || 0);
  result.adjustmentAmount = Number(result.adjustmentAmount || result.adjustment_amount || 0);
  result.adjustmentRatio = Number(result.adjustmentRatio || result.adjustment_ratio || 0);
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || result.status_label || '待审批';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as SalaryAdjustmentData;
}

/** 前端数据 → 后端数据 */
function denormalize(data: Partial<SalaryAdjustmentData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 辅助计算 ====================

/** 计算调薪金额和比例 */
function calcAdjustment(current: number, proposed: number) {
  const amount = proposed - current;
  const ratio = current > 0 ? (amount / current) * 100 : 0;
  return { amount, ratio };
}

// ==================== 第四步：Store 接口 ====================

interface SalaryAdjustmentState {
  /** 记录列表 */
  items: SalaryAdjustmentData[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // CRUD
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<SalaryAdjustmentData>) => Promise<SalaryAdjustmentData | null>;
  updateItem: (id: string, updates: Partial<SalaryAdjustmentData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  // 审批
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
  updateItemStatus: (id: string, status: string) => Promise<void>;
}

// ==================== 第五步：创建 Store ====================

const STATUS_LABEL_MAP: Record<string, string> = {
  pending: '待审批',
  approved: '已通过',
  rejected: '已拒绝',
  cancelled: '已取消',
  PENDING: '待审批',
  APPROVED: '已通过',
  REJECTED: '已拒绝',
  CANCELLED: '已取消',
};

export const useSalaryAdjustmentStore = create<SalaryAdjustmentState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,

      /** 查询（READ） */
      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => {
              if (v) params.set(k, v);
            });
          }
          const query = params.toString();
          const url = `/salary_adjustment${query ? `?${query}` : ''}`;

          // 尝试调用API，后端可能无此接口
          const response = await enhancedApiClient.get<{
            success: boolean;
            data: Record<string, unknown>[];
            meta?: { total: number };
          }>(url);

          // enhancedApiClient 已提取 .data，response 即为实际数据数组
          const data = Array.isArray(response) ? response : [];
          const normalized = data.map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] API获取失败，使用本地缓存:', error);
          set({ isLoading: false });
        }
      },

      /** 创建（CREATE）— 乐观更新 */
      createItem: async (data) => {
        const { amount, ratio } = calcAdjustment(data.currentSalary || 0, data.proposedSalary || 0);

        const localItem: SalaryAdjustmentData = {
          id: `SA-${Date.now()}`,
          employeeId: data.employeeId || '',
          employeeName: data.employeeName || '',
          department: data.department || '',
          position: data.position || '',
          currentSalary: data.currentSalary || 0,
          proposedSalary: data.proposedSalary || 0,
          adjustmentAmount: amount,
          adjustmentRatio: ratio,
          adjustmentType: data.adjustmentType || '年度调薪',
          effectiveDate: data.effectiveDate || '',
          reason: data.reason || '',
          status: 'pending',
          statusLabel: '待审批',
          remarks: data.remarks || '',
          createTime: new Date().toISOString(),
        };

        // 乐观更新本地
        set((state) => ({ items: [localItem, ...state.items] }));

        // 尝试调用API（后端可能无此接口）
        try {
          const body = denormalize(data);
          await enhancedApiClient.post('/salary_adjustment', body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 创建API不可用，仅本地保存:', error);
        }

        return localItem;
      },

      /** 更新（UPDATE）— 乐观更新 */
      updateItem: async (id, updates) => {
        // 如果更新了薪资，重新计算
        if (updates.proposedSalary !== undefined || updates.currentSalary !== undefined) {
          const current = getCurrent(id)?.currentSalary || updates.currentSalary || 0;
          const proposed = updates.proposedSalary || getCurrent(id)?.proposedSalary || 0;
          const { amount, ratio } = calcAdjustment(current, proposed);
          updates = { ...updates, adjustmentAmount: amount, adjustmentRatio: ratio };
        }

        // 乐观更新本地
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        // 尝试调用API
        try {
          const body = denormalize(updates);
          await enhancedApiClient.put(`/salary_adjustment/${id}`, body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 更新API不可用:', error);
        }
      },

      /** 删除单个（DELETE）— 乐观更新 */
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/salary_adjustment/${id}`, { offlineQueue: true, priority: 0 });
          return true;
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 删除API不可用:', error);
          return false;
        }
      },

      /** 批量删除 */
      deleteItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/salary_adjustment/${id}`, { offlineQueue: true, priority: 0 })
                .catch(() => {})
            )
          );
          return true;
        } catch {
          return false;
        }
      },

      /** 审批通过 */
      approveItem: async (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status: 'approved', statusLabel: '已通过' } : item
          ),
        }));

        try {
          await enhancedApiClient.post(
            `/salary_adjustment/${id}/status`,
            { status: 'approved' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 审批API不可用:', error);
        }
      },

      /** 审批驳回 */
      rejectItem: async (id) => {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status: 'rejected', statusLabel: '已拒绝' } : item
          ),
        }));

        try {
          await enhancedApiClient.post(
            `/salary_adjustment/${id}/status`,
            { status: 'rejected' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 驳回API不可用:', error);
        }
      },

      /** 更新状态（通用） */
      updateItemStatus: async (id, status) => {
        const statusLabel = STATUS_LABEL_MAP[status] || status;
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, status, statusLabel } : item
          ),
        }));

        try {
          await enhancedApiClient.post(
            `/salary_adjustment/${id}/status`,
            { status },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[SalaryAdjustmentStore] 状态更新API不可用:', error);
        }
      },
    }),
    {
      name: 'salary-adjustment-data-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);

/** 辅助：获取当前记录 */
function getCurrent(id: string): SalaryAdjustmentData | undefined {
  return useSalaryAdjustmentStore.getState().items.find((item) => item.id === id);
}
