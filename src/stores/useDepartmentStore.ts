/**
 * 部门 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getDepartments, type Department } from '../services/apiBasicDataService';

interface DepartmentStore {
  departments: Department[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载部门
  loadDepartments: () => Promise<void>;

  // 刷新
  refreshDepartments: () => Promise<void>;
}

export const useDepartmentStore = create<DepartmentStore>()(
  persist(
    (set, get) => ({
      departments: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadDepartments: async () => {
        // 缓存 5 分钟
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().departments.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getDepartments();
          set({ departments: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载部门失败', loading: false });
        }
      },

      refreshDepartments: async () => {
        set({ lastFetch: null });
        await get().loadDepartments();
      },
    }),
    {
      name: 'department_store',
      partialize: (state) => ({ departments: state.departments }),
    }
  )
);

// 辅助函数
export const getDepartmentByOid = (oid: string): Department | undefined => {
  return useDepartmentStore.getState().departments.find(d => d.oid === oid);
};

export const getActiveDepartments = (): Department[] => {
  return useDepartmentStore.getState().departments.filter(d => d.status === 'active');
};
