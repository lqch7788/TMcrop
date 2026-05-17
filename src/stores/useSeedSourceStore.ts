/**
 * 种源管理 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { SeedSource, PropagationRecord } from '../types/crop';
import * as seedSourceService from '../services/apiSeedSourceService';
import { enhancedApiClient } from '../lib/apiClient';

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
  persist(
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
        console.error('[useSeedSourceStore] 获取种源失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await seedSourceService.addSeedSource(item);
        if (result) {
          set((state) => ({ items: [result, ...state.items] }));
          enhancedApiClient.clearCache().catch(() => {});
        }
        return result;
      } catch (error) {
        console.error('[useSeedSourceStore] 添加种源失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await seedSourceService.updateSeedSource(id, updates);
        if (result) {
          set((state) => ({
            items: state.items.map((item) =>
              item.id === id ? { ...item, ...updates } : item
            ),
          }));
          enhancedApiClient.clearCache().catch(() => {});
        }
        return result;
      } catch (error) {
        console.error('[useSeedSourceStore] 更新种源失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await seedSourceService.deleteSeedSource(id);
        if (result) {
          set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
          enhancedApiClient.clearCache().catch(() => {});
        }
        return result;
      } catch (error) {
        console.error('[useSeedSourceStore] 删除种源失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await seedSourceService.deleteSeedSources(ids);
        if (result) {
          set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
          enhancedApiClient.clearCache().catch(() => {});
        }
        return result;
      } catch (error) {
        console.error('[useSeedSourceStore] 批量删除种源失败:', error);
        return false;
      }
    },

    // ========== 繁殖途径方法 ==========

    addPropagationRecord: async (seedSourceId, data) => {
      try {
        const result = await seedSourceService.addPropagationRecord(seedSourceId, data);
        enhancedApiClient.clearCache().catch(() => {});
        return result;
      } catch (error) {
        console.error('[useSeedSourceStore] 添加繁殖过程记录失败:', error);
        return null;
      }
    },

    loadPropagationRecords: async (seedSourceId) => {
      try {
        return await seedSourceService.getPropagationRecords(seedSourceId);
      } catch (error) {
        console.error('[useSeedSourceStore] 获取繁殖过程记录失败:', error);
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
        enhancedApiClient.clearCache().catch(() => {});
        return true;
      } catch (error) {
        console.error('[useSeedSourceStore] 推进繁殖阶段失败:', error);
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
        enhancedApiClient.clearCache().catch(() => {});
        return true;
      } catch (error) {
        console.error('[useSeedSourceStore] 完成繁殖入库失败:', error);
        return false;
      }
    },
  }),
  {
    name: 'seed-source-storage',
    version: 2,  // 版本升级：清除旧格式缓存，避免非数组数据导致 filter 报错
    partialize: (state) => ({ items: state.items }),
    merge: (persisted: unknown, current) => {
      const state = current as SeedSourceState;
      // 防御性检查：确保 items 是数组
      if (persisted && typeof persisted === 'object' && Array.isArray((persisted as Record<string, unknown>).items)) {
        return { ...state, items: (persisted as Record<string, unknown>).items as SeedSource[] };
      }
      return state;
    },
  }
)
);
