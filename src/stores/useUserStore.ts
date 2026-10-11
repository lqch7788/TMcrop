/**
 * 用户 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';import { getUsers } from '../services/authorityService';
// 2026-10-11：User 类型定义在 types/authority，authorityService 未导出该类型
import type { User } from '../types/authority';

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
  (set, get)=> ({
      users: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadUsers: async () => {
        // 防止重复调用
        if (get().loading) return;
        // 2026-10-11：先取局部变量再做 null 收窄（get() 每次调用返回新值，无法保持收窄）
        const lastFetch = get().lastFetch;
        if (get().users.length > 0 && lastFetch) {
          const now = Date.now();
          if (now - lastFetch < 5 * 60 * 1000) return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getUsers();
          // 2026-10-11：归一化映射——后端返回 position 列，而消费点（ReassignTaskModal）读的是 role，
          // 此前 role 恒 undefined（渲染成 "张三 (undefined)"）
          set({ users: data.map(u => ({ ...u, role: u.role || u.position || '' })), loading: false, lastFetch: Date.now() });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载用户失败', loading: false });
        }
      },

      refreshUsers: async () => {
        set({ lastFetch: null });
        await get().loadUsers();
      },
    })
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
