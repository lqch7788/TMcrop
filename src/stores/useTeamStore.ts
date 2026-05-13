/**
 * 班组 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getTeams, createTeam, updateTeam, deleteTeam, type Team } from '../services/apiBasicDataService';

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
  removeTeam: (id: string) => Promise<void>;

  // 刷新
  refreshTeams: () => Promise<void>;
}

export const useTeamStore = create<TeamStore>()(
  persist(
    (set, get) => ({
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
          const data = await getTeams();
          set({ teams: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载班组失败', loading: false });
        }
      },

      addTeam: async (team) => {
        const result = await createTeam(team);
        set(state => ({ teams: [...state.teams, result] }));
        return result;
      },

      editTeam: async (id, team) => {
        await updateTeam(id, team);
        set(state => ({
          teams: state.teams.map(t => t.id === id ? { ...t, ...team } : t)
        }));
      },

      removeTeam: async (id) => {
        await deleteTeam(id);
        set(state => ({ teams: state.teams.filter(t => t.id !== id) }));
      },

      refreshTeams: async () => {
        set({ lastFetch: null });
        await get().loadTeams();
      },
    }),
    {
      name: 'team_store',
      partialize: (state) => ({ teams: state.teams }),
    }
  )
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
