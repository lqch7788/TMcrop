/**
 * 种植季记录 Store - Zustand 状态管理（基地空间架构 V1.0）
 * 统一管理种植季记录的增删改查
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getPlantingRecords, getPlantingRecord, createPlantingRecord,
  updatePlantingRecord, endPlantingSeason, deletePlantingRecord,
  type PlantingRecord, type PlantingRecordQuery,
} from '../services/apiPlantingRecordService';

interface PlantingRecordStore {
  records: PlantingRecord[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadRecords: (query?: PlantingRecordQuery) => Promise<void>;
  addRecord: (data: {
    facility_oid: string; block_oid?: string; crop_variety_oid?: string;
    crop_name: string; variety_name?: string; start_date?: string; notes?: string;
  }) => Promise<PlantingRecord>;
  editRecord: (oid: string, data: Record<string, any>) => Promise<void>;
  endSeason: (oid: string, data: {
    end_date: string; yield_amount?: number; yield_unit?: string;
    quality_grade?: string; notes?: string;
  }) => Promise<PlantingRecord>;
  removeRecord: (oid: string) => Promise<void>;
  refreshRecords: () => Promise<void>;
}

export const usePlantingRecordStore = create<PlantingRecordStore>()(
  persist(
    (set, get) => ({
      records: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadRecords: async (query?: PlantingRecordQuery) => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().records.length > 0 && !query) return;

        set({ loading: true, error: null });
        try {
          const data = await getPlantingRecords(query);
          set({ records: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载种植季记录失败', loading: false });
        }
      },

      addRecord: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createPlantingRecord(data);
          set((s) => ({ records: [created, ...s.records], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建种植季记录失败', loading: false });
          throw error;
        }
      },

      editRecord: async (oid, data) => {
        set({ loading: true, error: null });
        try {
          const updated = await updatePlantingRecord(oid, data);
          set((s) => ({
            records: s.records.map((r) => r.oid === oid ? updated : r),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新种植季记录失败', loading: false });
          throw error;
        }
      },

      endSeason: async (oid, data) => {
        set({ loading: true, error: null });
        try {
          const result = await endPlantingSeason(oid, data);
          set((s) => ({
            records: s.records.map((r) => r.oid === oid ? result : r),
            loading: false,
          }));
          return result;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '结束种植季失败', loading: false });
          throw error;
        }
      },

      removeRecord: async (oid) => {
        set({ loading: true, error: null });
        try {
          await deletePlantingRecord(oid);
          set((s) => ({ records: s.records.filter((r) => r.oid !== oid), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除种植季记录失败', loading: false });
          throw error;
        }
      },

      refreshRecords: async () => {
        set({ lastFetch: null });
        await get().loadRecords();
      },
    }),
    {
      name: 'planting_record_store',
      partialize: (state) => ({ records: state.records }),
    }
  )
);

/** 根据 oid 获取记录 */
export const getRecordByOid = (oid: string): PlantingRecord | undefined => {
  return usePlantingRecordStore.getState().records.find(r => r.oid === oid);
};

/** 根据设施 oid 获取种植季记录 */
export const getRecordsByFacility = (facilityOid: string): PlantingRecord[] => {
  return usePlantingRecordStore.getState().records.filter(r => r.facilityOid === facilityOid);
};

/** 根据状态筛选记录 */
export const getRecordsByStatus = (status: string): PlantingRecord[] => {
  return usePlantingRecordStore.getState().records.filter(r => r.status === status);
};

/** 获取活跃种植季（状态为 planting） */
export const getActivePlantingRecords = (): PlantingRecord[] => {
  return usePlantingRecordStore.getState().records.filter(r => r.status === 'planting');
};
