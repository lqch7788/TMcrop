/**
 * 合同续签 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/contract-renewal
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 合同续签记录（camelCase，前端使用） */
export interface ContractRenewalData {
  id: string;
  employeeId: string;
  employeeName: string;
  department: string;
  position: string;
  currentContractEnd: string;
  newContractStart: string;
  newContractEnd: string;
  renewalPeriod: number;
  newSalary?: number;
  termsChange?: string;
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
  employee_id: 'employeeId',
  employee_name: 'employeeName',
  department: 'department',
  position: 'position',
  current_contract_end: 'currentContractEnd',
  new_contract_start: 'newContractStart',
  new_contract_end: 'newContractEnd',
  renewal_period: 'renewalPeriod',
  new_salary: 'newSalary',
  terms_change: 'termsChange',
  status: 'status',
  status_label: 'statusLabel',
  approver: 'approver',
  approve_time: 'approveTime',
  remarks: 'remarks',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): ContractRenewalData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `CR_${Date.now()}`;
  result.renewalPeriod = Number(result.renewalPeriod || result.renewal_period || 12);
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || result.status_label || '待审批';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as ContractRenewalData;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<ContractRenewalData>): Record<string, unknown> {
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

// ==================== 第四步：Store 接口 ====================

interface ContractRenewalState {
  /** 记录列表 */
  items: ContractRenewalData[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // CRUD
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<ContractRenewalData>) => Promise<ContractRenewalData | null>;
  updateItem: (id: string, updates: Partial<ContractRenewalData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  // 审批
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
}

// ==================== 第五步：创建 Store ====================

export const useContractRenewalStore = create<ContractRenewalState>()(
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
          const url = `/contract-renewal${query ? `?${query}` : ''}`;

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
          console.warn('[ContractRenewalStore] API获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /** 创建（CREATE）— 乐观更新 */
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string };
          }>('/contract-renewal', body, { offlineQueue: true, priority: 0 });

          const newId = (response as any)?.id || `CR${Date.now()}`;
          const newItem = normalize({ ...data, id: newId, status: 'pending', status_label: '待审批' } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[ContractRenewalStore] 创建失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      /** 更新（UPDATE）— 乐观更新 */
      updateItem: async (id, updates) => {
        const body = denormalize(updates);
        // 乐观更新：先更新本地状态
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/contract-renewal/${id}`, body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[ContractRenewalStore] 更新失败，已加入离线队列:', error);
        }
      },

      /** 删除单个（DELETE）— 乐观更新 */
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/contract-renewal/${id}`, { offlineQueue: true, priority: 0 });
          return true;
        } catch (error) {
          console.warn('[ContractRenewalStore] 删除失败，已加入离线队列:', error);
          return false;
        }
      },

      /** 批量删除（BATCH DELETE）— 乐观更新 */
      deleteItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/contract-renewal/${id}`, { offlineQueue: true, priority: 0 })
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
          await enhancedApiClient.put(
            `/contract-renewal/${id}`,
            { status: 'approved' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[ContractRenewalStore] 审批失败:', error);
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
          await enhancedApiClient.put(
            `/contract-renewal/${id}`,
            { status: 'rejected' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[ContractRenewalStore] 驳回失败:', error);
        }
      },
    }),
    {
      name: 'contract-renewal-data-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
