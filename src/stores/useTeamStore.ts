/**
 * 班组 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import { getTeams, createTeam, updateTeam, deleteTeam, type Team as ApiTeam } from '../services/apiBasicDataService';

// 2026-09-15：扩展班组类型，新增 memberIds（班组成员 ID 列表，从 /team-members/teams/:id/members 拉取）
// 之前 ScheduleAddModal 只能按 departmentName 过滤 employees 凑出"班组成员"（维度不一致 → 按部门排班 bug）
export interface Team extends ApiTeam {
  memberIds: string[];
}

interface TeamStore {
  teams: Team[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadTeams: () => Promise<void>;

  // CRUD
  addTeam: (team: Partial<Team>) => Promise<Team>;
  editTeam: (id: string, team: Partial<Team>) => Promise<void>;
  removeTeam: (teamId: string) => Promise<void>;

  // 刷新
  refreshTeams: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>()(
  (set, get)=> ({
      teams: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadTeams: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().teams.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          // 1. 拉班组列表
          const data = await getTeams();
          // 2. 并行拉每队成员，组装 memberIds（2026-09-15：修复按部门排班 bug）
          const teamsWithMembers: Team[] = await Promise.all(
            data.map(async (t): Promise<Team> => {
              try {
                // 2026-09-15：响应字段是 workerId（camelCaseResponse 中间件转换），不是 worker_id
                const members = await enhancedApiClient.get<Array<{ workerId: string }>>(
                  `/team-members/teams/${t.id}/members`
                );
                return { ...t, memberIds: (members || []).map((m) => m.workerId) };
              } catch {
                // 拉取失败时返回空成员（不影响班组列表加载）
                return { ...t, memberIds: [] };
              }
            }),
          );
          set({ teams: teamsWithMembers, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载班组失败', loading: false });
        }
      },

      addTeam: async (team) => {
        const result = await createTeam(team);
        set(state => ({ teams: [...state.teams, { ...result, memberIds: [] }] }));
        return result;
      },

      editTeam: async (id, team) => {
        await updateTeam(id, team);
        set(state => ({
          teams: state.teams.map(t => t.id === id ? { ...t, ...team } : t)
        }));
      },

      removeTeam: async (teamId) => {
        await deleteTeam(teamId);
        set(state => ({ teams: state.teams.filter(t => t.id !== teamId) }));
      },

      refreshTeams: async () => {
        set({ lastFetch: null });
        await get().loadTeams();
      },
    })
);

// 辅助函数
export const getTeamByOid = (oid: string): Team | undefined => {
  return useTeamStore.getState().teams.find(t => t.oid === oid);
};

export const getTeamsByDepartment = (departmentOid: string): Team[] => {
  return useTeamStore.getState().teams.filter(t => t.departmentOid === departmentOid);
};

export const getActiveTeams = (): Team[] => {
  return useTeamStore.getState().teams.filter(t => t.status === 'active');
};
