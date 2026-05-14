/**
 * 班组分配管理 Zustand Store
 *
 * 架构：纯本地 mock 种子数据 + localStorage 持久化
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 后端无独立 team assignment API，使用 mock 种子数据
 * 注意：已有 useTeamStore 用于基础班组数据（API），这是班组分配管理
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== 类型定义（与 team/types.ts 保持一致）==========

export interface Team {
  id: string;
  name: string;
  leaderId: string;
  leaderName: string;
  memberIds: string[];
  memberCount: number;
  description?: string;
  workZone?: string;
  createdAt: string;
  updatedAt: string;
}

export interface UnassignedWorker {
  id: string;
  name: string;
  phone: string;
  skillTags: string[];
  workerType: string;
}

// ========== 种子数据 ==========

function generateTeams(): Team[] {
  return [
    {
      id: 'team001', name: '收割组A', leaderId: 'w001', leaderName: '张三',
      memberIds: ['w002', 'w003', 'w004'], memberCount: 3,
      description: '负责番茄采收', workZone: '东区',
      createdAt: '2026-01-01', updatedAt: '2026-03-15',
    },
    {
      id: 'team002', name: '灌溉组B', leaderId: 'w005', leaderName: '李四',
      memberIds: ['w006', 'w007'], memberCount: 2,
      description: '负责灌溉系统操作', workZone: '西区',
      createdAt: '2026-01-01', updatedAt: '2026-03-10',
    },
    {
      id: 'team003', name: '运输组C', leaderId: 'w008', leaderName: '王五',
      memberIds: ['w009', 'w010', 'w011', 'w012'], memberCount: 4,
      description: '负责农产品运输', workZone: '全场区',
      createdAt: '2026-02-01', updatedAt: '2026-03-18',
    },
  ];
}

function generateUnassignedWorkers(): UnassignedWorker[] {
  return [
    { id: 'uw001', name: '赵六', phone: '13900139001', skillTags: ['果蔬采收', '分级包装'], workerType: '临时工' },
    { id: 'uw002', name: '钱七', phone: '13900139002', skillTags: ['微喷灌溉', '滴灌操作'], workerType: '临时工' },
    { id: 'uw003', name: '孙八', phone: '13900139003', skillTags: ['拖拉机', '旋耕机'], workerType: '临时工' },
  ];
}

// ========== Store 类型 ==========

interface TeamManageState {
  teams: Team[];
  unassignedWorkers: UnassignedWorker[];
  isLoading: boolean;
  error: string | null;

  fetchData: () => Promise<void>;

  createTeam: (data: Partial<Team>) => void;
  updateTeam: (id: string, data: Partial<Team>) => void;
  deleteTeam: (id: string) => void;
  assignWorkers: (teamId: string, workerIds: string[]) => void;
  removeWorker: (teamId: string, workerId: string) => void;

  _initSeedData: () => void;
}

// ========== Store 实现 ==========

export const useTeamManageStore = create<TeamManageState>()(
  persist(
    (set, get) => ({
      teams: [],
      unassignedWorkers: [],
      isLoading: false,
      error: null,

      fetchData: async () => {
        set({ isLoading: true, error: null });
        try {
          const current = get().teams;
          if (current.length === 0) {
            get()._initSeedData();
          }
          set({ isLoading: false });
        } catch (error) {
          console.warn('[TeamManageStore] 获取班组数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createTeam: (data) => {
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
        set((state) => ({ teams: [newTeam, ...state.teams] }));
      },

      updateTeam: (id, data) => {
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString().split('T')[0] }
              : t
          ),
        }));
      },

      deleteTeam: (id) => {
        set((state) => ({ teams: state.teams.filter((t) => t.id !== id) }));
      },

      assignWorkers: (teamId, workerIds) => {
        set((state) => {
          const team = state.teams.find((t) => t.id === teamId);
          if (!team) return state;

          const updatedMemberIds = [...new Set([...team.memberIds, ...workerIds])];
          return {
            teams: state.teams.map((t) =>
              t.id === teamId
                ? { ...t, memberIds: updatedMemberIds, memberCount: updatedMemberIds.length, updatedAt: new Date().toISOString().split('T')[0] }
                : t
            ),
            unassignedWorkers: state.unassignedWorkers.filter((w) => !workerIds.includes(w.id)),
          };
        });
      },

      removeWorker: (teamId, workerId) => {
        set((state) => {
          const team = state.teams.find((t) => t.id === teamId);
          if (!team) return state;

          const updatedMemberIds = team.memberIds.filter((id) => id !== workerId);
          return {
            teams: state.teams.map((t) =>
              t.id === teamId
                ? { ...t, memberIds: updatedMemberIds, memberCount: updatedMemberIds.length, updatedAt: new Date().toISOString().split('T')[0] }
                : t
            ),
          };
        });
      },

      _initSeedData: () => {
        const teams = generateTeams();
        const unassigned = generateUnassignedWorkers();
        set({ teams, unassignedWorkers: unassigned, isLoading: false });
        console.log('[TeamManageStore] 已初始化种子数据:', teams.length, '个班组,', unassigned.length, '个待分配工人');
      },
    }),
    {
      name: 'team-manage-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        teams: state.teams,
        unassignedWorkers: state.unassignedWorkers,
      }),
    }
  )
);
