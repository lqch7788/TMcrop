/**
 * 种植管理 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 */
import { create } from 'zustand';
import { Planting, PlantingHarvestRecord, PlantingDailyRecord } from '../types/crop';
import * as plantingService from '../services/apiPlantingService';
import type { AddHarvestRecordInput } from '../services/apiPlantingService';
import * as plantingDailyRecordService from '../services/apiPlantingDailyRecordService';

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
  // 2026-06-25: attritionRate 透传（采收后自动计算写回 plantings.attrition_rate）
  harvestPlanting: (id: string, harvestDate: string, harvestCount?: number, attritionRate?: number) => Promise<boolean>;

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
      endType: 'harvest' | 'circulate' | 'self_seed' | 'dispose';
      notes?: string;
    }
  ) => Promise<boolean>;

  // 2026-06-28: 每日记录 actions（与育苗一致，简化版无母株/小苗双池）
  addDailyRecord: (plantingId: string, record: Omit<PlantingDailyRecord, 'id' | 'plantingId'>) => Promise<PlantingDailyRecord | null>;
  updateDailyRecord: (plantingId: string, recordId: string, updates: Partial<PlantingDailyRecord>) => Promise<boolean>;
  deleteDailyRecord: (plantingId: string, recordId: string) => Promise<boolean>;
}

export const usePlantingStore = create<PlantingState>()(
  (set, get) => ({
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
        set({ error: (error as Error).message || '添加种植失败' });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await plantingService.updatePlanting(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        set({ error: (error as Error).message || '更新种植失败' });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await plantingService.deletePlanting(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        set({ error: (error as Error).message || '删除种植失败' });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await plantingService.deletePlantings(ids);
        if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return result;
      } catch (error) {
        set({ error: (error as Error).message || '批量删除种植失败' });
        return false;
      }
    },

    harvestPlanting: async (id, harvestDate, harvestCount, attritionRate) => {
      try {
        const result = await plantingService.harvestPlanting(id, harvestDate, harvestCount, attritionRate);
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
        set({ error: (error as Error).message || '采收种植失败' });
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
        set({ error: (error as Error).message || '加载采收记录失败', harvestLoading: false });
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
        set({ error: (error as Error).message || '添加采收记录失败' });
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
        set({ error: (error as Error).message || '更新采收记录失败' });
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
      } catch (error: any) {
        // 2026-07-03：不设置全局 error（避免触发右上角 toast）
        // 错误信息透传给前端 handleDelete 在弹窗内显示固定面板
        const err = new Error(error?.message || '删除采收记录失败') as Error & {
          blockingRecords?: any[];
          blockingTransactions?: any[];
        };
        if (error?.blockingRecords) err.blockingRecords = error.blockingRecords;
        if (error?.blockingTransactions) err.blockingTransactions = error.blockingTransactions;
        throw err;
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
        set({ error: (error as Error).message || '结束种植失败' });
        return false;
      }
    },

    // 2026-06-28: 每日记录 actions（与育苗一致；数量变化通过 service 自动累加到主表）
    addDailyRecord: async (plantingId, record) => {
      try {
        const result = await plantingDailyRecordService.addPlantingDailyRecord(plantingId, record);
        if (result) {
          // 主表 loss_count / supplement_count 已变更，重新加载列表
          await get().loadItems();
        }
        return result;
      } catch (error) {
        set({ error: (error as Error).message || '添加每日记录失败' });
        return null;
      }
    },

    updateDailyRecord: async (plantingId, recordId, updates) => {
      try {
        const success = await plantingDailyRecordService.updatePlantingDailyRecord(plantingId, recordId, updates);
        if (success) {
          await get().loadItems();
        }
        return success;
      } catch (error) {
        set({ error: (error as Error).message || '更新每日记录失败' });
        return false;
      }
    },

    deleteDailyRecord: async (plantingId, recordId) => {
      try {
        const success = await plantingDailyRecordService.deletePlantingDailyRecord(plantingId, recordId);
        if (success) {
          await get().loadItems();
        }
        return success;
      } catch (error) {
        set({ error: (error as Error).message || '删除每日记录失败' });
        return false;
      }
    },
  })
);
