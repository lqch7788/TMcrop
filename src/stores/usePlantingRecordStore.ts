/**
 * 种植季记录 Store (V2.1 架构 - 已简化)
 * 统一管理种植季记录的增删改查
 *
 * 2026-09-20：恢复 planting_records 表的写能力（用户选 A 方案）。
 *   之前 2026-07-25 标记为 DEPRECATED 并 throw，现在恢复 add/edit/end/remove 走真实 API。
 *   /crop/planting 页面的种植记录仍推荐用 plantings 表，但 planting_records 表作为
 *   基地运营中心的"zone/block 种植信息"载体继续保留。
 */
import { create } from 'zustand';
import {
  getPlantingRecords, getPlantingRecord, createPlantingRecord,
  updatePlantingRecord, endPlantingSeason, deletePlantingRecord,
  type PlantingRecord, type PlantingRecordQuery,
} from '../services/apiPlantingRecordService';

interface PlantingRecordStore {
  records: PlantingRecord[];
  loading: boolean;
  error: string | null;

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
  (set, get) => ({
    records: [],
    loading: false,
    error: null,

    loadRecords: async (query?: PlantingRecordQuery) => {
      set({ loading: true, error: null });
      try {
        const data = await getPlantingRecords(query);
        set({ records: data, loading: false });
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '加载种植季记录失败', loading: false });
      }
    },

    addRecord: async (data) => {
      set({ loading: true, error: null });
      try {
        const record = await createPlantingRecord(data as any);
        await get().loadRecords();
        return record;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '创建种植季失败', loading: false });
        throw error;
      }
    },

    editRecord: async (oid, data) => {
      set({ loading: true, error: null });
      try {
        await updatePlantingRecord(oid, data);
        await get().loadRecords();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '更新种植季失败', loading: false });
        throw error;
      }
    },

    endSeason: async (oid, data) => {
      set({ loading: true, error: null });
      try {
        const record = await endPlantingSeason(oid, data);
        await get().loadRecords();
        return record;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '结束种植季失败', loading: false });
        throw error;
      }
    },

    removeRecord: async (oid) => {
      set({ loading: true, error: null });
      try {
        await deletePlantingRecord(oid);
        await get().loadRecords();
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '删除种植季失败', loading: false });
        throw error;
      }
    },

    refreshRecords: async () => {
      await get().loadRecords();
    },
  })
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
