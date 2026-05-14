/**
 * 工资管理 Zustand Store
 *
 * 架构：纯本地 mock 种子数据 + localStorage 持久化
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 后端无独立 salary API，使用 mock 种子数据
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== 类型定义（与 salary/types.ts 保持一致）==========

export type SalaryCalcType = '月薪制' | '日薪制' | '时薪制';
export type SalaryStatus = '待确认' | '已确认' | '已发放';

export interface SalaryRecord {
  id: string;
  staffId: string;
  staffName: string;
  month: string;  // YYYY-MM
  calcType: SalaryCalcType;
  baseSalary: number;
  overtimePay: number;
  bonuses: number;
  deductions: number;
  lateDeductions: number;
  absenceDeductions: number;
  socialSecurity: number;
  housingFund: number;
  personalTax: number;
  netSalary: number;
  status: SalaryStatus;
}

// ========== 种子数据 ==========

function generateSeedData(): SalaryRecord[] {
  return [
    {
      id: 'SAL001', staffId: 'W001', staffName: '张明', month: '2024-01', calcType: '月薪制',
      baseSalary: 5000, overtimePay: 800, bonuses: 500, deductions: 0,
      lateDeductions: 0, absenceDeductions: 0, socialSecurity: 450, housingFund: 300,
      personalTax: 285, netSalary: 5265, status: '已发放',
    },
    {
      id: 'SAL002', staffId: 'W002', staffName: '李华', month: '2024-01', calcType: '日薪制',
      baseSalary: 0, overtimePay: 0, bonuses: 0, deductions: 200,
      lateDeductions: 50, absenceDeductions: 150, socialSecurity: 0, housingFund: 0,
      personalTax: 0, netSalary: 2600, status: '已发放',
    },
    {
      id: 'SAL003', staffId: 'W001', staffName: '张明', month: '2024-02', calcType: '月薪制',
      baseSalary: 5000, overtimePay: 1200, bonuses: 800, deductions: 0,
      lateDeductions: 0, absenceDeductions: 0, socialSecurity: 450, housingFund: 300,
      personalTax: 375, netSalary: 5875, status: '已确认',
    },
    {
      id: 'SAL004', staffId: 'W003', staffName: '王芳', month: '2024-02', calcType: '时薪制',
      baseSalary: 0, overtimePay: 0, bonuses: 0, deductions: 100,
      lateDeductions: 100, absenceDeductions: 0, socialSecurity: 0, housingFund: 0,
      personalTax: 0, netSalary: 1800, status: '待确认',
    },
    {
      id: 'SAL005', staffId: 'W001', staffName: '张明', month: '2024-03', calcType: '月薪制',
      baseSalary: 5000, overtimePay: 600, bonuses: 300, deductions: 0,
      lateDeductions: 100, absenceDeductions: 0, socialSecurity: 450, housingFund: 300,
      personalTax: 225, netSalary: 4825, status: '已发放',
    },
    {
      id: 'SAL006', staffId: 'W004', staffName: '赵强', month: '2024-03', calcType: '日薪制',
      baseSalary: 0, overtimePay: 0, bonuses: 200, deductions: 300,
      lateDeductions: 0, absenceDeductions: 300, socialSecurity: 0, housingFund: 0,
      personalTax: 0, netSalary: 2600, status: '已确认',
    },
    {
      id: 'SAL007', staffId: 'W002', staffName: '李华', month: '2024-04', calcType: '日薪制',
      baseSalary: 0, overtimePay: 0, bonuses: 0, deductions: 150,
      lateDeductions: 150, absenceDeductions: 0, socialSecurity: 0, housingFund: 0,
      personalTax: 0, netSalary: 2700, status: '待确认',
    },
    {
      id: 'SAL008', staffId: 'W005', staffName: '陈静', month: '2024-04', calcType: '月薪制',
      baseSalary: 4500, overtimePay: 400, bonuses: 600, deductions: 0,
      lateDeductions: 0, absenceDeductions: 0, socialSecurity: 405, housingFund: 270,
      personalTax: 188, netSalary: 4637, status: '待确认',
    },
  ];
}

// ========== Store 类型 ==========

interface SalaryState {
  records: SalaryRecord[];
  isLoading: boolean;
  error: string | null;

  // CRUD
  fetchRecords: () => Promise<void>;
  addRecord: (data: Omit<SalaryRecord, 'id'>) => void;
  updateRecord: (id: string, updates: Partial<SalaryRecord>) => void;
  deleteRecord: (id: string) => void;
  updateRecordStatus: (id: string, status: SalaryStatus) => void;

  // 初始化种子数据
  _initSeedData: () => void;
}

// ========== Store 实现 ==========

export const useSalaryStore = create<SalaryState>()(
  persist(
    (set, get) => ({
      records: [],
      isLoading: false,
      error: null,

      fetchRecords: async () => {
        set({ isLoading: true, error: null });
        try {
          const current = get().records;
          if (current.length === 0) {
            get()._initSeedData();
          }
          set({ isLoading: false });
        } catch (error) {
          console.warn('[SalaryStore] 获取工资数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addRecord: (data) => {
        const newId = `SAL${String(Date.now()).slice(-6)}`;
        const newRecord: SalaryRecord = { ...data, id: newId };
        set((state) => ({ records: [newRecord, ...state.records] }));
      },

      updateRecord: (id, updates) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, ...updates } : r
          ),
        }));
      },

      deleteRecord: (id) => {
        set((state) => ({ records: state.records.filter((r) => r.id !== id) }));
      },

      updateRecordStatus: (id, status) => {
        set((state) => ({
          records: state.records.map((r) =>
            r.id === id ? { ...r, status } : r
          ),
        }));
      },

      _initSeedData: () => {
        const seed = generateSeedData();
        set({ records: seed, isLoading: false });
        console.log('[SalaryStore] 已初始化种子数据:', seed.length, '条工资记录');
      },
    }),
    {
      name: 'salary-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ records: state.records }),
    }
  )
);
