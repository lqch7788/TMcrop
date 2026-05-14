/**
 * 临时工数据管理 Hook
 * 数据源：useTempWorkerStore (Zustand store, mock种子数据 + localStorage持久化)
 */
import { useState, useCallback, useMemo, useEffect } from 'react';
import {
  TempWorker,
  TempWorkerFilters,
  PaginationInfo,
  UseTempWorkerReturn,
} from '../types';
import { useTempWorkerStore } from '@/stores/useTempWorkerStore';

/**
 * 生成新的员工工号
 * 格式: YG-YYYYMMDD-XXX
 */
function generateEmployeeCode(): string {
  const now = new Date();
  const dateStr = now.toISOString().slice(0, 10).replace(/-/g, '');
  const randomNum = String(Math.floor(Math.random() * 999) + 1).padStart(3, '0');
  return `YG-${dateStr}-${randomNum}`;
}

export function useTempWorker(): UseTempWorkerReturn {
  const {
    workers: storeWorkers,
    isLoading,
    fetchWorkers,
    addWorker: storeAdd,
    updateWorker: storeUpdate,
    deleteWorker: storeDelete,
  } = useTempWorkerStore();

  // 数据（从 Store 获取）
  const [data, setData] = useState<TempWorker[]>(storeWorkers);

  // 初次加载时初始化种子数据
  useEffect(() => {
    if (storeWorkers.length === 0) {
      fetchWorkers();
    }
  }, []);

  // 同步 Store 数据到本地 state（保证 UI 响应）
  useEffect(() => {
    setData(storeWorkers);
  }, [storeWorkers]);

  // 筛选条件状态
  const [filters, setFilters] = useState<TempWorkerFilters>({
    workerType: '',
    status: '',
    keyword: '',
  });

  // 分页状态
  const [pagination, setPaginationState] = useState<PaginationInfo>({
    currentPage: 1,
    pageSize: 10,
    total: storeWorkers.length,
  });

  // 选中记录（用于详情/编辑）
  const [selectedRecord, setSelectedRecord] = useState<TempWorker | null>(null);

  // 详情弹窗状态
  const [isDetailOpen, setIsDetailOpen] = useState(false);

  // 表单弹窗状态
  const [isFormOpen, setIsFormOpen] = useState(false);

  // 筛选数据
  const filteredData = useMemo(() => {
    return data.filter((item) => {
      if (filters.workerType && item.workerType !== filters.workerType) return false;
      if (filters.status && item.status !== filters.status) return false;
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matchName = item.name.toLowerCase().includes(keyword);
        const matchCode = item.employeeCode.toLowerCase().includes(keyword);
        if (!matchName && !matchCode) return false;
      }
      return true;
    });
  }, [data, filters]);

  // 更新筛选条件
  const setFiltersHandler = useCallback((newFilters: TempWorkerFilters) => {
    setFilters(newFilters);
    setPaginationState((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  // 更新分页
  const setPage = useCallback((page: number) => {
    setPaginationState((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPaginationState((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 保存（新建/编辑）
  const handleSave = useCallback((formData: Partial<TempWorker>) => {
    if (formData.id) {
      storeUpdate(formData.id, formData);
    } else {
      storeAdd({
        ...formData,
        employeeCode: formData.employeeCode || generateEmployeeCode(),
        joinDate: new Date().toISOString().slice(0, 10),
      });
    }
    setIsFormOpen(false);
    setSelectedRecord(null);
  }, [storeAdd, storeUpdate]);

  // 删除
  const handleDelete = useCallback((record: TempWorker) => {
    storeDelete(record.id);
  }, [storeDelete]);

  return {
    data: filteredData,
    filters,
    pagination: { ...pagination, total: filteredData.length },
    isLoading,
    setFilters: setFiltersHandler,
    setPage,
    setPageSize,
    selectedRecord,
    setSelectedRecord,
    isDetailOpen,
    setIsDetailOpen,
    isFormOpen,
    setIsFormOpen,
    handleSave,
    handleDelete,
  };
}
