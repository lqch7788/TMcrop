import { useState, useMemo } from 'react';
import { Task } from '../../../types';

export type TaskModeFilter = 'all' | 'glass' | 'solar' | 'field';

interface UseTasksFiltersProps {
  tasks: Task[];
}

export interface TaskFilters {
  searchTerm: string;
  typeFilter: string;
  statusFilter: string;
  modeFilter: TaskModeFilter;
}

export function useTasksFilters({ tasks }: UseTasksFiltersProps) {
  const [filters, setFilters] = useState<TaskFilters>({
    searchTerm: '',
    typeFilter: 'all',
    statusFilter: 'all',
    modeFilter: 'all',
  });

  const setSearchTerm = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const setTypeFilter = (typeFilter: string) => {
    setFilters(prev => ({ ...prev, typeFilter }));
  };

  const setStatusFilter = (statusFilter: string) => {
    setFilters(prev => ({ ...prev, statusFilter }));
  };

  const setModeFilter = (modeFilter: TaskModeFilter) => {
    setFilters(prev => ({ ...prev, modeFilter }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      typeFilter: 'all',
      statusFilter: 'all',
      modeFilter: 'all',
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchType = filters.typeFilter === 'all' || task.type === filters.typeFilter;
      const matchStatus = filters.statusFilter === 'all' || task.status === filters.statusFilter;
      const matchMode = filters.modeFilter === 'all' || task.mode === filters.modeFilter;
      return matchSearch && matchType && matchStatus && matchMode;
    });
  }, [tasks, filters]);

  return {
    filters,
    filteredTasks,
    setSearchTerm,
    setTypeFilter,
    setStatusFilter,
    setModeFilter,
    resetFilters,
  };
}

export default useTasksFilters;
