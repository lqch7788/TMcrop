/**
 * 合同管理 Zustand Store
 *
 * 架构：Component → Zustand Store → apiContractService → enhancedApiClient → 后端API (SQLite)
 * 数据流：V2.1 铁律（无缓存、无 persist、无 IndexedDB）
 *
 * 2026-06-27 P0：原 mock 模式已废弃，改为 API 持久化模式
 */

import { create } from 'zustand';
import * as contractService from '../services/apiContractService';
import type { ContractData, ContractStatus, ContractType } from '../services/apiContractService';

// ==================== 类型定义 ====================

export type { ContractData, ContractStatus, ContractType };

/** 合同表单数据（camelCase） */
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

// ==================== Store 接口 ====================

interface ContractState {
  /** 合同列表 */
  items: ContractData[];
  /** 加载状态 */
  isLoading: boolean;
  /** 错误信息 */
  error: string | null;
  /** 筛选条件 */
  filters: ContractFilters;

  // 数据加载
  fetchContracts: (filters?: ContractFilters) => Promise<void>;
  setFilters: (filters: Partial<ContractFilters>) => void;
  resetFilters: () => void;

  // CRUD
  createContract: (data: ContractFormData) => Promise<ContractData>;
  updateContract: (id: string, data: Partial<ContractFormData>) => Promise<ContractData>;
  terminateContract: (id: string, reason: string) => Promise<ContractData>;
  deleteContract: (id: string) => Promise<boolean>;

  /** 根据ID获取合同 */
  getContractById: (id: string) => ContractData | undefined;
  /** 获取即将到期的合同 */
  getExpiringContracts: (days: number) => ContractData[];

  /** 计算合同状态（基于日期） */
  getComputedStatus: (contract: ContractData) => ContractStatus;
}

// ==================== 创建 Store ====================

export const useContractStore = create<ContractState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,
    filters: { status: '', contractType: '', keyword: '' },

    /** 加载合同列表 */
    fetchContracts: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const f = filters || get().filters;
        const response = await contractService.getContracts({
          status: f.status || undefined,
          contractType: f.contractType || undefined,
          keyword: f.keyword || undefined,
        });
        set({ items: response.records, isLoading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载合同失败';
        set({ error: msg, isLoading: false });
        throw e;
      }
    },

    setFilters: (filters) => set((state) => ({ filters: { ...state.filters, ...filters } })),
    resetFilters: () => set({ filters: { status: '', contractType: '', keyword: '' } }),

    /** 创建合同（API 持久化） */
    createContract: async (data) => {
      const created = await contractService.createContract({
        staffId: `s_${Date.now()}`,
        staffName: data.staffName,
        idCard: data.idCard,
        contractType: data.contractType,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlySalary: data.monthlySalary,
        dailyWage: data.dailyWage,
        hourlyWage: data.hourlyWage,
        signingDate: data.signingDate,
        remarks: data.remarks,
      });
      set((state) => ({ items: [created, ...state.items] }));
      return created;
    },

    /** 更新合同 */
    updateContract: async (id, data) => {
      const updated = await contractService.updateContract(id, {
        staffName: data.staffName,
        idCard: data.idCard,
        contractType: data.contractType,
        startDate: data.startDate,
        endDate: data.endDate,
        monthlySalary: data.monthlySalary,
        dailyWage: data.dailyWage,
        hourlyWage: data.hourlyWage,
        signingDate: data.signingDate,
        remarks: data.remarks,
      });
      set((state) => ({
        items: state.items.map((c) => (c.id === id ? updated : c)),
      }));
      return updated;
    },

    /** 终止合同 */
    terminateContract: async (id, reason) => {
      const updated = await contractService.updateContract(id, {
        status: '已终止',
        remarks: reason,
      });
      set((state) => ({
        items: state.items.map((c) => (c.id === id ? updated : c)),
      }));
      return updated;
    },

    /** 删除合同（软删） */
    deleteContract: async (id) => {
      await contractService.deleteContract(id);
      set((state) => ({ items: state.items.filter((c) => c.id !== id) }));
      return true;
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