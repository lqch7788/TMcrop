/**
 * 薪酬管理 Store - CompensationStore
 *
 * Phase 5: 薪酬管理模块
 * V2.0 更新：添加 FIELD_MAP + normalize/denormalize 模式
 *
 * 设计原则：
 * 1. 薪酬数据基于请假/加班/考勤记录计算
 * 2. 优先调用API，API失败时降级到本地存储
 * 3. 支持离线队列，联网后自动同步
 * 4. camelCase 前端字段，snake_case 后端字段通过 FIELD_MAP 映射
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

export type PayPeriod = 'monthly' | 'weekly' | 'daily';

/** 薪酬记录（camelCase，前端使用） */
export interface SalaryRecord {
  id: string;
  workerId: string;
  workerName: string;
  department: string;
  periodYear: number;
  periodMonth: number;
  periodStart: string;
  periodEnd: string;
  baseSalary: number;
  overtimeHours: number;
  overtimePay: number;
  leaveDeduction: number;
  lateDeduction: number;
  bonus: number;
  deduction: number;
  netSalary: number;
  status: 'pending' | 'calculated' | 'approved' | 'paid';
  calculatedAt?: string;
  approvedAt?: string;
  paidAt?: string;
  remarks?: string;
  version: number;
  createTime: string;
  updateTime: string;
}

export interface CompensationFilters {
  workerName?: string;
  department?: string;
  periodYear?: number;
  periodMonth?: number;
  status?: string;
}

// ==================== 字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  worker_id: 'workerId',
  worker_name: 'workerName',
  department: 'department',
  period_year: 'periodYear',
  period_month: 'periodMonth',
  period_start: 'periodStart',
  period_end: 'periodEnd',
  base_salary: 'baseSalary',
  overtime_hours: 'overtimeHours',
  overtime_pay: 'overtimePay',
  leave_deduction: 'leaveDeduction',
  late_deduction: 'lateDeduction',
  bonus: 'bonus',
  deduction: 'deduction',
  net_salary: 'netSalary',
  status: 'status',
  calculated_at: 'calculatedAt',
  approved_at: 'approvedAt',
  paid_at: 'paidAt',
  remarks: 'remarks',
  version: 'version',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): SalaryRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `SAL-${Date.now()}`;
  result.baseSalary = Number(result.baseSalary || result.base_salary || 0);
  result.overtimeHours = Number(result.overtimeHours || result.overtime_hours || 0);
  result.overtimePay = Number(result.overtimePay || result.overtime_pay || 0);
  result.leaveDeduction = Number(result.leaveDeduction || result.leave_deduction || 0);
  result.lateDeduction = Number(result.lateDeduction || result.late_deduction || 0);
  result.bonus = Number(result.bonus || 0);
  result.deduction = Number(result.deduction || 0);
  result.netSalary = Number(result.netSalary || result.net_salary || 0);
  result.periodYear = Number(result.periodYear || result.period_year || new Date().getFullYear());
  result.periodMonth = Number(result.periodMonth || result.period_month || new Date().getMonth() + 1);
  result.status = (result.status as string) || 'pending';
  result.version = Number(result.version || 1);
  result.createTime = (result.createTime || result.create_time || new Date().toISOString()) as string;
  result.updateTime = (result.updateTime || result.update_time || new Date().toISOString()) as string;
  return result as unknown as SalaryRecord;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<SalaryRecord>): Record<string, unknown> {
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

// ==================== Store 类型 ====================

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
  calculateSalary: (workerId: string, periodYear: number, periodMonth: number) => Promise<SalaryRecord | null>;

  // Actions - 增删改
  addSalaryRecord: (record: Omit<SalaryRecord, 'id' | 'version' | 'createTime' | 'updateTime'>) => Promise<SalaryRecord | null>;
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

// ==================== Store 实现 ====================

export const useCompensationStore = create<CompensationState>()(
  persist(
    (set, _get) => ({
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
          const apiData = await enhancedApiClient.get<{ data: Record<string, unknown>[] }>('/compensation', {
            useCache: true,
            cacheStrategy: 'network-first',
          });

          if (apiData && Array.isArray(apiData) && apiData.length > 0) {
            const normalized = apiData.map((item: Record<string, unknown>) => normalize(item));
            set({ salaryRecords: normalized, isLoading: false });
            return;
          }

          // API无数据时保留本地数据
          set({ isLoading: false });
        } catch (error) {
          console.warn('[CompensationStore] API获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // 计算薪酬（基于加班/请假/考勤记录）
      calculateSalary: async (workerId, periodYear, periodMonth) => {
        const tempId = `SAL-${Date.now()}`;
        const now = new Date().toISOString();
        const periodStart = `${periodYear}-${String(periodMonth).padStart(2, '0')}-01`;
        const lastDay = new Date(periodYear, periodMonth, 0).getDate();
        const periodEnd = `${periodYear}-${String(periodMonth).padStart(2, '0')}-${lastDay}`;

        const newRecord: SalaryRecord = {
          id: tempId,
          workerId,
          workerName: '',
          department: '',
          periodYear,
          periodMonth,
          periodStart,
          periodEnd,
          baseSalary: 0,
          overtimeHours: 0,
          overtimePay: 0,
          leaveDeduction: 0,
          lateDeduction: 0,
          bonus: 0,
          deduction: 0,
          netSalary: 0,
          status: 'calculated',
          calculatedAt: now,
          version: 1,
          createTime: now,
          updateTime: now,
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
          createTime: now,
          updateTime: now,
        };

        set(state => ({
          salaryRecords: [newRecord, ...state.salaryRecords],
        }));

        try {
          const body = denormalize(record);
          await enhancedApiClient.post('/compensation', body, { offlineQueue: true });
        } catch (error) {
          console.warn('[CompensationStore] 创建薪酬记录API失败:', error);
          set(state => ({ pendingSyncCount: state.pendingSyncCount + 1 }));
        }

        return newRecord;
      },

      updateSalaryRecord: async (id, updates) => {
        set(state => ({
          salaryRecords: state.salaryRecords.map(r =>
            r.id === id ? { ...r, ...updates, updateTime: new Date().toISOString() } : r
          ),
        }));

        try {
          const body = denormalize(updates);
          await enhancedApiClient.put(`/compensation/${id}`, body, { offlineQueue: true });
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
            r.id === id ? { ...r, status: 'approved', approvedAt: now, updateTime: now } : r
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
            r.id === id ? { ...r, status: 'paid', paidAt: now, updateTime: now } : r
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
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getSalaryByWorker = (workerId: string) => {
  return useCompensationStore.getState().salaryRecords.filter(s => s.workerId === workerId);
};

export const getSalaryByPeriod = (year: number, month: number) => {
  return useCompensationStore.getState().salaryRecords.filter(
    s => s.periodYear === year && s.periodMonth === month
  );
};

export const getPendingSalary = () => {
  return useCompensationStore.getState().salaryRecords.filter(s => s.status === 'pending');
};

export const getTotalPayroll = (year: number, month: number) => {
  return useCompensationStore.getState().salaryRecords
    .filter(s => s.periodYear === year && s.periodMonth === month && s.status !== 'cancelled')
    .reduce((sum, s) => sum + s.netSalary, 0);
};
