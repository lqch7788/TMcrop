/**
 * 合同续签 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

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

/** 后端数据 → 前端数据 */
function normalize(db: Record<string, unknown>): ContractRenewalData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `CR_${Date.now()}`;
  result.renewalPeriod = Number(result.renewalPeriod || 12);
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || '待审批';
  result.createTime = result.createTime || new Date().toISOString();
  return result as ContractRenewalData;
}

/** 前端数据 → 后端数据 */
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

interface ContractRenewalState {
  items: ContractRenewalData[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<ContractRenewalData>) => Promise<ContractRenewalData | null>;
  updateItem: (id: string, updates: Partial<ContractRenewalData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
}

export const useContractRenewalStore = create<ContractRenewalState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

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
        }>(url);

        const data = Array.isArray(response) ? response : [];
        const normalized = data.map(normalize);
        set({ items: normalized, isLoading: false });
      } catch (error) {
        // logger.warn('[ContractRenewalStore] API获取失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    createItem: async (data) => {
      try {
        const body = denormalize(data);
        const response = await enhancedApiClient.post<{
          success: boolean;
          data: { id: string };
        }>('/contract-renewal', body);

        const newId = (response as any)?.id || `CR${Date.now()}`;
        const newItem = normalize({ ...data, id: newId, status: 'pending', statusLabel: '待审批' } as Record<string, unknown>);
        set((state) => ({ items: [newItem, ...state.items] }));
        return newItem;
      } catch (error) {
        // logger.warn('[ContractRenewalStore] 创建失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      const body = denormalize(updates);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));

      try {
        await enhancedApiClient.put(`/contract-renewal/${id}`, body);
      } catch (error) {
        // logger.warn('[ContractRenewalStore] 更新失败:', error);
      }
    },

    deleteItem: async (id) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));

      try {
        await enhancedApiClient.delete(`/contract-renewal/${id}`);
        return true;
      } catch (error) {
        // logger.warn('[ContractRenewalStore] 删除失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      set((state) => ({
        items: state.items.filter((item) => !ids.includes(item.id)),
      }));

      try {
        await Promise.all(
          ids.map((id) =>
            enhancedApiClient.delete(`/contract-renewal/${id}`)
          )
        );
        return true;
      } catch {
        return false;
      }
    },

    approveItem: async (id) => {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, status: 'approved', statusLabel: '已通过' } : item
        ),
      }));

      try {
        await enhancedApiClient.put(`/contract-renewal/${id}`, { status: 'approved' });
      } catch (error) {
        // logger.warn('[ContractRenewalStore] 审批失败:', error);
      }
    },

    rejectItem: async (id) => {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, status: 'rejected', statusLabel: '已拒绝' } : item
        ),
      }));

      try {
        await enhancedApiClient.put(`/contract-renewal/${id}`, { status: 'rejected' });
      } catch (error) {
        // logger.warn('[ContractRenewalStore] 驳回失败:', error);
      }
    },
  })
);
