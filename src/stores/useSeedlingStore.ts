/**
 * 育苗管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { Seedling, DailyRecord } from '../types/crop';
import * as seedlingService from '../services/apiSeedlingService';

interface SeedlingState {
  items: Seedling[];
  isLoading: boolean;
  error: string | null;

  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Seedling, 'id' | 'createTime' | 'updateTime'>) => Promise<Seedling | null>;
  updateItem: (id: string, updates: Partial<Seedling>) => Promise<Seedling | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  addDailyRecord: (seedlingId: string, record: Omit<DailyRecord, 'id' | 'seedlingId'>) => Promise<DailyRecord | null>;
  updateDailyRecord: (seedlingId: string, recordId: string, updates: Partial<DailyRecord>) => Promise<boolean>;
  deleteDailyRecord: (seedlingId: string, recordId: string) => Promise<boolean>;
  increasePlantedCount: (id: string, count: number) => Promise<boolean>;
}

export const useSeedlingStore = create<SeedlingState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await seedlingService.getSeedlings();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[useSeedlingStore] 获取育苗数据失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await seedlingService.addSeedling(item);
        if (result) {
          set((s) => ({ items: [result, ...s.items] }));
        }
        return result;
      } catch (error) {
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await seedlingService.updateSeedling(id, updates);
        if (result) {
          set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        }
        return result;
      } catch (error) {
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await seedlingService.deleteSeedling(id);
        if (result) {
          set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        }
        return result;
      } catch (error) {
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await seedlingService.deleteSeedlings(ids);
        if (result) {
          set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        }
        return result;
      } catch (error) {
        return false;
      }
    },

    addDailyRecord: async (seedlingId, record) => {
      try {
        const result = await seedlingService.addDailyRecord(seedlingId, record);
        if (result) {
          await get().loadItems();
        }
        return result;
      } catch (error) {
        return null;
      }
    },

    updateDailyRecord: async (seedlingId, recordId, updates) => {
      try {
        const result = await seedlingService.updateDailyRecord(seedlingId, recordId, updates);
        if (result) {
          await get().loadItems();
        }
        return result;
      } catch (error) {
        return false;
      }
    },

    deleteDailyRecord: async (seedlingId, recordId) => {
      try {
        const result = await seedlingService.deleteDailyRecord(seedlingId, recordId);
        if (result) {
          await get().loadItems();
        }
        return result;
      } catch (error) {
        return false;
      }
    },

    increasePlantedCount: async (id, count) => {
      try {
        const result = await seedlingService.increasePlantedCount(id, count);
        if (result) {
          // 2026-06-16: 数量体系重构 — 后端 increase-planted 路由累加到 auto_planted_count
          // 前端 store 同步更新 autoPlantedCount 避免数据分裂（UI 与 DB 一致）
          set((s) => ({
            items: s.items.map((i) =>
              i.id === id ? { ...i, autoPlantedCount: ((i as any).autoPlantedCount || 0) + count } : i
            ),
          }));
        }
        return result;
      } catch (error) {
        return false;
      }
    },
  })
);
