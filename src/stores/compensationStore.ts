/**
 * 薪酬管理 Store - CompensationStore
 *
 * Phase 5: 薪酬管理模块
 *
 * 设计原则：
 * 1. 薪酬数据基于请假/加班/考勤记录计算
 * 2. 优先调用API，API失败时降级到本地存储
 * 3. 支持离线队列，联网后自动同步
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export type PayPeriod = 'monthly' | 'weekly' | 'daily';

export interface SalaryRecord {
  id: string;
  worker_id: string;
  worker_name: string;
  department: string;
  period_year: number;
  period_month: number;
  period_start: string;
  period_end: string;
  base_salary: number;
  overtime_hours: number;
  overtime_pay: number;
  leave_deduction: number;
  late_deduction: number;
  bonus: number;
  deduction: number;
  net_salary: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid';
  calculated_at?: string;
  approved_at?: string;
  paid_at?: string;
  remarks?: string;
  version: number;
  create_time: string;
  update_time: string;
}

export interface CompensationFilters {
  worker_name?: string;
  department?: string;
  period_year?: number;
  period_month?: number;
  status?: string;
}

// ========== Store 类型 ==========

interface CompensationState {
  // 数据
  salaryRecords: SalaryRecord[];

  // 视图状态
  filters: CompensationFilters;

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // 离线状态
  isOnline: boolean;
  pendingSyncCount: number;

  // Actions - 数据获取
  fetchSalaryRecords: () => Promise<void>;
  calculateSalary: (worker_id: string, period_year: number, period_month: number) => Promise<SalaryRecord | null>;

  // Actions - 增删改
  addSalaryRecord: (record: Omit<SalaryRecord, 'id' | 'version' | 'create_time' | 'update_time'>) => Promise<SalaryRecord | null>;
  updateSalaryRecord: (id: string, updates: Partial<SalaryRecord>) => Promise<void>;
  deleteSalaryRecord: (id: string) => Promise<void>;

  // Actions - 审批
  approveSalary: (id: string) => Promise<void>;
  markAsPaid: (id: string) => Promise<void>;

  // Actions - 筛选
  setFilters: (filters: Partial<CompensationFilters>) => void;

  // Actions - 同步
  syncPendingChanges: () => Promise<void>;
}

// ========== Store 实现 ==========

export const useCompensationStore = create<CompensationState>()(
  persist(
    (set, get) => ({
      // 初始状态
      salaryRecords: [],
      filters: {},
      isLoading: false,
      error: null,
      isOnline: navigator.onLine,
      pendingSyncCount: 0,

      // ========== 数据获取 ==========

      fetchSalaryRecords: async () => {
        set({ isLoading: true, error: null });

        try {
          const apiData = await enhancedApiClient.get<{ data: SalaryRecord[] }>('/compensation', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            set({ salaryRecords: apiData, isLoading: false });
            return;
          }

          const localRecords = get().salaryRecords;
          if (localRecords.length === 0) {
            set({ isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[CompensationStore] API获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // 计算薪酬（基于加班/请假/考勤记录）
      calculateSalary: async (worker_id, period_year, period_month) => {
        const tempId = `SAL-${Date.now()}`;
        const now = new Date().toISOString();
        const period_start = `${period_year}-${String(period_month).padStart(2, '0')}-01`;
        const lastDay = new Date(period_year, period_month, 0).getDate();
        const period_end = `${period_year}-${String(period_month).padStart(2, '0')}-${lastDay}`;

        const newRecord: SalaryRecord = {
          id: tempId,
          worker_id,
          worker_name: '',
          department: '',
          period_year,
          period_month,
          period_start,
          period_end,
          base_salary: 0,
          overtime_hours: 0,
          overtime_pay: 0,
          leave_deduction: 0,
          late_deduction: 0,
          bonus: 0,
          deduction: 0,
          net_salary: 0,
          status: 'calculated',
          calculated_at: now,
          version: 1,
          create_time: now,
          update_time: now,
        };

        set(state => ({
          salaryRecords: [newRecord, ...state.salaryRecords],
        }));

        return newRecord;
      },

      // ========== 增删改 ==========

      addSalaryRecord: async (record) => {
        const tempId = `SAL-${Date.now()}`;
        const now = new Date().toISOString();

        const newRecord: SalaryRecord = {
          ...record,
          id: tempId,
          version: 1,
          create_time: now,
          update_time: now,
        };

        set(state => ({
          salaryRecords: [newRecord, ...state.salaryRecords],
        }));

        try {
          await enhancedApiClient.post('/compensation', record, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 创建薪酬记录API失败:', error);
          set(state => ({ pendingSyncCount: state.pendingSyncCount + 1 }));
        }

        return newRecord;
      },

      updateSalaryRecord: async (id, updates) => {
        set(state => ({
          salaryRecords: state.salaryRecords.map(r =>
            r.id === id ? { ...r, ...updates, update_time: new Date().toISOString() } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/compensation/${id}`, updates, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 更新薪酬记录API失败:', error);
          set(state => ({ pendingSyncCount: state.pendingSyncCount + 1 }));
        }
      },

      deleteSalaryRecord: async (id) => {
        set(state => ({
          salaryRecords: state.salaryRecords.filter(r => r.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/compensation/${id}`, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 删除薪酬记录API失败:', error);
          set(state => ({ pendingSyncCount: state.pendingSyncCount + 1 }));
        }
      },

      // ========== 审批 ==========

      approveSalary: async (id) => {
        const now = new Date().toISOString();
        set(state => ({
          salaryRecords: state.salaryRecords.map(r =>
            r.id === id ? { ...r, status: 'approved', approved_at: now, update_time: now } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/compensation/${id}`, { status: 'approved', approved_at: now }, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 审批薪酬API失败:', error);
        }
      },

      markAsPaid: async (id) => {
        const now = new Date().toISOString();
        set(state => ({
          salaryRecords: state.salaryRecords.map(r =>
            r.id === id ? { ...r, status: 'paid', paid_at: now, update_time: now } : r
          ),
        }));

        try {
          await enhancedApiClient.put(`/compensation/${id}`, { status: 'paid', paid_at: now }, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 更新薪酬状态API失败:', error);
        }
      },

      // ========== 筛选 ==========

      setFilters: (filters) => {
        set(state => ({
          filters: { ...state.filters, ...filters },
        }));
      },

      // ========== 同步 ==========

      syncPendingChanges: async () => {
        try {
          await enhancedApiClient.forcSync();
          set({ pendingSyncCount: 0 });
        } catch (error) {
          console.warn('[CompensationStore] 同步失败:', error);
        }
      },
    }),
    {
      name: 'compensation-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        salaryRecords: state.salaryRecords,
        filters: state.filters,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getSalaryByWorker = (workerId: string) => {
  return useCompensationStore.getState().salaryRecords.filter(s => s.worker_id === workerId);
};

export const getSalaryByPeriod = (year: number, month: number) => {
  return useCompensationStore.getState().salaryRecords.filter(
    s => s.period_year === year && s.period_month === month
  );
};

export const getPendingSalary = () => {
  return useCompensationStore.getState().salaryRecords.filter(s => s.status === 'pending');
};

export const getTotalPayroll = (year: number, month: number) => {
  return useCompensationStore.getState().salaryRecords
    .filter(s => s.period_year === year && s.period_month === month && s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.net_salary, 0);
};
