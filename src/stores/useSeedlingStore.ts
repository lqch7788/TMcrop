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
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
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
        console.error('[useSeedlingStore] 获取育苗数据失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    addItem: async (item) => {
      try {
        const result = await seedlingService.addSeedling(item);
        if (result) {
          set((s) => ({ items: [result, ...s.items] }));
        }
        return result;
      } catch (error) {
        console.error('[useSeedlingStore] 新增育苗失败:', error);
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
        console.error('[useSeedlingStore] 更新育苗失败:', error);
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
        console.error('[useSeedlingStore] 删除育苗失败:', error);
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
        console.error('[useSeedlingStore] 批量删除育苗失败:', error);
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
        console.error('[useSeedlingStore] 新增每日记录失败:', error);
        // 2026-08-14：错误上抛 — 弹窗需要显示具体失败原因（后端校验文案），不再吞成笼统报错
        throw error;
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
        console.error('[useSeedlingStore] 更新每日记录失败:', error);
        // 2026-08-14 M2 修复：错误上抛 — 弹窗显示具体失败原因，不再吞成笼统报错
        throw error;
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
        console.error('[useSeedlingStore] 删除每日记录失败:', error);
        // 2026-08-14 M2 修复：错误上抛 — 弹窗显示具体失败原因，不再吞成笼统报错
        throw error;
      }
    },

    increasePlantedCount: async (id, count) => {
      try {
        const result = await seedlingService.increasePlantedCount(id, count);
        if (result) {
          // 2026-06-28：业务规则变更 — 种植管理不再从育苗取苗，此函数调用入口应该已被禁用
          // 保留函数避免外部 import 报错，但不再修改 store 状态（无业务意义）
          void count;
        }
        return result;
      } catch (error) {
        console.error('[useSeedlingStore] increasePlantedCount 失败:', error);
        return false;
      }
    },
  })
);
