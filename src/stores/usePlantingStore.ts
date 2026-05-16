/**
 * 种植管理 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { Planting } from '../types/crop';
import * as plantingService from '../services/apiPlantingService';

interface PlantingState {
  items: Planting[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Planting, 'id' | 'createTime' | 'updateTime'>) => Promise<Planting | null>;
  updateItem: (id: string, updates: Partial<Planting>) => Promise<Planting | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  harvestPlanting: (id: string, harvestDate: string, harvestCount?: number) => Promise<boolean>;
}

export const usePlantingStore = create<PlantingState>()(
  persist(
    (set) => ({
      items: [],
      isLoading: false,
      error: null,

      loadItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await plantingService.getPlantings();
          set({ items: data, isLoading: false });
        } catch (error) {
          console.error('[usePlantingStore] 获取种植数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const result = await plantingService.addPlanting(item);
          if (result) set((s) => ({ items: [result, ...s.items] }));
          return result;
        } catch (error) {
          console.error('[usePlantingStore] 添加种植失败:', error);
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          const result = await plantingService.updatePlanting(id, updates);
          if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
          return result;
        } catch (error) {
          console.error('[usePlantingStore] 更新种植失败:', error);
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          const result = await plantingService.deletePlanting(id);
          if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          return result;
        } catch (error) {
          console.error('[usePlantingStore] 删除种植失败:', error);
          return false;
        }
      },

      deleteItems: async (ids) => {
        try {
          const result = await plantingService.deletePlantings(ids);
          if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
          return result;
        } catch (error) {
          console.error('[usePlantingStore] 批量删除种植失败:', error);
          return false;
        }
      },

      harvestPlanting: async (id, harvestDate, harvestCount) => {
        try {
          const result = await plantingService.harvestPlanting(id, harvestDate, harvestCount);
          if (result) {
            set((s) => ({
              items: s.items.map((i) =>
                i.id === id
                  ? { ...i, harvestDate, harvestQuantity: harvestCount, status: 'harvested' as const }
                  : i
              ),
            }));
          }
          return result;
        } catch (error) {
          console.error('[usePlantingStore] 采收种植失败:', error);
          return false;
        }
      },
    }),
    {
      name: 'planting-storage',
      version: 2,
      partialize: (state) => ({ items: state.items }),
      merge: (persisted: unknown, current) => {
        const state = current as PlantingState;
        if (persisted && typeof persisted === 'object' && Array.isArray((persisted as Record<string, unknown>).items)) {
          return { ...state, items: (persisted as Record<string, unknown>).items as Planting[] };
        }
        return state;
      },
    }
  )
);
