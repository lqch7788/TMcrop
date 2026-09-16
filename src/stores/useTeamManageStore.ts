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
  // 2026-09-15：班组分配完整性 Phase 2 字段（来自 teams.capability_tags 等）
  capabilityTags?: string[];
  dailyCapacityHours?: number;
  weeklyCapacityHours?: number;
  coverageRadiusKm?: number;
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

// 2026-09-15：班组分配完整性 - 新增类型
export interface TeamZoneAssignment {
  id: string;
  team_id: string;
  zone_id: string;
  role: 'primary' | 'allowed';
  created_at: string;
}

export interface TeamTaskCapability {
  id: string;
  team_id: string;
  task_type: string;
  created_at: string;
}

export interface TeamMemberChange {
  id: string;
  team_id: string;
  worker_id: string;
  change_type: 'add' | 'remove' | 'role_change' | 'become_primary';
  old_value: string | null;
  new_value: string | null;
  operator_id: string | null;
  operator_name: string | null;
  reason: string | null;
  created_at: string;
}

export interface TeamDailyAvailability {
  id: string;
  team_id: string;
  date: string;
  available_hours: number;
  busy_hours: number;
  on_leave_count: number;
  scheduled_worker_count: number;
  total_worker_count: number;
  updated_at: string;
}

export interface WorkerTeamAssignment {
  id: string;
  worker_id: string;
  team_id: string;
  role: string;
  is_primary: number;
  percentage: number;
  joined_at: string;
  left_at: string | null;
  created_at: string;
}

/**
 * 后端班组记录 → 前端 Team 映射
 * workZone 使用后端 departmentName（班组所属部门作为作业区域展示）
 * 2026-09-15：加 capability_tags / daily_capacity_hours / weekly_capacity_hours / coverage_radius_km 字段映射
 */
