import { useState, useCallback, useMemo, useEffect } from 'react';
import { useContractStore } from '@/stores';
import type { ContractData, ContractFormData, ContractFilters, ContractStatus } from '@/stores';

export interface UseContractReturn {
  contracts: ContractData[];
  filters: ContractFilters;
  pagination: { currentPage: number; pageSize: number; total: number };
  setFilters: (filters: ContractFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  createContract: (data: ContractFormData) => void;
  updateContract: (id: string, data: Partial<ContractFormData>) => void;
  terminateContract: (id: string, reason: string) => void;
  deleteContract: (id: string) => void;
  getContractById: (id: string) => ContractData | undefined;
  getExpiringContracts: (days: number) => ContractData[];
  filteredContracts: ContractData[];
}

export function useContract(): UseContractReturn {
  // ========== 从 Store 获取数据和方法 ==========
  const items = useContractStore((s) => s.items);
  const storeCreateContract = useContractStore((s) => s.createContract);
  const storeUpdateContract = useContractStore((s) => s.updateContract);
  const storeTerminateContract = useContractStore((s) => s.terminateContract);
  const storeDeleteContract = useContractStore((s) => s.deleteContract);
  const storeGetContractById = useContractStore((s) => s.getContractById);
  const storeGetExpiringContracts = useContractStore((s) => s.getExpiringContracts);
  const storeGetComputedStatus = useContractStore((s) => s.getComputedStatus);

  // ========== 组件挂载时初始化数据（确保种子数据存在） ==========
  useEffect(() => {
    // Store persist 会自动从 localStorage 恢复数据
    // 如果是首次使用（无缓存），自动使用 MOCK_CONTRACTS 种子数据
    if (items.length === 0) {
      // 种子数据已在 Store 初始化时设置（MOCK_CONTRACTS）
      // 如果确实为空（用户清空了数据），不自动恢复
    }
  }, [items.length]);

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
    setFilters,
    setPage,
    setPageSize,
    createContract: storeCreateContract,
    updateContract: storeUpdateContract,
    terminateContract: storeTerminateContract,
    deleteContract: storeDeleteContract,
    getContractById: storeGetContractById,
    getExpiringContracts: storeGetExpiringContracts,
    filteredContracts,
  };
}
