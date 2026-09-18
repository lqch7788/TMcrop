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

// 2026-09-18 修复 L-4：表单只填负责人姓名、不提供真实 leaderId，用 sentinel 占位；
// 后端 route 已对 sentinel 做过滤，但前端 magic string 散布在 store/组件中易漂移，
// 集中常量便于未来需要时一处替换。
export const PLACEHOLDER_LEADER_ID = 'new';

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
 * 2026-09-18 修复 C-13：snake_case 兼容分支是误导性 dead code（camelCaseResponse
 * 中间件全局递归转换，snake_case 永远 undefined）。删除后失败模式变成"直接报字段
 * 缺失"，便于尽早发现回归而非走默认值兜底隐藏 bug。
 * 2026-09-18 修复 C-14：createdAt/updatedAt 兜底 '' 会导致下游 split('T')[0] 崩溃，
 * 改兜底 === '' (合法 ISO 字符串) 或空字符串 → '—' 占位。
 */
function mapApiTeam(api: ApiTeam): Team {
  let capabilityTags: string[] | undefined;
  // 2026-09-18 修复 M-17：capabilityTags 双重 JSON.parse 冗余。
  // 后端 basicData.ts:1073-1079 已 parse 为数组；前端再 parse 时已是 Array，直接用。
  // 保留对字符串的兜底（万一后端 parse 失败返回原字符串，或未来移除 camelCaseResponse 中间件）
  if (Array.isArray(api.capabilityTags)) {
    capabilityTags = api.capabilityTags;
  } else if (typeof api.capabilityTags === 'string' && api.capabilityTags) {
    try {
      const parsed = JSON.parse(api.capabilityTags);
      if (Array.isArray(parsed)) capabilityTags = parsed as string[];
    } catch { /* ignore parse error */ }
  }
  // 2026-09-18 修复 C-14：createdAt/updatedAt 兜底 '—' 而非 ''（下游 .split('T')[0] 会崩）
  const safeDate = (v: string | null | undefined) => (v && typeof v === 'string' ? v : '—');
  return {
    id: api.id,
    name: api.teamName,
    leaderId: api.leaderId || '',
    leaderName: api.leaderName || '',
    memberIds: [],
    memberCount: api.memberCount ?? 0,
    description: api.description,
    workZone: api.workZone ?? api.departmentName ?? '',
    createdAt: safeDate(api.createdAt),
    updatedAt: safeDate(api.updatedAt ?? api.createdAt),
    capabilityTags,
    dailyCapacityHours: api.dailyCapacityHours ?? 8,
    weeklyCapacityHours: api.weeklyCapacityHours ?? 40,
    coverageRadiusKm: api.coverageRadiusKm ?? 0,
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

// 2026-09-18 修复 H-17：模块级 in-flight Promise 锁，防止并发 fetchData 重复拉取
let inflightFetch: Promise<void> | null = null;

// 2026-09-18 修复 H-3：写操作防重锁（按操作类型分组）
// 防连点保存/批量操作/同步网络时重复 PUT/POST，并发只触发一次服务端调用
type WriteKey = 'create' | 'update' | 'delete' | 'assign' | 'remove';
const inflightWrites: Record<WriteKey, Promise<unknown> | null> = {
  create: null, update: null, delete: null, assign: null, remove: null,
};
function dedupeWrite<K extends WriteKey>(key: K, fn: () => Promise<unknown>): Promise<unknown> {
  const existing = inflightWrites[key];
  if (existing) return existing;
  const p = (async () => fn())().finally(() => { inflightWrites[key] = null; });
  inflightWrites[key] = p;
  return p;
}

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
     *
     * 2026-09-18 修复 H-17/H-10：并发 fetchData 会发起 1+2N 次 HTTP 请求，结果按到达顺序
     * 覆盖 state（race condition）。加 inFlight 锁：已有进行中的请求直接 await 同一 Promise，
     * 并发只会实际拉一次。
     */
    fetchData: async () => {
      // 已有进行中的请求 → 复用，避免重复拉取
      const existing = inflightFetch;
      if (existing) return existing;
      inflightFetch = (async () => {
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
      } finally {
        inflightFetch = null; // 释放锁，下一次 fetchData 可正常发起
      }
      })();
      return inflightFetch;
    },

    /**
     * 创建班组（后端必填 teamName + teamCode，teamCode 自动生成）
     * API 成功后将后端返回的完整记录插入本地状态
     */
    createTeam: async (data) => {
      // 2026-09-18 修复 H-3：createTeam 防重（双击只创建 1 次）
      return dedupeWrite('create', async () => {
      try {
        // 2026-09-17：技能标签统一走 team_task_capabilities（由 syncTeamCapabilities 写入），
        // 不再写 teams.capability_tags 字段；周产能/作业半径无任何下游消费，停止写入。
        const apiTeam = await apiCreateTeam({
          teamName: data.name || '',
          // 2026-09-18 修复 C-12：teamCode 用 UUID（避免 ms 并发重复）
          teamCode: `TM_${crypto.randomUUID()}`,
          // 前端表单只填负责人姓名，不提供真实 leaderId，PLACEHOLDER_LEADER_ID 为占位值需过滤
          ...(data.leaderId && data.leaderId !== PLACEHOLDER_LEADER_ID ? { leaderId: data.leaderId } : {}),
          leaderName: data.leaderName,
          description: data.description,
          // 2026-09-17：日产能上限是可用性计算的输入（teamAvailabilityService），保留写入
          dailyCapacityHours: data.dailyCapacityHours,
        });
        set((state) => ({ teams: [mapApiTeam(apiTeam), ...state.teams] }));
        // 2026-09-16：创建后主动重新拉取，确保列表显示新班组
        await get().fetchData();
        // 2026-09-18 修复 C-11：必须 throw，UI 才能感知失败（C-10 的根因之一）
        return mapApiTeam(apiTeam);
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '创建班组失败' });
        throw error;
      }
      }) as Promise<Team | undefined>;
    },

    /**
     * 更新班组（API 成功后才更新本地状态）
     * 2026-09-17：技能标签改由 syncTeamCapabilities 写 team_task_capabilities；
     * 周产能/作业半径/作业区域文本无下游消费，停止写入（字段保留历史值）
     */
    updateTeam: async (id, data) => {
      // 2026-09-18 修复 H-3：updateTeam 防重
      return dedupeWrite('update', async () => {
      try {
        // 2026-09-18 修复 H-15：PUT payload 只传表单实际编辑的字段，
        // teamCode/departmentOid/shiftType/memberCount/leaderId 是表单未提供项。
        // 之前传 undefined 走 COALESCE 不变，但若传空串 ('') 会被 SQL 覆盖为 NULL/0 → 静默清空 DB。
        await apiUpdateTeam(id, {
          teamName: data.name,
          leaderName: data.leaderName,
          description: data.description,
          dailyCapacityHours: data.dailyCapacityHours,
        });
        set((state) => ({
          teams: state.teams.map((t) =>
            t.id === id
              ? { ...t, ...data, updatedAt: new Date().toISOString().split('T')[0] }
              : t
          ),
        }));
        // 2026-09-18 修复 H-12：先乐观 set 再 fetchData 是双写冗余（写 2 次），
        // 保留乐观 set 保证 UI 立即响应，fetchData 已经在 setState 后异步执行（保留）
        await get().fetchData();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '更新班组失败' });
        throw error; // 2026-09-18 修复 C-11：必须 throw
      }
      });
    },

    /**
     * 删除班组（后端软删除 status=inactive）
     */
    deleteTeam: async (id) => {
      // 2026-09-18 修复 H-3：deleteTeam 防重
      return dedupeWrite('delete', async () => {
      try {
        await apiDeleteTeam(id);
        set((state) => ({ teams: state.teams.filter((t) => t.id !== id) }));
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '删除班组失败' });
        throw error; // 2026-09-18 修复 C-11
      }
      });
    },

    /**
     * 批量分配工人到班组（2026-09-18 修复 C-9：支持每个工人独立角色）
     * @param workerRoles 可选，workerId → role 映射（leader/deputy/safety/quality/member）
     *   不传时所有工人用同一个 role（向后兼容）
     */
    assignWorkers: async (teamId, workerIds, operatorId, operatorName, roleOrWorkerRoles?: string | Record<string, string>) => {
      // 2026-09-18 修复 H-3：assignWorkers 防重
      return dedupeWrite('assign', async () => {
      try {
        // 2026-09-18 修复 C-9：兼容两种入参
        //   - string：向后兼容（所有工人用同一角色）
        //   - Record<workerId, role>：每个工人独立角色
        const singleRole = typeof roleOrWorkerRoles === 'string' ? roleOrWorkerRoles : undefined;
        const workerRolesMap = roleOrWorkerRoles && typeof roleOrWorkerRoles === 'object' ? roleOrWorkerRoles : undefined;
        await enhancedApiClient.post(`/team-members/teams/${teamId}/members/batch`, {
          workerIds,
          operatorId,
          operatorName,
          // 2026-09-18：传 workerRoles（per-worker）或 role（兼容旧接口）
          ...(workerRolesMap ? { workerRoles: workerRolesMap } : { role: singleRole || 'member' }),
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
        throw error; // 2026-09-18 修复 C-11
      }
      });
    },

    /**
     * 移除班组成员
     * API 成功后从成员列表移除，并将该工人加回未分配列表
     */
    removeWorker: async (teamId, workerId) => {
      // 2026-09-18 修复 H-3：removeWorker 防重
      return dedupeWrite('remove', async () => {
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
        throw error; // 2026-09-18 修复 C-11
      }
      });
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
