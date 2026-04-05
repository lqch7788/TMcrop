/**
 * 临时工数据管理 Hook
 * 统一管理临时工相关的数据和操作逻辑
 */
import { useState, useCallback, useMemo } from 'react';
import {
  TempWorker,
  TempWorkerFilters,
  PaginationInfo,
  UseTempWorkerReturn,
} from '../types';
import { mockTempWorkers } from '../mockData';

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
  // 数据列表
  const [data, setData] = useState<TempWorker[]>(mockTempWorkers);

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
    total: mockTempWorkers.length,
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
      // 按工人类型筛选
      if (filters.workerType && item.workerType !== filters.workerType) {
        return false;
      }
      // 按状态筛选
      if (filters.status && item.status !== filters.status) {
        return false;
      }
      // 按关键词搜索（姓名、工号）
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        const matchName = item.name.toLowerCase().includes(keyword);
        const matchCode = item.employeeCode.toLowerCase().includes(keyword);
        if (!matchName && !matchCode) {
          return false;
        }
      }
      return true;
    });
  }, [data, filters]);

  // 更新筛选条件
  const setFiltersHandler = useCallback((newFilters: TempWorkerFilters) => {
    setFilters(newFilters);
    setPaginationState((prev) => ({ ...prev, currentPage: 1 })); // 重置页码
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
      // 编辑模式
      setData((prev) =>
        prev.map((item) =>
          item.id === formData.id ? { ...item, ...formData } : item
        )
      );
    } else {
      // 新建模式
      const newRecord: TempWorker = {
        ...formData as TempWorker,
        id: String(Date.now()),
        employeeCode: generateEmployeeCode(),
        joinDate: new Date().toISOString().slice(0, 10),
      };
      setData((prev) => [newRecord, ...prev]);
    }
    setIsFormOpen(false);
    setSelectedRecord(null);
  }, []);

  // 删除
  const handleDelete = useCallback((record: TempWorker) => {
    setData((prev) => prev.filter((item) => item.id !== record.id));
  }, []);

  return {
    data: filteredData,
    filters,
    pagination,
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
