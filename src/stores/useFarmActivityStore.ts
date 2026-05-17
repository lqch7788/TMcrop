/**
 * 农事活动 Store - Zustand 状态管理
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getFarmActivities, createFarmActivity, updateFarmActivity, deleteFarmActivity,
  type FarmActivity,
} from '../services/apiBasicDataService';

interface FarmActivityStore {
  activities: FarmActivity[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadActivities: () => Promise<void>;
  addActivity: (data: Partial<FarmActivity>) => Promise<FarmActivity>;
  editActivity: (id: number, data: Partial<FarmActivity>) => Promise<void>;
  removeActivity: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useFarmActivityStore = create<FarmActivityStore>()(
  persist(
    (set, get) => ({
      activities: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadActivities: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().activities.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getFarmActivities();
          set({ activities: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载农事活动失败', loading: false });
        }
      },

      addActivity: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createFarmActivity(data);
          set((s) => ({ activities: [...s.activities, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建农事活动失败', loading: false });
          throw error;
        }
      },

      editActivity: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateFarmActivity(id, data);
          set((s) => ({ activities: s.activities.map((a) => a.id === id ? { ...a, ...data } : a), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新农事活动失败', loading: false });
          throw error;
        }
      },

      removeActivity: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteFarmActivity(id);
          set((s) => ({ activities: s.activities.filter((a) => a.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除农事活动失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => { set({ lastFetch: null }); await get().loadActivities(); },
    }),
    {
      name: 'farm_activity_store',
      partialize: (s) => ({ activities: s.activities }),
    }
  )
);
