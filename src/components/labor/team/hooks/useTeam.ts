import { useState, useCallback, useMemo } from 'react';
import type { Team, TeamAssignment, TeamFilters, TeamPagination, UnassignedWorker } from '../types';

// 模拟班组数据
const mockTeams: Team[] = [
  {
    id: 'team001',
    name: '收割组A',
    leaderId: 'w001',
    leaderName: '张三',
    memberIds: ['w002', 'w003', 'w004'],
    memberCount: 3,
    description: '负责番茄采收',
    workZone: '东区',
    createdAt: '2026-01-01',
    updatedAt: '2026-03-15',
  },
  {
    id: 'team002',
    name: '灌溉组B',
    leaderId: 'w005',
    leaderName: '李四',
    memberIds: ['w006', 'w007'],
    memberCount: 2,
    description: '负责灌溉系统操作',
    workZone: '西区',
    createdAt: '2026-01-01',
    updatedAt: '2026-03-10',
  },
  {
    id: 'team003',
    name: '运输组C',
    leaderId: 'w008',
    leaderName: '王五',
    memberIds: ['w009', 'w010', 'w011', 'w012'],
    memberCount: 4,
    description: '负责农产品运输',
    workZone: '全场区',
    createdAt: '2026-02-01',
    updatedAt: '2026-03-18',
  },
];

// 模拟未分配工人
const mockUnassignedWorkers: UnassignedWorker[] = [
  { id: 'uw001', name: '赵六', phone: '13900139001', skillTags: ['果蔬采收', '分级包装'], workerType: '临时工' },
  { id: 'uw002', name: '钱七', phone: '13900139002', skillTags: ['微喷灌溉', '滴灌操作'], workerType: '临时工' },
  { id: 'uw003', name: '孙八', phone: '13900139003', skillTags: ['拖拉机', '旋耕机'], workerType: '临时工' },
];

export interface UseTeamReturn {
  teams: Team[];
  unassignedWorkers: UnassignedWorker[];
  filters: TeamFilters;
  pagination: TeamPagination;
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

export function useTeam(): UseTeamReturn {
  const [filters, setFilters] = useState<TeamFilters>({ keyword: '' });
  const [pagination, setPagination] = useState<TeamPagination>({
    currentPage: 1,
    pageSize: 10,
    total: mockTeams.length,
  });
  const [teams, setTeams] = useState<Team[]>(mockTeams);
  const [unassignedWorkers, setUnassignedWorkers] = useState<UnassignedWorker[]>(mockUnassignedWorkers);

  // 过滤后的班组
  const filteredTeams = useMemo(() => {
    return teams.filter((team) => {
      if (filters.keyword) {
        const keyword = filters.keyword.toLowerCase();
        return (
          team.name.toLowerCase().includes(keyword) ||
          team.leaderName.toLowerCase().includes(keyword) ||
          team.workZone?.toLowerCase().includes(keyword)
        );
      }
      return true;
    });
  }, [teams, filters.keyword]);

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
    const newTeam: Team = {
      id: `team${Date.now()}`,
      name: data.name || '',
      leaderId: data.leaderId || '',
      leaderName: data.leaderName || '',
      memberIds: [],
      memberCount: 0,
      description: data.description,
      workZone: data.workZone,
      createdAt: new Date().toISOString().split('T')[0],
      updatedAt: new Date().toISOString().split('T')[0],
    };
    setTeams((prev) => [newTeam, ...prev]);
  }, []);

  // 更新班组
  const updateTeam = useCallback((id: string, data: Partial<Team>) => {
    setTeams((prev) =>
      prev.map((team) =>
        team.id === id ? { ...team, ...data, updatedAt: new Date().toISOString().split('T')[0] } : team
      )
    );
  }, []);

  // 删除班组
  const deleteTeam = useCallback((id: string) => {
    setTeams((prev) => prev.filter((team) => team.id !== id));
  }, []);

  // 分配工人到班组
  const assignWorkers = useCallback(
    (teamId: string, workerIds: string[], operatorId: string, operatorName: string) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;

      // 更新班组
      const updatedMemberIds = [...new Set([...team.memberIds, ...workerIds])];
      updateTeam(teamId, { memberIds: updatedMemberIds, memberCount: updatedMemberIds.length });

      // 从未分配列表移除
      setUnassignedWorkers((prev) => prev.filter((w) => !workerIds.includes(w.id)));
    },
    [teams, updateTeam]
  );

  // 从班组移除工人
  const removeWorker = useCallback(
    (teamId: string, workerId: string) => {
      const team = teams.find((t) => t.id === teamId);
      if (!team) return;

      const updatedMemberIds = team.memberIds.filter((id) => id !== workerId);
      updateTeam(teamId, { memberIds: updatedMemberIds, memberCount: updatedMemberIds.length });

      // 添加回未分配列表（这里简化处理，实际应该获取工人详情）
      // 实际应用中应该通过API获取完整的工人信息
    },
    [teams, updateTeam]
  );

  // 根据ID获取班组
  const getTeamById = useCallback(
    (id: string) => {
      return teams.find((team) => team.id === id);
    },
    [teams]
  );

  return {
    teams: paginatedTeams,
    unassignedWorkers,
    filters,
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
