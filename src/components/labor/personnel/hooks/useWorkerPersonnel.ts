import { useState, useMemo, useEffect } from 'react';
import { Worker } from '../../../../types';
import { useWorkerStore } from '@/stores/useWorkerStore';

interface WorkerFilters {
  searchTerm: string;
  departmentFilter: string;
  statusFilter: string;
}

/**
 * 员工人事数据管理Hook
 * 数据源：useWorkerStore (Zustand Store → API → 组件)
 * 组件不直接读写 localStorage，不直接调用 API
 */
export function useWorkerPersonnel() {
  const { workers, loading, loadWorkers } = useWorkerStore();

  // 初次加载时获取数据
  useEffect(() => {
    loadWorkers();
  }, [loadWorkers]);

  const [filters, setFilters] = useState<WorkerFilters>({
    searchTerm: '',
    departmentFilter: '全部',
    statusFilter: '全部',
  });

  const setSearchTerm = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const setDepartmentFilter = (departmentFilter: string) => {
    setFilters(prev => ({ ...prev, departmentFilter }));
  };

  const setStatusFilter = (statusFilter: string) => {
    setFilters(prev => ({ ...prev, statusFilter }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      departmentFilter: '全部',
      statusFilter: '全部',
    });
  };

  const filteredWorkers = useMemo(() => {
    return workers.filter((worker) => {
      const matchSearch =
        worker.name.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        worker.workerId.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchDepartment = filters.departmentFilter === '全部' || worker.department === filters.departmentFilter;
      const matchStatus = filters.statusFilter === '全部' || worker.status === filters.statusFilter;
      return matchSearch && matchDepartment && matchStatus;
    });
  }, [workers, filters]);

  // 统计
  const stats = useMemo(() => ({
    total: workers.length,
    inService: workers.filter(w => w.status === '在职').length,
    left: workers.filter(w => w.status === '离职').length,
    retired: workers.filter(w => w.status === '退休').length,
  }), [workers]);

  // 获取部门列表
  const departments = useMemo(() => {
    const depts = [...new Set(workers.map(w => w.department))];
    return ['全部', ...depts];
  }, [workers]);

  return {
    filters,
    filteredWorkers,
    stats,
    departments,
    isLoading: loading,
    setSearchTerm,
    setDepartmentFilter,
    setStatusFilter,
    resetFilters,
  };
}

export default useWorkerPersonnel;
