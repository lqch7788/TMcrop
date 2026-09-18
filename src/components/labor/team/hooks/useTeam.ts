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
  // 2026-09-18 修复：类型签名改回真正的 Promise，审计 C-10/C-11
  // 此前误写为同步返回（=> void），导致 await 拿到 undefined，新建班组的 teamId 永远为空
  createTeam: (data: Partial<Team>) => Promise<Team | undefined>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  // 2026-09-18 修复：role 改为 Record（每人独立角色），审计 C-9 批量角色被丢弃
  assignWorkers: (teamId: string, workerIds: string[], operatorId: string, operatorName: string, workerRoles?: Record<string, string>) => Promise<void>;
  removeWorker: (teamId: string, workerId: string) => Promise<void>;
  getTeamById: (id: string) => Team | undefined;
  filteredTeams: Team[];
}

/**
 * 班组分配管理Hook
 * 数据源：useTeamManageStore (Zustand store, mock种子数据 + localStorage持久化)
 *
 * 2026-09-18 修复 H-10：之前用 useTeamManageStore() 无 selector 全字段订阅，
 * 任何字段（isLoading/error/lastFetch 等）变化触发整个 738 行的 TeamTable 重渲染。
 * 改用 selector 订阅，store 中无关字段变化时此 hook 返回值引用稳定，子组件 re-render 抑制。
 */
export function useTeam(): UseTeamReturn {
  const storeTeams = useTeamManageStore((s) => s.teams);
  const storeUnassigned = useTeamManageStore((s) => s.unassignedWorkers);
  const isLoading = useTeamManageStore((s) => s.isLoading);
  const fetchData = useTeamManageStore((s) => s.fetchData);
  // 2026-09-18 修复 C-10：createTeam / updateTeam 现在真正返回 Promise，不能再用 useCallback 包一层吞掉
  const storeCreate = useTeamManageStore((s) => s.createTeam);
  const storeUpdate = useTeamManageStore((s) => s.updateTeam);
  const storeDelete = useTeamManageStore((s) => s.deleteTeam);
  const storeAssign = useTeamManageStore((s) => s.assignWorkers);
  const storeRemove = useTeamManageStore((s) => s.removeWorker);

  const [filters, setFiltersState] = useState<TeamFilters>({ name: '', leaderName: '' });
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

  // 2026-09-18 修复：直接返回 store 的 Promise（不要 useCallback 包一层吞掉，
  // 这是 C-10 根因——await createTeam(...) 拿到 undefined → teamId 空字符串 → 跳过技能同步）
  const createTeam = storeCreate;
  const updateTeam = storeUpdate;
  const deleteTeam = storeDelete;
  const assignWorkers = storeAssign;
  const removeWorker = storeRemove;

  // 根据ID获取班组
  const getTeamById = useCallback(
    (id: string) => {
      return storeTeams.find((team) => team.id === id);
    },
    [storeTeams]
  );

  // 2026-09-18 修复 H-14：useMemo 稳定引用，React.memo 子组件的 prop 比较才能生效
  return useMemo(() => ({
    teams: paginatedTeams,
    unassignedWorkers: storeUnassigned,
    filters,
    isLoading,
    // 2026-09-18 修复 L-3：pagination 不再每次返回新对象（total 直接从 filteredTeams 派生）
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
  }), [
    paginatedTeams, storeUnassigned, filters, isLoading, pagination,
    setFilters, setPage, setPageSize,
    createTeam, updateTeam, deleteTeam, assignWorkers, removeWorker, getTeamById,
    filteredTeams,
  ]);
}
