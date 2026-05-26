/**
 * 合同管理 Zustand Store
 *
 * 架构：纯前端持久化（合同管理无独立后端API，使用mock种子数据）
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 主存储：localStorage persist
 * 种子数据：mockContracts 作为初始数据
 */

import { create } from 'zustand';
// ==================== 类型定义 ====================

/** 合同类型 */
export type ContractType = '劳动合同' | '实习协议' | '劳务合同';

/** 合同状态 */
export type ContractStatus = '生效中' | '即将到期' | '已到期' | '已终止';

/** 合同记录（camelCase） */
export interface ContractData {
  id: string;
  contractCode: string;
  staffId: string;
  staffName: string;
  idCard: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  status: ContractStatus;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  attachments?: string[];
  remarks?: string;
  createdAt: string;
  updatedAt: string;
}

/** 合同表单数据 */
export interface ContractFormData {
  staffName: string;
  idCard: string;
  contractType: ContractType;
  startDate: string;
  endDate: string;
  monthlySalary?: number;
  dailyWage?: number;
  hourlyWage?: number;
  signingDate?: string;
  remarks?: string;
}

/** 合同筛选条件 */
export interface ContractFilters {
  status: ContractStatus | '';
  contractType: ContractType | '';
  keyword: string;
}

// ==================== 种子数据 ====================

/** 初始mock合同数据（无后端API时的种子数据） */
const MOCK_CONTRACTS: ContractData[] = [
  {
    id: 'ht001',
    contractCode: 'HT-20260101-001',
    staffId: 's001',
    staffName: '张三',
    idCard: '110101199001011234',
    contractType: '劳动合同',
    startDate: '2026-01-01',
    endDate: '2028-12-31',
    status: '生效中',
    monthlySalary: 8000,
    signingDate: '2026-01-01',
    createdAt: '2026-01-01',
    updatedAt: '2026-01-01',
  },
  {
    id: 'ht002',
    contractCode: 'HT-20260301-001',
    staffId: 's002',
    staffName: '李四',
    idCard: '110101199002021234',
    contractType: '劳务合同',
    startDate: '2026-03-01',
    endDate: '2026-05-31',
    status: '即将到期',
    dailyWage: 200,
    signingDate: '2026-03-01',
    createdAt: '2026-03-01',
    updatedAt: '2026-03-15',
  },
  {
    id: 'ht003',
    contractCode: 'HT-20260201-001',
    staffId: 's003',
    staffName: '王五',
    idCard: '110101199003031234',
    contractType: '实习协议',
    startDate: '2026-02-01',
    endDate: '2026-05-01',
    status: '已到期',
    hourlyWage: 25,
    signingDate: '2026-02-01',
    createdAt: '2026-02-01',
    updatedAt: '2026-05-01',
  },
  {
    id: 'ht004',
    contractCode: 'HT-20260315-001',
    staffId: 's004',
    staffName: '赵六',
    idCard: '110101199004041234',
    contractType: '劳动合同',
    startDate: '2026-03-15',
    endDate: '2029-03-14',
    status: '生效中',
    monthlySalary: 10000,
    signingDate: '2026-03-15',
    createdAt: '2026-03-15',
    updatedAt: '2026-03-15',
  },
];

// ==================== Store 接口 ====================

interface ContractState {
  /** 合同列表 */
  items: ContractData[];

  // CRUD
  createContract: (data: ContractFormData) => void;
  updateContract: (id: string, data: Partial<ContractFormData>) => void;
  terminateContract: (id: string, reason: string) => void;
  deleteContract: (id: string) => void;
  getContractById: (id: string) => ContractData | undefined;
  getExpiringContracts: (days: number) => ContractData[];

  /** 计算合同状态（基于日期） */
  getComputedStatus: (contract: ContractData) => ContractStatus;
}

// ==================== 创建 Store ====================

export const useContractStore = create<ContractState>()(
  (set, get)=> ({
      items: MOCK_CONTRACTS,

      /** 创建合同 */
      createContract: (data) => {
        const today = new Date().toISOString().split('T')[0];
        const newContract: ContractData = {
          id: `ht${Date.now()}`,
          contractCode: `HT-${today.replace(/-/g, '')}-${String(get().items.length + 1).padStart(3, '0')}`,
          staffId: `s${Date.now()}`,
          staffName: data.staffName,
          idCard: data.idCard,
          contractType: data.contractType,
          startDate: data.startDate,
          endDate: data.endDate,
          monthlySalary: data.monthlySalary,
          dailyWage: data.dailyWage,
          hourlyWage: data.hourlyWage,
          signingDate: data.signingDate || today,
          status: '生效中',
          createdAt: today,
          updatedAt: today,
        };
        set((state) => ({ items: [newContract, ...state.items] }));
      },

      /** 更新合同 */
      updateContract: (id, data) => {
        set((state) => ({
          items: state.items.map((c) =>
            c.id === id ? { ...c, ...data, updatedAt: new Date().toISOString().split('T')[0] } : c
          ),
        }));
      },

      /** 终止合同 */
      terminateContract: (id, reason) => {
        set((state) => ({
          items: state.items.map((c) =>
            c.id === id
              ? { ...c, status: '已终止' as ContractStatus, remarks: reason, updatedAt: new Date().toISOString().split('T')[0] }
              : c
          ),
        }));
      },

      /** 删除合同 */
      deleteContract: (id) => {
        set((state) => ({ items: state.items.filter((c) => c.id !== id) }));
      },

      /** 根据ID获取合同 */
      getContractById: (id) => {
        return get().items.find((c) => c.id === id);
      },

      /** 获取即将到期的合同 */
      getExpiringContracts: (days) => {
        const today = new Date();
        return get().items.filter((c) => {
          if (c.status === '已终止' || c.status === '已到期') return false;
          const endDate = new Date(c.endDate);
          const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
          return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
        });
      },

      /** 计算合同实际状态 */
      getComputedStatus: (contract) => {
        const today = new Date();
        const endDate = new Date(contract.endDate);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        if (contract.status === '已终止') return '已终止';
        if (daysUntilExpiry < 0) return '已到期';
        if (daysUntilExpiry <= 30) return '即将到期';
        return '生效中';
      },
    })
);
