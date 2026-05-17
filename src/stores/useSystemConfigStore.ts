/**
 * 系统配置 Store - Zustand 状态管理
 * 统一管理系统配置的增删改查
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getSystemConfigs, createSystemConfig, updateSystemConfig, deleteSystemConfig,
  type SystemConfig,
} from '../services/apiBasicDataService';

interface SystemConfigStore {
  configs: SystemConfig[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadConfigs: () => Promise<void>;
  addConfig: (data: Partial<SystemConfig>) => Promise<SystemConfig>;
  updateConfig: (id: string, data: Partial<SystemConfig>) => Promise<void>;
  removeConfig: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useSystemConfigStore = create<SystemConfigStore>()(
  persist(
    (set, get) => ({
      configs: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadConfigs: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().configs.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getSystemConfigs();
          set({ configs: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载系统配置失败', loading: false });
        }
      },

      addConfig: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createSystemConfig(data);
          set((s) => ({ configs: [...s.configs, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建系统配置失败', loading: false });
          throw error;
        }
      },

      updateConfig: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateSystemConfig(id, data);
          set((s) => ({ configs: s.configs.map((c) => c.id === id ? { ...c, ...data } : c), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新系统配置失败', loading: false });
          throw error;
        }
      },

      removeConfig: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteSystemConfig(id);
          set((s) => ({ configs: s.configs.filter((c) => c.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除系统配置失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => { set({ lastFetch: null }); await get().loadConfigs(); },
    }),
    {
      name: 'system_config_store',
      partialize: (s) => ({ configs: s.configs }),
    }
  )
);