function mapApiTeam(api: ApiTeam & {
  capability_tags?: string | null;
  daily_capacity_hours?: number | null;
  weekly_capacity_hours?: number | null;
  coverage_radius_km?: number | null;
}): Team {
  let capabilityTags: string[] | undefined;
  if (api.capability_tags) {
    try {
      const parsed = JSON.parse(api.capability_tags);
      if (Array.isArray(parsed)) capabilityTags = parsed as string[];
    } catch { /* ignore parse error */ }
  }
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
    capabilityTags,
    dailyCapacityHours: api.daily_capacity_hours ?? 8,
    weeklyCapacityHours: api.weekly_capacity_hours ?? 40,
    coverageRadiusKm: api.coverage_radius_km ?? 0,
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

  // 2026-09-15：班组分配完整性 Phase 3 - 新增 actions
  // #1 作业区域
  fetchZones: (teamId: string) => Promise<TeamZoneAssignment[]>;
  addZone: (teamId: string, zoneId: string, role?: 'primary' | 'allowed') => Promise<void>;
  removeZone: (teamId: string, zoneId: string, role: string) => Promise<void>;
  // 2026-09-16：全量同步作业区域（先删旧再加新，简化编辑交互）
  syncTeamZones: (teamId: string, zoneIds: string[]) => Promise<void>;
  // #3 任务类型能力
  fetchCapabilities: (teamId: string) => Promise<TeamTaskCapability[]>;
  addCapability: (teamId: string, taskType: string) => Promise<void>;
  // 2026-09-16：全量同步任务能力（与 syncTeamZones 对称）
  syncTeamCapabilities: (teamId: string, taskTypes: string[]) => Promise<void>;
  removeCapability: (teamId: string, taskType: string) => Promise<void>;
  // #7 变更历史
  fetchMemberChanges: (teamId: string, limit?: number) => Promise<TeamMemberChange[]>;
  // #8 可用性
  fetchAvailability: (teamId: string, date: string) => Promise<TeamDailyAvailability | null>;
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
          // 2026-09-15：响应字段是 workerId（camelCaseResponse 中间件转换），不是 worker_id
          memberIds: membersList[i].map((m) => m.workerId),
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

    // ============ 2026-09-15：班组分配完整性 Phase 3 新增 actions ============

    /** #1 获取班组作业区域 */
    fetchZones: async (teamId) => {
      try {
        const data = await enhancedApiClient.get<Array<{
          id: string; teamId: string; zoneId: string; role: string; createdAt: string;
        }>>(`/teams/${teamId}/zones`);
        return (data || []).map((z) => ({
          id: z.id,
          team_id: z.teamId,
          zone_id: z.zoneId,
          role: (z.role === 'primary' ? 'primary' : 'allowed') as 'primary' | 'allowed',
          created_at: z.createdAt,
        }));
      } catch (error) {
        console.error('[fetchZones] 失败:', error);
        return [];
      }
    },

    /** #1 添加作业区域 */
    addZone: async (teamId, zoneId, role = 'allowed') => {
      try {
        await enhancedApiClient.post(`/teams/${teamId}/zones`, { zoneId, role });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '添加作业区域失败' });
        throw error;
      }
    },

    /** #1 移除作业区域 */
    removeZone: async (teamId, zoneId, role) => {
      try {
        await enhancedApiClient.delete(`/teams/${teamId}/zones/${zoneId}?role=${role}`);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '移除作业区域失败' });
        throw error;
      }
    },

    /** 2026-09-16：全量同步作业区域（删除旧 + 添加新，简化编辑交互） */
    syncTeamZones: async (teamId, zoneIds) => {
      try {
        // 先删旧
        const existing = await enhancedApiClient.get<Array<{ zoneId: string; role: string }>>(`/teams/${teamId}/zones`);
        for (const z of existing || []) {
          await enhancedApiClient.delete(`/teams/${teamId}/zones/${z.zoneId}?role=${z.role}`);
        }
        // 再加新
        for (const zid of zoneIds) {
          await enhancedApiClient.post(`/teams/${teamId}/zones`, { zoneId: zid, role: 'allowed' });
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '同步作业区域失败' });
        throw error;
      }
    },

    /** 2026-09-16：全量同步任务能力（先删旧再加新） */
    syncTeamCapabilities: async (teamId, taskTypes) => {
      try {
        const existing = await enhancedApiClient.get<Array<{ taskType: string }>>(`/teams/${teamId}/capabilities`);
        for (const c of existing || []) {
          await enhancedApiClient.delete(`/teams/${teamId}/capabilities/${c.taskType}`);
        }
        for (const t of taskTypes) {
          await enhancedApiClient.post(`/teams/${teamId}/capabilities`, { taskType: t });
        }
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '同步任务能力失败' });
        throw error;
      }
    },

    /** #3 获取班组任务能力 */
    fetchCapabilities: async (teamId) => {
      try {
        const data = await enhancedApiClient.get<Array<{
          id: string; teamId: string; taskType: string; createdAt: string;
        }>>(`/teams/${teamId}/capabilities`);
        return (data || []).map((c) => ({
          id: c.id,
          team_id: c.teamId,
          task_type: c.taskType,
          created_at: c.createdAt,
        }));
      } catch (error) {
        console.error('[fetchCapabilities] 失败:', error);
        return [];
      }
    },

    /** #3 添加任务能力 */
    addCapability: async (teamId, taskType) => {
      try {
        await enhancedApiClient.post(`/teams/${teamId}/capabilities`, { taskType });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '添加任务能力失败' });
        throw error;
      }
    },

    /** #3 移除任务能力 */
    removeCapability: async (teamId, taskType) => {
      try {
        await enhancedApiClient.delete(`/teams/${teamId}/capabilities/${taskType}`);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '移除任务能力失败' });
        throw error;
      }
    },

    /** #7 获取班组成员变更历史 */
    fetchMemberChanges: async (teamId, limit = 50) => {
      try {
        const data = await enhancedApiClient.get<Array<{
          id: string; teamId: string; workerId: string; changeType: string;
          oldValue: string | null; newValue: string | null;
          operatorId: string | null; operatorName: string | null;
          reason: string | null; createdAt: string;
        }>>(`/teams/${teamId}/member-changes?limit=${limit}`);
        return (data || []).map((c) => ({
          id: c.id,
          team_id: c.teamId,
          worker_id: c.workerId,
          change_type: c.changeType as TeamMemberChange['change_type'],
          old_value: c.oldValue,
          new_value: c.newValue,
          operator_id: c.operatorId,
          operator_name: c.operatorName,
          reason: c.reason,
          created_at: c.createdAt,
        }));
      } catch (error) {
        console.error('[fetchMemberChanges] 失败:', error);
        return [];
      }
    },

    /** #8 获取班组某天可用性 */
    fetchAvailability: async (teamId, date) => {
      try {
        // 2026-09-16：兜底兼容 camelCase + snake_case（防御字段命名不一致）
        const data = await enhancedApiClient.get<Record<string, any> | null>(
          `/teams/${teamId}/availability?date=${date}`,
        );
        if (!data) return null;
        const pick = (a: any, b: any) => a ?? b; // 优先 camelCase，缺失回退 snake_case
        return {
          id: data.id,
          team_id: pick(data.teamId, data.team_id),
          date: data.date,
          available_hours: pick(data.availableHours, data.available_hours) ?? 0,
          busy_hours: pick(data.busyHours, data.busy_hours) ?? 0,
          on_leave_count: pick(data.onLeaveCount, data.on_leave_count) ?? 0,
          scheduled_worker_count: pick(data.scheduledWorkerCount, data.scheduled_worker_count) ?? 0,
          total_worker_count: pick(data.totalWorkerCount, data.total_worker_count) ?? 0,
          updated_at: pick(data.updatedAt, data.updated_at),
        };
      } catch (error) {
        console.error('[fetchAvailability] 失败:', error);
        return null;
      }
    },
  })
);
