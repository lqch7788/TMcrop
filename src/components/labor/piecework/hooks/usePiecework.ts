import { useState, useMemo, useEffect } from 'react';
import type { PieceRate, PieceworkFilters, PieceworkPagination, PieceworkStats } from '../types';
import { usePieceworkStore } from '@/stores/usePieceworkStore';

// 任务选项
export const taskOptions = [
  { id: 'T001', name: '番茄采收' },
  { id: 'T002', name: '黄瓜分装' },
  { id: 'T003', name: '辣椒采收' },
  { id: 'T004', name: '茄子打包' },
  { id: 'T005', name: '番茄包装' },
];

/**
 * 计件工资数据管理Hook
 * 数据源：usePieceworkStore (Zustand store, mock种子数据 + localStorage持久化)
 */
export function usePiecework() {
  const {
    records: storeRecords,
    isLoading,
    fetchRecords,
    addRecord: storeAdd,
    updateRecord: storeUpdate,
    updateRecordStatus: storeUpdateStatus,
    deleteRecord: storeDelete,
  } = usePieceworkStore();

  const [filters, setFilters] = useState<PieceworkFilters>({});
  const [pagination, setPagination] = useState<PieceworkPagination>({
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

  // 过滤数据
  const filteredData = useMemo(() => {
    return storeRecords.filter((record) => {
      if (filters.workerName && !record.workerName.includes(filters.workerName)) return false;
      if (filters.taskName && !record.taskName.includes(filters.taskName)) return false;
      if (filters.startDate && record.workDate < filters.startDate) return false;
      if (filters.endDate && record.workDate > filters.endDate) return false;
      if (filters.status && record.status !== filters.status) return false;
      return true;
    });
  }, [storeRecords, filters]);

  // 分页数据
  const paginatedData = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredData.slice(start, end);
  }, [filteredData, pagination]);

  // 统计数据
  const stats = useMemo<PieceworkStats>(() => {
    const workers = new Set(filteredData.map((r) => r.workerId));
    const totalQuantity = filteredData.reduce((sum, r) => sum + r.quantity, 0);
    const totalAmount = filteredData.reduce((sum, r) => sum + r.total, 0);
    return {
      totalWorkers: workers.size,
      totalQuantity,
      totalAmount,
      avgAmountPerWorker: workers.size > 0 ? totalAmount / workers.size : 0,
    };
  }, [filteredData]);

  // 更新筛选
  const updateFilters = (newFilters: Partial<PieceworkFilters>) => {
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

  // 计算总工资
  const calculateTotal = (quantity: number, unitPrice: number): number => {
    return quantity * unitPrice;
  };

  // 添加记录
  const addRecord = (data: Omit<PieceRate, 'id' | 'total' | 'createTime'>) => {
    storeAdd(data);
  };

  // 更新记录状态
  const updateRecordStatus = (recordId: string, status: PieceRate['status']) => {
    storeUpdateStatus(recordId, status);
  };

  return {
    data: paginatedData,
    total: filteredData.length,
    stats,
    isLoading,
    pagination,
    filters,
    updateFilters,
    resetFilters,
    handlePageChange,
    handlePageSizeChange,
    calculateTotal,
    addRecord,
    updateRecordStatus,
  };
}
