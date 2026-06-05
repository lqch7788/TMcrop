/**
 * 种源管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { SeedSource, PropagationRecord } from '../types/crop';
import * as seedSourceService from '../services/apiSeedSourceService';

interface SeedSourceState {
  items: SeedSource[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Parameters<typeof seedSourceService.addSeedSource>[0]) => Promise<SeedSource | null>;
  updateItem: (id: string, updates: Partial<SeedSource>) => Promise<SeedSource | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  // 繁殖途径方法
  addPropagationRecord: (seedSourceId: string, data: Partial<PropagationRecord>) => Promise<PropagationRecord | null>;
  loadPropagationRecords: (seedSourceId: string) => Promise<PropagationRecord[]>;
  updatePropagationStage: (seedSourceId: string, newStage: string) => Promise<boolean>;
  completePropagation: (seedSourceId: string, quantity: number) => Promise<boolean>;
}

export const useSeedSourceStore = create<SeedSourceState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await seedSourceService.getSeedSources();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[useSeedSourceStore] 获取种源失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await seedSourceService.addSeedSource(item);
        if (result) {
          set((state) => ({ items: [result, ...state.items] }));
        }
        return result;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 添加种源失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      // 2026-06-05: 错误直接向上冒（强结/编辑需要看到具体原因，不再吞错返回 null）
      const result = await seedSourceService.updateSeedSource(id, updates);
      if (result) {
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));
      }
      return result;
    },

    deleteItem: async (id) => {
      try {
        const result = await seedSourceService.deleteSeedSource(id);
        if (result) {
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
        }
        return result;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 删除种源失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await seedSourceService.deleteSeedSources(ids);
        if (result) {
          set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
        }
        return result;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 批量删除种源失败:', error);
        return false;
      }
    },

    addPropagationRecord: async (seedSourceId, data) => {
      try {
        const result = await seedSourceService.addPropagationRecord(seedSourceId, data);
        return result;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 添加繁殖过程记录失败:', error);
        return null;
      }
    },

    loadPropagationRecords: async (seedSourceId) => {
      try {
        return await seedSourceService.getPropagationRecords(seedSourceId);
      } catch (error) {
        // logger.error('[useSeedSourceStore] 获取繁殖过程记录失败:', error);
        return [];
      }
    },

    updatePropagationStage: async (seedSourceId, newStage) => {
      try {
        await seedSourceService.updatePropagationStage(seedSourceId, newStage);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === seedSourceId ? { ...item, propagationStatus: newStage as any } : item
          ),
        }));
        return true;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 推进繁殖阶段失败:', error);
        return false;
      }
    },

    completePropagation: async (seedSourceId, quantity) => {
      try {
        await seedSourceService.completePropagation(seedSourceId, quantity);
        set((state) => ({
          items: state.items.map((item) =>
            item.id === seedSourceId
              ? {
                  ...item,
                  propagationStatus: 'completed' as any,
                  availableCount: item.availableCount + quantity,
                  quantity: item.quantity + quantity,
                }
              : item
          ),
        }));
        return true;
      } catch (error) {
        // logger.error('[useSeedSourceStore] 完成繁殖入库失败:', error);
        return false;
      }
    },
  })
);
