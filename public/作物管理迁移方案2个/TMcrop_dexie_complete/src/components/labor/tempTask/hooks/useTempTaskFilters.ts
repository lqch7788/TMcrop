import { useState, useMemo } from 'react';
import { TempTask, TempTaskUrgency } from '../../../../types';
import { getTaskOverdueStatus } from '../../../../hooks/useTempTasks';

interface TempTaskFilters {
  searchTerm: string;
  urgencyFilter: 'all' | TempTaskUrgency;
  statusFilter: 'all' | TempTask['status'];
  overdueFilter: 'all' | 'overdue' | 'warning';  // 超时筛选
}

interface UseTempTaskFiltersProps {
  tasks: TempTask[];
}

export function useTempTaskFilters({ tasks }: UseTempTaskFiltersProps) {
  const [filters, setFilters] = useState<TempTaskFilters>({
    searchTerm: '',
    urgencyFilter: 'all',
    statusFilter: 'all',
    overdueFilter: 'all',
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

  const setOverdueFilter = (overdueFilter: 'all' | 'overdue' | 'warning') => {
    setFilters(prev => ({ ...prev, overdueFilter }));
  };

  const resetFilters = () => {
    setFilters({
      searchTerm: '',
      urgencyFilter: 'all',
      statusFilter: 'all',
      overdueFilter: 'all',
    });
  };

  const filteredTasks = useMemo(() => {
    return tasks.filter((task) => {
      const matchSearch =
        task.title.toLowerCase().includes(filters.searchTerm.toLowerCase()) ||
        task.taskCode.toLowerCase().includes(filters.searchTerm.toLowerCase());
      const matchUrgency = filters.urgencyFilter === 'all' || task.urgency === filters.urgencyFilter;
      const matchStatus = filters.statusFilter === 'all' || task.status === filters.statusFilter;

      // 超时筛选
      let matchOverdue = true;
      if (filters.overdueFilter === 'overdue') {
        matchOverdue = getTaskOverdueStatus(task) === 'overdue';
      } else if (filters.overdueFilter === 'warning') {
        matchOverdue = getTaskOverdueStatus(task) === 'warning';
      }

      return matchSearch && matchUrgency && matchStatus && matchOverdue;
    });
  }, [tasks, filters]);

  // 统计
  const stats = useMemo(() => ({
    total: tasks.length,
    pending: tasks.filter(t => t.status === 'pending').length,
    inProgress: tasks.filter(t => t.status === 'in_progress').length,
    completed: tasks.filter(t => t.status === 'completed').length,
    critical: tasks.filter(t => t.urgency === 'critical').length,
    overdue: tasks.filter(t => getTaskOverdueStatus(t) === 'overdue').length,
    warning: tasks.filter(t => getTaskOverdueStatus(t) === 'warning').length,
  }), [tasks]);

  return {
    filters,
    filteredTasks,
    stats,
    setSearchTerm,
    setUrgencyFilter,
    setStatusFilter,
    setOverdueFilter,
    resetFilters,
  };
}

export default useTempTaskFilters;
