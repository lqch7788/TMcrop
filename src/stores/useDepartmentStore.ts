/**
 * 部门 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider，已增强完整 CRUD
 */
import { create } from 'zustand';
import {
  getDepartments,
  createDepartment,
  updateDepartment,
  deleteDepartment,
  type Department,
} from '../services/apiBasicDataService';

interface DepartmentStore {
  departments: Department[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadDepartments: () => Promise<void>;
  addDepartment: (dept: Partial<Department>) => Promise<Department>;
  updateDepartment: (id: string, dept: Partial<Department>) => Promise<void>;
  removeDepartment: (id: string) => Promise<void>;
  refreshDepartments: () => Promise<void>;
}

export const useDepartmentStore = create<DepartmentStore>()(
  (set, get)=> ({
      departments: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadDepartments: async () => {
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

      addDepartment: async (dept) => {
        set({ loading: true, error: null });
        try {
          const created = await createDepartment(dept);
          set((state) => ({ departments: [...state.departments, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建部门失败', loading: false });
          throw error;
        }
      },

      updateDepartment: async (id, dept) => {
        set({ loading: true, error: null });
        try {
          await updateDepartment(id, dept);
          set((state) => ({
            departments: state.departments.map((d) =>
              d.id === id || d.oid === id ? { ...d, ...dept } : d
            ),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新部门失败', loading: false });
          throw error;
        }
      },

      removeDepartment: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteDepartment(id);
          set((state) => ({
            departments: state.departments.filter((d) => d.id !== id && d.oid !== id),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除部门失败', loading: false });
          throw error;
        }
      },

      refreshDepartments: async () => {
        set({ lastFetch: null });
        await get().loadDepartments();
      },
    })
);

// 辅助函数
export const getDepartmentByOid = (oid: string): Department | undefined => {
  return useDepartmentStore.getState().departments.find((d) => d.oid === oid);
};

export const getActiveDepartments = (): Department[] => {
  return useDepartmentStore.getState().departments.filter((d) => d.status === 'active');
};
