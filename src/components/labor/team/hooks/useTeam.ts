import { useState, useCallback, useMemo, useEffect } from 'react';
import type { Team, TeamAssignment, TeamFilters, TeamPagination, UnassignedWorker } from '../types';
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
  assignWorkers: (teamId: string, workerIds: string[], operatorId: string, operatorName: string) => void;
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

  const [filters, setFilters] = useState<TeamFilters>({ name: '', leaderName: '', workZone: '' });
  const [pagination, setPagination] = useState<TeamPagination>({
    currentPage: 1,
    pageSize: 10,
    total: storeTeams.length,
  });

  // 初次加载时初始化种子数据
  useEffect(() => {
    if (storeTeams.length === 0 && storeUnassigned.length === 0) {
      fetchData();
    }
  }, []);

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
  const paginatedTeams = useMemo(() => {
    const start = (pagination.currentPage - 1) * pagination.pageSize;
    const end = start + pagination.pageSize;
    return filteredTeams.slice(start, end);
  }, [filteredTeams, pagination]);

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

  // 分配工人到班组
  const assignWorkers = useCallback(
    (teamId: string, workerIds: string[], operatorId: string, operatorName: string) => {
      storeAssign(teamId, workerIds, operatorId, operatorName);
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
