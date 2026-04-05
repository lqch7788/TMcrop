import { useState, useMemo } from 'react';
import { TempTask, TempTaskUrgency } from '../../../../types';

interface TempTaskFilters {
  searchTerm: string;
  urgencyFilter: 'all' | TempTaskUrgency;
  statusFilter: 'all' | TempTask['status'];
}

interface UseTempTaskFiltersProps {
  tasks: TempTask[];
}

export function useTempTaskFilters({ tasks }: UseTempTaskFiltersProps) {
  const [filters, setFilters] = useState<TempTaskFilters>({
    searchTerm: '',
    urgencyFilter: 'all',
    statusFilter: 'all',
  });

  const setSearchTerm = (searchTerm: string) => {
    setFilters(prev => ({ ...prev, searchTerm }));
  };

  const setUrgencyFilter = (urgencyFilter: 'all' | TempTaskUrgency) => {
    setFilters(prev => ({ ...prev, urgencyFilter }));
  };

  const setStatusFilter = (statusFilter: 'all' | TempTask['status']) => {
    setFilters(prev => ({ ...prev, statusFilter }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      urgencyFilter: 'all',
      statusFilter: 'all',
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchUrgency = filters.urgencyFilter === 'all' || task.urgency === filters.urgencyFilter;
      const matchStatus = filters.statusFilter === 'all' || task.status === filters.statusFilter;
      return matchSearch && matchUrgency && matchStatus;
    });
  }, [tasks, filters]);

  // 统计
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    critical: tasks.filter(t => t.urgency === 'critical').length,
  }), [tasks]);

  return {
    filters,
    filteredTasks,
    stats,
    setSearchTerm,
    setUrgencyFilter,
    setStatusFilter,
    resetFilters,
  };
}

export default useTempTaskFilters;
