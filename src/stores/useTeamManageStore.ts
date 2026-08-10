/**
 * 班组分配管理 Zustand Store
 *
 * 架构：API 直连（V2.1 铁律：无缓存、无 mock 降级）
 * 数据流：Store → enhancedApiClient → Backend API → SQLite DB
 * 数据源：
 *   - /basic-data/teams：班组 CRUD（apiBasicDataService）
 *   - /team-members/teams/:teamId/members：班组成员增删
 *   - useWorkerStore：全部在职工人（未分配工人 = 在职工人 - 已入组工人）
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import {
  getTeams,
  createTeam as apiCreateTeam,
  updateTeam as apiUpdateTeam,
  deleteTeam as apiDeleteTeam,
  type Team as ApiTeam,
} from '../services/apiBasicDataService';
import { useWorkerStore } from './useWorkerStore';

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

// 后端班组成员记录字段（snake_case，teamMembers 路由未做 camelCase 转换）
interface ApiTeamMember {
  id: string;
  team_id: string;
  worker_id: string;
  worker_name: string;
  worker_code: string;
  role: string;
  joined_at: string;
  created_at: string;
  updated_at: string;
}

/**
 * 后端班组记录 → 前端 Team 映射
 * workZone 使用后端 departmentName（班组所属部门作为作业区域展示）
 */
function mapApiTeam(api: ApiTeam): Team {
  return {
    id: api.id,
    name: api.teamName,
    leaderId: api.leaderId || '',
    leaderName: api.leaderName || '',
    memberIds: [],
    memberCount: api.memberCount ?? 0,
    description: api.description,
    workZone: api.departmentName,
    createdAt: api.createdAt ?? '',
    updatedAt: api.createdAt ?? '',
  };
}

/**
 * 根据工人ID获取工人姓名
 * 数据源：useWorkerStore（真实员工数据），不再使用硬编码映射
 */
export function getWorkerName(workerId: string): string {
  const workers = useWorkerStore.getState().workers;
  return workers.find((w) => w.id === workerId)?.name || '未知';
}

// ========== Store 类型 ==========

interface TeamManageState {
  teams: Team[];
  unassignedWorkers: UnassignedWorker[];
  isLoading: boolean;
  error: string | null;

  fetchData: () => Promise<void>;
  createTeam: (data: Partial<Team>) => Promise<void>;
  updateTeam: (id: string, data: Partial<Team>) => Promise<void>;
  deleteTeam: (id: string) => Promise<void>;
  assignWorkers: (teamId: string, workerIds: string[], operatorId: string, operatorName: string) => Promise<void>;
  removeWorker: (teamId: string, workerId: string) => Promise<void>;
}

// ========== Store 实现 ==========

