/**
 * 用户 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getUsers, type User } from '../services/authorityService';

interface UserStore {
  users: User[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadUsers: () => Promise<void>;

  // 刷新
  refreshUsers: () => Promise<void>;
}

export const useUserStore = create<UserStore>()(
  persist(
    (set, get) => ({
      users: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadUsers: async () => {
        // 防止重复调用
        if (get().loading) return;
        if (get().users.length > 0 && get().lastFetch) {
          const now = Date.now();
          if (now - get().lastFetch < 5 * 60 * 1000) return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getUsers();
          set({ users: data, loading: false, lastFetch: Date.now() });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载用户失败', loading: false });
        }
      },

      refreshUsers: async () => {
        set({ lastFetch: null });
        await get().loadUsers();
      },
    }),
    {
      name: 'user_store',
      partialize: (state) => ({ users: state.users }),
    }
  )
);

// 辅助函数
export const getUserByOid = (oid: string): User | undefined => {
  return useUserStore.getState().users.find(u => u.oid === oid);
};

export const getUsersByDepartment = (departmentOid: string): User[] => {
  return useUserStore.getState().users.filter(u => u.departmentOid === departmentOid);
};

export const getActiveUsers = (): User[] => {
  return useUserStore.getState().users.filter(u => u.status === 'active');
};
