/**
 * 种植管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { Planting, PlantingHarvestRecord } from '../types/crop';
import * as plantingService from '../services/apiPlantingService';
import type { AddHarvestRecordInput } from '../services/apiPlantingService';

interface PlantingState {
  items: Planting[];
  isLoading: boolean;
  error: string | null;

  // 2026-06-17: 采收记录状态
  /** plantingId → 该种植的采收记录列表 */
  harvestRecords: Record<string, PlantingHarvestRecord[]>;
  harvestLoading: boolean;

  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Planting, 'id' | 'createTime' | 'updateTime'>) => Promise<Planting | null>;
  updateItem: (id: string, updates: Partial<Planting>) => Promise<Planting | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  harvestPlanting: (id: string, harvestDate: string, harvestCount?: number) => Promise<boolean>;

  // 2026-06-17: 采收记录 actions
  loadHarvestRecords: (plantingId: string) => Promise<void>;
  addHarvestRecord: (plantingId: string, input: AddHarvestRecordInput) => Promise<PlantingHarvestRecord | null>;
  updateHarvestRecord: (plantingId: string, recordId: string, input: AddHarvestRecordInput) => Promise<PlantingHarvestRecord | null>;
  deleteHarvestRecord: (plantingId: string, recordId: string) => Promise<boolean>;

  // 2026-06-17: 总结束（软锁）— 调 PUT /:id
  endPlanting: (
    id: string,
    options: {
      status: 'ended' | 'cancelled';
      endType: 'harvest' | 'circulate' | 'circulate_to_inventory' | 'self_seed' | 'dispose';
      notes?: string;
    }
  ) => Promise<boolean>;
}

export const usePlantingStore = create<PlantingState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,
    harvestRecords: {},
    harvestLoading: false,

    clearError: () => set({ error: null }),

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await plantingService.getPlantings();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[usePlantingStore] 获取种植数据失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await plantingService.addPlanting(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        // logger.error('[usePlantingStore] 添加种植失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await plantingService.updatePlanting(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        // logger.error('[usePlantingStore] 更新种植失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await plantingService.deletePlanting(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        // logger.error('[usePlantingStore] 删除种植失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await plantingService.deletePlantings(ids);
        if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return result;
      } catch (error) {
        // logger.error('[usePlantingStore] 批量删除种植失败:', error);
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
        // logger.error('[usePlantingStore] 采收种植失败:', error);
        return false;
      }
    },

    // 2026-06-17: 采收记录
    loadHarvestRecords: async (plantingId) => {
      set({ harvestLoading: true });
      try {
        const records = await plantingService.getPlantingHarvestRecords(plantingId);
        set((s) => ({
          harvestRecords: { ...s.harvestRecords, [plantingId]: records },
          harvestLoading: false,
        }));
      } catch (error) {
        // logger.error('[usePlantingStore] 加载采收记录失败:', error);
        set({ harvestLoading: false });
      }
    },

    addHarvestRecord: async (plantingId, input) => {
      try {
        const record = await plantingService.addPlantingHarvestRecord(plantingId, input);
        if (record) {
          set((s) => ({
            harvestRecords: {
              ...s.harvestRecords,
              [plantingId]: [record, ...(s.harvestRecords[plantingId] || [])],
            },
          }));
        }
        return record;
      } catch (error) {
        // logger.error('[usePlantingStore] 添加采收记录失败:', error);
        return null;
      }
    },

    updateHarvestRecord: async (plantingId, recordId, input) => {
      try {
        const record = await plantingService.updatePlantingHarvestRecord(plantingId, recordId, input);
        if (record) {
          set((s) => ({
            harvestRecords: {
              ...s.harvestRecords,
              [plantingId]: (s.harvestRecords[plantingId] || []).map((r) => r.id === recordId ? record : r),
            },
          }));
        }
        return record;
      } catch (error) {
        // logger.error('[usePlantingStore] 更新采收记录失败:', error);
        return null;
      }
    },

    deleteHarvestRecord: async (plantingId, recordId) => {
      try {
        await plantingService.deletePlantingHarvestRecord(plantingId, recordId);
        set((s) => ({
          harvestRecords: {
            ...s.harvestRecords,
            [plantingId]: (s.harvestRecords[plantingId] || []).filter((r) => r.id !== recordId),
          },
        }));
        return true;
      } catch (error) {
        // logger.error('[usePlantingStore] 删除采收记录失败:', error);
        return false;
      }
    },

    // 2026-06-17: 总结束（软锁）— 调 PUT /:id
    endPlanting: async (id, options) => {
      try {
        await plantingService.endPlanting(id, {
          endType: options.endType,
          notes: options.notes,
        });
        // 乐观更新：status 字符串不强行映射到 enum，依赖下次 loadItems() 重新拉取并由 service normalize
        set((s) => ({
          items: s.items.map((i) =>
            i.id === id
              ? { ...i, status: options.status as unknown as Planting['status'], isHarvestLocked: true }
              : i
          ),
        }));
        return true;
      } catch (error) {
        // logger.error('[usePlantingStore] 结束种植失败:', error);
        return false;
      }
    },
  })
);
