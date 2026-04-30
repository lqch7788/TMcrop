import { useState, useCallback, useMemo } from 'react';
import type { Contract, ContractFormData, ContractFilters, ContractPagination, ContractStatus } from '../types';

// 模拟合同数据
const mockContracts: Contract[] = [
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

export interface UseContractReturn {
  contracts: Contract[];
  filters: ContractFilters;
  pagination: ContractPagination;
  setFilters: (filters: ContractFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  createContract: (data: ContractFormData) => void;
  updateContract: (id: string, data: Partial<ContractFormData>) => void;
  terminateContract: (id: string, reason: string) => void;
  deleteContract: (id: string) => void;
  getContractById: (id: string) => Contract | undefined;
  getExpiringContracts: (days: number) => Contract[];
  filteredContracts: Contract[];
}

export function useContract(): UseContractReturn {
  const [filters, setFilters] = useState<ContractFilters>({
    status: '',
    contractType: '',
    keyword: '',
  });

  const [pagination, setPagination] = useState<ContractPagination>({
    currentPage: 1,
    pageSize: 10,
    total: mockContracts.length,
  });

  const [contracts, setContracts] = useState<Contract[]>(mockContracts);

  // 计算合同状态（基于日期）
  const getComputedStatus = useCallback((contract: Contract): ContractStatus => {
    const today = new Date();
    const endDate = new Date(contract.endDate);
    const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

    if (contract.status === '已终止') return '已终止';
    if (daysUntilExpiry < 0) return '已到期';
    if (daysUntilExpiry <= 30) return '即将到期';
    return '生效中';
  }, []);

  // 过滤后的合同
  const filteredContracts = useMemo(() => {
    return contracts.filter((contract) => {
      // 状态筛选
      if (filters.status) {
        const computedStatus = getComputedStatus(contract);
        if (computedStatus !== filters.status) return false;
      }
      // 合同类型筛选
      if (filters.contractType && contract.contractType !== filters.contractType) {
        return false;
      }
      // 关键词搜索
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
  }, [contracts, filters, getComputedStatus]);

  // 分页数据
  const paginatedContracts = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredContracts.slice(start, end);
  }, [filteredContracts, pagination]);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 创建合同
  const createContract = useCallback((data: ContractFormData) => {
    const today = new Date().toISOString().split('T')[0];
    const newContract: Contract = {
      id: `ht${Date.now()}`,
      contractCode: `HT-${today.replace(/-/g, '')}-${String(contracts.length + 1).padStart(3, '0')}`,
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
    setContracts((prev) => [newContract, ...prev]);
  }, [contracts.length]);

  // 更新合同
  const updateContract = useCallback((id: string, data: Partial<ContractFormData>) => {
    setContracts((prev) =>
      prev.map((contract) =>
        contract.id === id ? { ...contract, ...data, updatedAt: new Date().toISOString().split('T')[0] } : contract
      )
    );
  }, []);

  // 终止合同
  const terminateContract = useCallback((id: string, reason: string) => {
    setContracts((prev) =>
      prev.map((contract) =>
        contract.id === id
          ? { ...contract, status: '已终止', remarks: reason, updatedAt: new Date().toISOString().split('T')[0] }
          : contract
      )
    );
  }, []);

  // 删除合同
  const deleteContract = useCallback((id: string) => {
    setContracts((prev) => prev.filter((contract) => contract.id !== id));
  }, []);

  // 根据ID获取合同
  const getContractById = useCallback(
    (id: string) => {
      return contracts.find((contract) => contract.id === id);
    },
    [contracts]
  );

  // 获取即将到期的合同
  const getExpiringContracts = useCallback(
    (days: number) => {
      const today = new Date();
      return contracts.filter((contract) => {
        if (contract.status === '已终止' || contract.status === '已到期') return false;
        const endDate = new Date(contract.endDate);
        const daysUntilExpiry = Math.ceil((endDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
        return daysUntilExpiry >= 0 && daysUntilExpiry <= days;
      });
    },
    [contracts]
  );

  return {
    contracts: paginatedContracts,
    filters,
    pagination: { ...pagination, total: filteredContracts.length },
    setFilters,
    setPage,
    setPageSize,
    createContract,
    updateContract,
    terminateContract,
    deleteContract,
    getContractById,
    getExpiringContracts,
    filteredContracts,
  };
}