export const useTeamManageStore = create<TeamManageState>()(
  (set) => ({
    teams: [],
    unassignedWorkers: [],
    isLoading: false,
    error: null,

    /**
     * 拉取班组列表 + 各队成员 + 未分配工人
     * 失败时显式设置 error（Fail Loud：禁止静默降级）
     */
    fetchData: async () => {
      set({ isLoading: true, error: null });
      try {
        // 1. 确保工人列表已加载（未分配工人的数据源）
        await useWorkerStore.getState().loadWorkers();
        // 2. 拉取真实班组列表
        const apiTeams = await getTeams();
        // 3. 并行拉取每队成员，构建已分配工人集合
        const membersList = await Promise.all(
          apiTeams.map((t) =>
            enhancedApiClient
              .get<ApiTeamMember[]>(`/team-members/teams/${t.id}/members`)
              .then((members) => members || [])
          )
        );
        const teams: Team[] = apiTeams.map((t, i) => ({
          ...mapApiTeam(t),
          memberIds: membersList[i].map((m) => m.worker_id),
        }));
        const assignedSet = new Set(teams.flatMap((t) => t.memberIds));
        // 4. 未分配工人 = 全部在职工人 - 已入组工人
        const workers = useWorkerStore.getState().workers;
        const unassignedWorkers: UnassignedWorker[] = workers
          .filter((w) => !assignedSet.has(w.id))
          .map((w) => ({
            id: w.id,
            name: w.name,
            phone: w.phone,
            skillTags: w.skillTags || [],
            workerType: w.position,
          }));
        set({ teams, unassignedWorkers, isLoading: false });
      } catch (error) {
        set({
          error: error instanceof Error ? error.message : '加载班组数据失败',
          isLoading: false,
        });
      }
    },

    /**
     * 创建班组（后端必填 teamName + teamCode，teamCode 自动生成）
     * API 成功后将后端返回的完整记录插入本地状态
     */
    createTeam: async (data) => {
      try {
        const apiTeam = await apiCreateTeam({
          teamName: data.name || '',
          teamCode: `TM${Date.now()}`,
          // 前端表单只填负责人姓名，不提供真实 leaderId，'new' 为占位值需过滤
          ...(data.leaderId && data.leaderId !== 'new' ? { leaderId: data.leaderId } : {}),
          leaderName: data.leaderName,
          description: data.description,
        });
        set((state) => ({ teams: [mapApiTeam(apiTeam), ...state.teams] }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '创建班组失败' });
      }
    },

    /**
     * 更新班组（API 成功后才更新本地状态）
     */
    updateTeam: async (id, data) => {
      try {
        await apiUpdateTeam(id, {
          teamName: data.name,
          leaderId: data.leaderId,
          leaderName: data.leaderName,
          description: data.description,
        });
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString().split('T')[0] }
              : t
          ),
        }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '更新班组失败' });
      }
    },

    /**
     * 删除班组（后端软删除 status=inactive）
     */
    deleteTeam: async (id) => {
      try {
        await apiDeleteTeam(id);
        set((state) => ({ teams: state.teams.filter((t) => t.id !== id) }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '删除班组失败' });
      }
    },

    /**
     * 批量分配工人到班组
     * 仅 API 成功后更新本地状态（禁止"无论成败都乐观更新"的静默失败）
     */
    assignWorkers: async (teamId, workerIds, operatorId, operatorName) => {
      try {
        await enhancedApiClient.post(`/team-members/teams/${teamId}/members/batch`, {
          workerIds,
          operatorId,
          operatorName,
        });
        set((state) => {
          const team = state.teams.find((t) => t.id === teamId);
          if (!team) return state;
          const updatedMemberIds = [...new Set([...team.memberIds, ...workerIds])];
          return {
            teams: state.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    memberIds: updatedMemberIds,
                    memberCount: updatedMemberIds.length,
                    updatedAt: new Date().toISOString().split('T')[0],
                  }
                : t
            ),
            unassignedWorkers: state.unassignedWorkers.filter((w) => !workerIds.includes(w.id)),
          };
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '分配工人失败' });
      }
    },

    /**
     * 移除班组成员
     * API 成功后从成员列表移除，并将该工人加回未分配列表
     */
    removeWorker: async (teamId, workerId) => {
      try {
        await enhancedApiClient.delete(`/team-members/teams/${teamId}/members/${workerId}`);
        set((state) => {
          const team = state.teams.find((t) => t.id === teamId);
          if (!team) return state;
          const updatedMemberIds = team.memberIds.filter((id) => id !== workerId);
          // 从工人全量列表找回被移除的工人信息，补回未分配列表
          const worker = useWorkerStore.getState().workers.find((w) => w.id === workerId);
          const restored: UnassignedWorker | null = worker
            ? {
                id: worker.id,
                name: worker.name,
                phone: worker.phone,
                skillTags: worker.skillTags || [],
                workerType: worker.position,
              }
            : null;
          return {
            teams: state.teams.map((t) =>
              t.id === teamId
                ? {
                    ...t,
                    memberIds: updatedMemberIds,
                    memberCount: updatedMemberIds.length,
                    updatedAt: new Date().toISOString().split('T')[0],
                  }
                : t
            ),
            unassignedWorkers:
              restored && !state.unassignedWorkers.some((w) => w.id === workerId)
                ? [...state.unassignedWorkers, restored]
                : state.unassignedWorkers,
          };
        });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '移除班组成员失败' });
      }
    },
  })
);
