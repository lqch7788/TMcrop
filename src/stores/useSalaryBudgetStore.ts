/**
 * 工资预算 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/salary-budget
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 工资预算记录（camelCase，前端使用） */
export interface SalaryBudgetData {
  id: string;
  budgetCode: string;
  deptId: string;
  deptName: string;
  budgetMonth: string;
  totalBaseSalary: number;
  totalOvertimePay: number;
  totalBonus: number;
  grandTotal: number;
  status: string;
  statusLabel: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  remark?: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== 第二步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  budget_code: 'budgetCode',
  dept_id: 'deptId',
  dept_name: 'deptName',
  budget_month: 'budgetMonth',
  total_base_salary: 'totalBaseSalary',
  total_overtime_pay: 'totalOvertimePay',
  total_bonus: 'totalBonus',
  grand_total: 'grandTotal',
  status: 'status',
  status_label: 'statusLabel',
  applicant_id: 'applicantId',
  applicant_name: 'applicantName',
  apply_date: 'applyDate',
  remark: 'remark',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): SalaryBudgetData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `SB_${Date.now()}`;
  result.totalBaseSalary = Number(result.totalBaseSalary || result.total_base_salary || 0);
  result.totalOvertimePay = Number(result.totalOvertimePay || result.total_overtime_pay || 0);
  result.totalBonus = Number(result.totalBonus || result.total_bonus || 0);
  result.grandTotal = Number(result.grandTotal || result.grand_total || 0);
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || result.status_label || '待审批';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as SalaryBudgetData;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<SalaryBudgetData>): Record<string, unknown> {
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

interface SalaryBudgetState {
  /** 预算记录列表 */
  items: SalaryBudgetData[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;

  // CRUD
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<SalaryBudgetData>) => Promise<SalaryBudgetData | null>;
  updateItem: (id: string, updates: Partial<SalaryBudgetData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;

  // 审批
  approveItem: (id: string) => Promise<void>;
  rejectItem: (id: string) => Promise<void>;
}

// ==================== 第五步：创建 Store ====================

export const useSalaryBudgetStore = create<SalaryBudgetState>()(
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
          const url = `/salary-budget${query ? `?${query}` : ''}`;

          const response = await enhancedApiClient.get<{
            success: boolean;
            data: Record<string, unknown>[];
            meta?: { total: number };
          }>(url);

          let data = response?.data || [];
          if (!Array.isArray(data) && (response as any)?.data) {
            data = Array.isArray((response as any).data) ? (response as any).data : [];
          }

          const normalized = (Array.isArray(data) ? data : []).map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[SalaryBudgetStore] API获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      /** 创建（CREATE）— 乐观更新 */
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string; budget_code: string };
          }>('/salary-budget', body, { offlineQueue: true, priority: 0 });

          const newId = (response as any)?.data?.id || `SB${Date.now()}`;
          const newCode = (response as any)?.data?.budget_code || `SB-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-TMP`;

          const grandTotal = (data.totalBaseSalary || 0) + (data.totalOvertimePay || 0) + (data.totalBonus || 0);
          const newItem = normalize({
            ...data,
            id: newId,
            budgetCode: newCode,
            grandTotal,
            status: 'pending',
            status_label: '待审批',
          } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[SalaryBudgetStore] 创建失败，已加入离线队列:', error);
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
          await enhancedApiClient.put(`/salary-budget/${id}`, body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[SalaryBudgetStore] 更新失败，已加入离线队列:', error);
        }
      },

      /** 删除单个（DELETE）— 乐观更新 */
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/salary-budget/${id}`, { offlineQueue: true, priority: 0 });
          return true;
        } catch (error) {
          console.warn('[SalaryBudgetStore] 删除失败，已加入离线队列:', error);
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
                .delete(`/salary-budget/${id}`, { offlineQueue: true, priority: 0 })
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
            `/salary-budget/${id}`,
            { status: 'approved' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[SalaryBudgetStore] 审批失败:', error);
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
            `/salary-budget/${id}`,
            { status: 'rejected' },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[SalaryBudgetStore] 驳回失败:', error);
        }
      },
    }),
    {
      name: 'salary-budget-data-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
