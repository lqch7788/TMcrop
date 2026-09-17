import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Team, TeamFilters, TeamPagination, UnassignedWorker } from '../types';
import { useTeamManageStore } from '@/stores/useTeamManageStore';

export interface UseTeamReturn {
  teams: Team[];
  unassignedWorkers: UnassignedWorker[];
  filters: TeamFilters;
  pagination: TeamPagination;
  isLoading: boolean;
  setFilters: (filters: TeamFilters) => void;
  setPage: (page: number) => void;
  setPageSize: (size: number) => void;
  createTeam: (data: Partial<Team>) => void;
  updateTeam: (id: string, data: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  assignWorkers: (teamId: string, workerIds: string[], operatorId: string, operatorName: string, role?: string) => void;
  removeWorker: (teamId: string, workerId: string) => void;
  getTeamById: (id: string) => Team | undefined;
  filteredTeams: Team[];
}

/**
 * 班组分配管理Hook
 * 数据源：useTeamManageStore (Zustand store, mock种子数据 + localStorage持久化)
 */
export function useTeam(): UseTeamReturn {
  const {
    teams: storeTeams,
    unassignedWorkers: storeUnassigned,
    isLoading,
    fetchData,
    createTeam: storeCreate,
    updateTeam: storeUpdate,
    deleteTeam: storeDelete,
    assignWorkers: storeAssign,
    removeWorker: storeRemove,
  } = useTeamManageStore();

  const [filters, setFiltersState] = useState<TeamFilters>({ name: '', leaderName: '', workZone: '' });
  const [pagination, setPagination] = useState<TeamPagination>({
    currentPage: 1,
    pageSize: 10,
    total: storeTeams.length,
  });

  // 拉取数据（2026-09-17 修复：每次 mount 都触发 fetchData，不再依赖长度判断）
  // 之前 length === 0 判断在硬刷新页面后不可靠（store state 时序问题），导致 fetchData 不触发
  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // 过滤后的班组
  const filteredTeams = useMemo(() => {
    return storeTeams.filter((team) => {
      if (filters.name && !team.name.toLowerCase().includes(filters.name.toLowerCase())) {
        return false;
      }
      if (filters.leaderName && !team.leaderName.toLowerCase().includes(filters.leaderName.toLowerCase())) {
        return false;
      }
      if (filters.workZone && !team.workZone?.toLowerCase().includes(filters.workZone.toLowerCase())) {
        return false;
      }
      return true;
    });
  }, [storeTeams, filters]);

  // 分页数据
  // 2026-09-17 修复：页码越界保护——筛选/删除后若当前页超出总页数，此前会渲染空列表
  const paginatedTeams = useMemo(() => {
    const totalPages = Math.max(1, Math.ceil(filteredTeams.length / pagination.pageSize));
    const safePage = Math.min(pagination.currentPage, totalPages);
    const start = (safePage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredTeams.slice(start, end);
  }, [filteredTeams, pagination]);

  // 2026-09-17 修复：筛选条件变化时重置到第 1 页，否则在第 2 页筛选会显示空列表
  const setFilters = useCallback((next: TeamFilters) => {
    setFiltersState(next);
    setPagination((prev) => ({ ...prev, currentPage: 1 }));
  }, []);

  const setPage = useCallback((page: number) => {
    setPagination((prev) => ({ ...prev, currentPage: page }));
  }, []);

  const setPageSize = useCallback((size: number) => {
    setPagination((prev) => ({ ...prev, pageSize: size, currentPage: 1 }));
  }, []);

  // 创建班组
  const createTeam = useCallback((data: Partial<Team>) => {
    storeCreate(data);
  }, [storeCreate]);

  // 更新班组
  const updateTeam = useCallback((id: string, data: Partial<Team>) => {
    storeUpdate(id, data);
  }, [storeUpdate]);

  // 删除班组
  const deleteTeam = useCallback((id: string) => {
    storeDelete(id);
  }, [storeDelete]);

  // 分配工人到班组（2026-09-17：补传 role，此前角色选择在下拉链路中被丢弃）
  const assignWorkers = useCallback(
    (teamId: string, workerIds: string[], operatorId: string, operatorName: string, role = 'member') => {
      storeAssign(teamId, workerIds, operatorId, operatorName, role);
    },
    [storeAssign]
  );

  // 从班组移除工人
  const removeWorker = useCallback(
    (teamId: string, workerId: string) => {
      storeRemove(teamId, workerId);
    },
    [storeRemove]
  );

  // 根据ID获取班组
  const getTeamById = useCallback(
    (id: string) => {
      return storeTeams.find((team) => team.id === id);
    },
    [storeTeams]
  );

  return {
    teams: paginatedTeams,
    unassignedWorkers: storeUnassigned,
    filters,
    isLoading,
    pagination: { ...pagination, total: filteredTeams.length },
    setFilters,
    setPage,
    setPageSize,
    createTeam,
    updateTeam,
    deleteTeam,
    assignWorkers,
    removeWorker,
    getTeamById,
    filteredTeams,
  };
}
