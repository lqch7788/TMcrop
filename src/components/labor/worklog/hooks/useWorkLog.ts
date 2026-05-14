import { useState, useCallback, useMemo } from 'react';
import { useWorkLogStore } from '@/stores/useWorkLogStore';
import type { WorkLog, WorkLogFilters, PaginationInfo, UseWorkLogReturn } from '../types';

/**
 * 工作日志数据管理 Hook (V2.0 改造：使用 Zustand Store)
 */
export function useWorkLog(): UseWorkLogReturn {
  // 从 Zustand Store 获取数据和方法
  const workLogs = useWorkLogStore((s) => s.workLogs);
  const storeFilters = useWorkLogStore((s) => s.filters);
  const storeSetFilters = useWorkLogStore((s) => s.setFilters);
  const storeAddWorkLog = useWorkLogStore((s) => s.addWorkLog);
  const storeUpdateWorkLog = useWorkLogStore((s) => s.updateWorkLog);

  // 筛选条件（本地 UI 状态覆盖 Store 持久化状态）
  const [filters, setFilters] = useState<WorkLogFilters>(storeFilters);

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);

  // 选中日志（用于详情/编辑）
  const [selectedLog, setSelectedLog] = useState<WorkLog | null>(null);

  // 弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 筛选后的数据
  const filteredData = useMemo(() => {
    return workLogs.filter((log) => {
      if (filters.date && log.date !== filters.date) return false;
      if (filters.worker && !log.worker.includes(filters.worker)) return false;
      if (filters.greenhouse && filters.greenhouse !== '全部' && log.greenhouse !== filters.greenhouse) return false;
      return true;
    });
  }, [workLogs, filters]);

  // 分页信息
  const pagination: PaginationInfo = {
    currentPage,
    pageSize,
    total: filteredData.length,
  };

  // 设置筛选条件
  const handleSetFilters = useCallback((newFilters: WorkLogFilters) => {
    setFilters(newFilters);
    storeSetFilters(newFilters);
    setCurrentPage(1);
  }, [storeSetFilters]);

  // 设置页码
  const handleSetPage = useCallback((page: number) => {
    setCurrentPage(page);
  }, []);

  // 设置每页条数
  const handleSetPageSize = useCallback((size: number) => {
    setPageSize(size);
    setCurrentPage(1);
  }, []);

  // 保存日志（新建/编辑）— 通过 Store 持久化
  const handleSave = useCallback((data: Partial<WorkLog>) => {
    if (data.id) {
      storeUpdateWorkLog(data.id, data);
    } else {
      storeAddWorkLog(data);
    }
    setIsFormOpen(false);
  }, [storeAddWorkLog, storeUpdateWorkLog]);

  return {
    data: filteredData,
    filters,
    pagination,
    setFilters: handleSetFilters,
    setPage: handleSetPage,
    setPageSize: handleSetPageSize,
    selectedLog,
    setSelectedLog,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
  };
}
