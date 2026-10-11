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
  // Worker.status 联合为中文状态；历史数据可能仍是英文枚举，用 string 常量比较避免字面量无交集误报
  const stats = useMemo(() => {
    const legacyActive = 'active' as string;
    const legacyInactive = 'inactive' as string;
    return {
      total: workers.length,
      inService: workers.filter(w => w.status === '在职' || w.status === legacyActive).length,
      left: workers.filter(w => w.status === '离职' || w.status === legacyInactive).length,
      retired: workers.filter(w => w.status === '退休').length,
    };
  }, [workers]);

  // 获取部门列表
  const departments = useMemo(() => {
    // 后端字段名两种写法（department / departmentName），运行时都兜底
    const depts = [...new Set(
      workers
        .map(w => w.department || (w as { departmentName?: string }).departmentName)
        .filter((d): d is string => !!d)
    )];
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
