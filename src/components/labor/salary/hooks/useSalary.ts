import { useState, useMemo, useEffect } from 'react';
import type { SalaryRecord, SalaryFilters, SalaryPagination, SalaryCalculateData } from '../types';
import { useSalaryStore } from '@/stores/useSalaryStore';

/**
 * 工资数据管理Hook
 * 数据源：useSalaryStore (Zustand store, mock种子数据 + localStorage持久化)
 */
export function useSalary() {
  const {
    records: storeRecords,
    isLoading,
    fetchRecords,
    addRecord: storeAdd,
    updateRecord: storeUpdate,
    deleteRecord: storeDelete,
    updateRecordStatus: storeUpdateStatus,
  } = useSalaryStore();

  const [filters, setFilters] = useState<SalaryFilters>({});
  const [pagination, setPagination] = useState<SalaryPagination>({
    currentPage: 1,
    pageSize: 10,
    total: storeRecords.length,
  });

  // 初次加载时初始化种子数据
  useEffect(() => {
    if (storeRecords.length === 0) {
      fetchRecords();
    }
  }, []);

  // 同步 total
  useEffect(() => {
    setPagination((prev) => ({ ...prev, total: storeRecords.length }));
  }, [storeRecords.length]);

  // 根据筛选条件过滤数据
  const filteredData = useMemo(() => {
    return storeRecords.filter((record) => {
      if (filters.month && record.month !== filters.month) return false;
      if (filters.staffName && !record.staffName.includes(filters.staffName)) return false;
      if (filters.calcType && record.calcType !== filters.calcType) return false;
      if (filters.status && record.status !== filters.status) return false;
      return true;
    });
  }, [storeRecords, filters]);

  // 分页后的数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  // 更新筛选条件
  const updateFilters = (newFilters: Partial<SalaryFilters>) => {
    setFilters((prev) => ({ ...prev, ...newFilters }));
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // 重置筛选
  const resetFilters = () => {
    setFilters({});
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  };

  // 分页操作
  const handlePageChange = (page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  };

  const handlePageSizeChange = (size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  };

  // 计算工资 (针对临时工)
  const calculateSalary = (record: SalaryRecord, data: SalaryCalculateData): number => {
    let total = 0;
    if (record.calcType === '日薪制' && data.daysWorked && data.dailyRate) {
      total = data.daysWorked * data.dailyRate;
    } else if (record.calcType === '时薪制' && data.hoursWorked && data.hourlyRate) {
      total = data.hoursWorked * data.hourlyRate;
    }
    total += record.overtimePay + record.bonuses;
    total -= record.deductions + record.lateDeductions + record.absenceDeductions;
    total -= record.socialSecurity + record.housingFund + record.personalTax;
    return Math.max(0, total);
  };

  // 更新记录状态
  const updateRecordStatus = (recordId: string, status: SalaryRecord['status']) => {
    storeUpdateStatus(recordId, status);
  };

  // 添加工资记录
  const addSalaryRecord = (data: Omit<SalaryRecord, 'id'>) => {
    storeAdd(data);
  };

  return {
    data: paginatedData,
    total: filteredData.length,
    pagination,
    filters,
    isLoading,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    calculateSalary,
    updateRecordStatus,
    addSalaryRecord,
  };
}
