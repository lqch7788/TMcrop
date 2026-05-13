/**
 * 工人 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider 的错误实现
 * Worker类型来自 apiWorkerService 而非 authorityService
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWorkerList, type Worker } from '../services/apiWorkerService';

interface WorkerStore {
  workers: Worker[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadWorkers: () => Promise<void>;

  // 刷新
  refreshWorkers: () => Promise<void>;
}

export const useWorkerStore = create<WorkerStore>()(
  persist(
    (set, get) => ({
      workers: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadWorkers: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().workers.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getWorkerList();
          set({ workers: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载工人列表失败', loading: false });
        }
      },

      refreshWorkers: async () => {
        set({ lastFetch: null });
        await get().loadWorkers();
      },
    }),
    {
      name: 'worker_store',
      partialize: (state) => ({ workers: state.workers }),
    }
  )
);
