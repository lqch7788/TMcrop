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
  // 2026-09-17：成员姓名列表（与 memberIds 同源，表格"成员"列展示用）
  memberNames?: string[];
  description?: string;
  workZone?: string;
  // 2026-09-17：作业区域统一用关联表（team_zone_assignments）。
  // zoneIds 为关联的区域 id，zoneNames 为对应名称（表格列展示用）。
  zoneIds?: string[];
  zoneNames?: string[];
  createdAt: string;
  updatedAt: string;
  // 2026-09-15：班组分配完整性 Phase 2 字段（来自 teams.capability_tags 等）
  capabilityTags?: string[];
  // 2026-09-17：技能标签统一用 team_task_capabilities 表（与下游派工消费的数据源一致）
  taskCapabilities?: string[];
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
 * 2026-09-17 修复：GET /basic-data/teams 响应是 camelCase（路由内已转驼峰 + 解析 JSON），
 * 此前按 snake_case 读取（capability_tags 等）全部取到 undefined，走默认值兜底，
 * 导致技能标签 / 日产能 / 周产能 / 作业半径 编辑保存后刷新显示为空或默认值（看起来像丢失）。
 */
function mapApiTeam(api: ApiTeam & {
  capability_tags?: string | null;
  daily_capacity_hours?: number | null;
  weekly_capacity_hours?: number | null;
  coverage_radius_km?: number | null;
}): Team {
  // 兼容 camelCase（当前后端）与 snake_case（旧字段名）
  const rawTags = api.capabilityTags ?? api.capability_tags;
  let capabilityTags: string[] | undefined;
  if (Array.isArray(rawTags)) {
    capabilityTags = rawTags;
  } else if (typeof rawTags === 'string' && rawTags) {
    try {
      const parsed = JSON.parse(rawTags);
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
    // 2026-09-17 修复：workZone 优先读 teams.work_zone 列（用户编辑保存的值），
    // 老数据该列为 null 时兜底用部门名（历史兼容）。之前直接用 departmentName，
    // 导致「编辑作业区域 → 保存 → 刷新」后显示旧部门名，看起来像数据丢失。
    workZone: api.workZone ?? api.departmentName ?? '',
    createdAt: api.createdAt ?? '',
    updatedAt: api.updatedAt ?? api.createdAt ?? '',
    capabilityTags,
    dailyCapacityHours: api.dailyCapacityHours ?? api.daily_capacity_hours ?? 8,
    weeklyCapacityHours: api.weeklyCapacityHours ?? api.weekly_capacity_hours ?? 40,
    coverageRadiusKm: api.coverageRadiusKm ?? api.coverage_radius_km ?? 0,
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
  assignWorkers: (teamId: string, workerIds: string[], operatorId: string, operatorName: string, role?: string) => Promise<void>;
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
  // 2026-09-17 修复：必须解构 get —— createTeam/updateTeam 末尾的 `await get().fetchData()`
  // 此前引用未定义的 get，抛 ReferenceError 被 catch 吞掉（只写 state.error 无人展示），
  // 导致"保存后主动 re-fetch 同步列表"从未真正执行，且错误提示上线后暴露为"get is not defined"
  (set, get) => ({
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
        // 3. 并行拉取每队成员 + 任务能力
        //   （2026-09-17：作业区域界面已下线，不再加载 zone 关联——数据保留在 team_zone_assignments 表；
        //    技能标签统一用 team_task_capabilities 表，不再读 teams.capability_tags 字段）
        const [membersList, capsList] = await Promise.all([
          Promise.all(
            apiTeams.map((t) =>
              enhancedApiClient
                .get<ApiTeamMember[]>(`/team-members/teams/${t.id}/members`)
                .then((members) => members || [])
            )
          ),
          Promise.all(
            apiTeams.map((t) =>
              enhancedApiClient
                .get<Array<{ taskType: string }>>(`/teams/${t.id}/capabilities`)
                .then((cs) => cs || [])
            )
          ),
        ]);
        const teams: Team[] = apiTeams.map((t, i) => ({
          ...mapApiTeam(t),
          // 2026-09-15：响应字段是 workerId（camelCaseResponse 中间件转换），不是 worker_id
          memberIds: membersList[i].map((m) => m.workerId),
          // 2026-09-17 修复：成员数以实际 team_members 记录为准。
          // teams.member_count 是冗余字段，与实际成员表长期不同步（如 T001 字段=8 实际=1），
          // 此前直接展示该字段，用户看到的"成员数量"是错的。
          memberCount: membersList[i].length,
          // 2026-09-17：成员姓名列表（表格"成员"列展示用，与 memberIds 同源同序）
          memberNames: membersList[i].map((m) => m.workerName),
          // 2026-09-17：技能标签统一用 team_task_capabilities 表
          taskCapabilities: capsList[i].map((c) => c.taskType),
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
        // 2026-09-17：技能标签统一走 team_task_capabilities（由 syncTeamCapabilities 写入），
        // 不再写 teams.capability_tags 字段；周产能/作业半径无任何下游消费，停止写入。
        const apiTeam = await apiCreateTeam({
          teamName: data.name || '',
          teamCode: `TM${Date.now()}`,
          // 前端表单只填负责人姓名，不提供真实 leaderId，'new' 为占位值需过滤
          ...(data.leaderId && data.leaderId !== 'new' ? { leaderId: data.leaderId } : {}),
          leaderName: data.leaderName,
          description: data.description,
          // 2026-09-17：日产能上限是可用性计算的输入（teamAvailabilityService），保留写入
          dailyCapacityHours: data.dailyCapacityHours,
        });
        set((state) => ({ teams: [mapApiTeam(apiTeam), ...state.teams] }));
        // 2026-09-16：创建后主动重新拉取，确保列表显示新班组
        await get().fetchData();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '创建班组失败' });
      }
    },

    /**
     * 更新班组（API 成功后才更新本地状态）
     * 2026-09-17：技能标签改由 syncTeamCapabilities 写 team_task_capabilities；
     * 周产能/作业半径/作业区域文本无下游消费，停止写入（字段保留历史值）
     */
    updateTeam: async (id, data) => {
      try {
        await apiUpdateTeam(id, {
          teamName: data.name,
          teamCode: data.teamCode,
          departmentOid: data.departmentOid,
          leaderId: data.leaderId,
          leaderName: data.leaderName,
          shiftType: data.shiftType,
          memberCount: data.memberCount,
          description: data.description,
          // 2026-09-17：日产能上限是可用性计算的输入（teamAvailabilityService），保留写入
          dailyCapacityHours: data.dailyCapacityHours,
        });
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString().split('T')[0] }
              : t
          ),
        }));
        // 2026-09-16：编辑成功后主动重新拉取数据，避免乐观更新与后端字段映射不一致导致 list 显示空
        // （前端 data.capabilityTags 是数组，但 data.capabilityTags 通过 {...t, ...data} 合并时可能丢字段；re-fetch 保证 store 与 DB 同步）
        await get().fetchData();
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
    assignWorkers: async (teamId, workerIds, operatorId, operatorName, role = 'member') => {
      try {
        await enhancedApiClient.post(`/team-members/teams/${teamId}/members/batch`, {
          workerIds,
          operatorId,
          operatorName,
          role, // 2026-09-17 修复：此前未传 role，后端默认 'member'，用户选的班长/安全员等角色全部丢失
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
