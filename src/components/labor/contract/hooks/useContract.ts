import { useState, useCallback, useMemo, useEffect } from 'react';
import { useContractStore } from '@/stores';
import type { ContractData, ContractFormData, ContractFilters, ContractStatus } from '@/stores';

/** 业务接口（async：返回 Promise 让调用方能 await + 错误处理） */
export interface UseContractReturn {
  contracts: ContractData[];
  filters: ContractFilters;
  pagination: { currentPage: number; pageSize: number; total: number };
  isLoading: boolean;
  error: string | null;
  setFilters: (filters: ContractFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  /** 主动刷新（重新从后端拉取） */
  refresh: () => Promise<void>;
  /** CRUD（async，失败会抛错给调用方） */
  createContract: (data: ContractFormData) => Promise<ContractData>;
  updateContract: (id: string, data: Partial<ContractFormData>) => Promise<ContractData>;
  terminateContract: (id: string, reason: string) => Promise<ContractData>;
  deleteContract: (id: string) => Promise<boolean>;
  getContractById: (id: string) => ContractData | undefined;
  getExpiringContracts: (days: number) => ContractData[];
  filteredContracts: ContractData[];
}

export function useContract(): UseContractReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const items = useContractStore((s) => s.items);
  const isLoading = useContractStore((s) => s.isLoading);
  const error = useContractStore((s) => s.error);
  const storeFetch = useContractStore((s) => s.fetchContracts);
  const storeCreateContract = useContractStore((s) => s.createContract);
  const storeUpdateContract = useContractStore((s) => s.updateContract);
  const storeTerminateContract = useContractStore((s) => s.terminateContract);
  const storeDeleteContract = useContractStore((s) => s.deleteContract);
  const storeGetContractById = useContractStore((s) => s.getContractById);
  const storeGetExpiringContracts = useContractStore((s) => s.getExpiringContracts);
  const storeGetComputedStatus = useContractStore((s) => s.getComputedStatus);

  // ========== 组件挂载时从后端拉取 ==========
  useEffect(() => {
    storeFetch().catch((e) => {
      // fetchContracts 已经在 store 内 setError，这里只 log
      console.error('[useContract] fetchContracts failed:', e);
    });
    // 只挂载时跑一次
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ========== 本地 UI 状态 ==========
  const [filters, setFilters] = useState<ContractFilters>({
    status: '',
    contractType: '',
    keyword: '',
  });

  const [pagination, setPagination] = useState({
    currentPage: 1,
    pageSize: 10,
    total: items.length,
  });

  // ========== 业务逻辑 ==========

  /** 计算合同状态（基于日期） */
  const getComputedStatus = useCallback((contract: ContractData): ContractStatus => {
    return storeGetComputedStatus(contract);
  }, [storeGetComputedStatus]);

  /** 过滤后的合同 */
  const filteredContracts = useMemo(() => {
    return items.filter((contract) => {
      if (filters.status) {
        const computedStatus = getComputedStatus(contract);
        if (computedStatus !== filters.status) return false;
      }
      if (filters.contractType && contract.contractType !== filters.contractType) {
        return false;
      }
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        return (
          contract.staffName.toLowerCase().includes(keyword) ||
          contract.idCard.includes(keyword) ||
          contract.contractCode.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [items, filters, getComputedStatus]);

  /** 分页数据 */
  const contracts = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredContracts.slice(start, end);
  }, [filteredContracts, pagination]);

  // 更新总数
  useEffect(() => {
    setPagination((prev) => ({ ...prev, total: filteredContracts.length }));
  }, [filteredContracts.length]);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  return {
    contracts,
    filters,
    pagination: { ...pagination, total: filteredContracts.length },
    isLoading,
    error,
    setFilters,
    setPage,
    setPageSize,
    refresh: () => storeFetch(),
    createContract: storeCreateContract,
    updateContract: storeUpdateContract,
    terminateContract: storeTerminateContract,
    deleteContract: storeDeleteContract,
    getContractById: storeGetContractById,
    getExpiringContracts: storeGetExpiringContracts,
    filteredContracts,
  };
}