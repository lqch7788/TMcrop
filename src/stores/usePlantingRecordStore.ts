/**
 * 种植季记录 Store (V2.1 架构 - 已简化)
 * 统一管理种植季记录的增删改查
 *
 * @deprecated 2026-07-25：planting_records 表已弃用（plan 2026-07-25-zone-planting-info-ownership）。
 * 写入请改用 plantings / seedlings 表（在 /crop/planting 和 /crop/seedling 页面）。
 * 本 store 仅保留 GET 读能力兼容历史数据，所有写 action 已改为 throw DEPRECATED。
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
      // 2026-07-25 DEPRECATED：planting_records 表已弃用。请改用 /crop/planting 页面写 plantings 表。
      set({ loading: false });
      throw new Error('DEPRECATED: planting_records 表已弃用，请到「种植管理」页面操作 plantings 表');
    },

    editRecord: async (oid, data) => {
      // 2026-07-25 DEPRECATED
      set({ loading: false });
      throw new Error('DEPRECATED: planting_records 表已弃用');
    },

    endSeason: async (oid, data) => {
      // 2026-07-25 DEPRECATED
      set({ loading: false });
      throw new Error('DEPRECATED: planting_records 表已弃用');
    },

    removeRecord: async (oid) => {
      // 2026-07-25 DEPRECATED
      set({ loading: false });
      throw new Error('DEPRECATED: planting_records 表已弃用');
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
