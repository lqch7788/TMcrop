/**
 * 浇水记录 Store (Zustand)
 * 2026-07-20：Phase 1 - 独立浇水记录 CRUD
 *
 * 参照 useFertilizerStore 实现风格（FIELD_MAP + normalize/denormalize + enhancedApiClient）
 * 设计文档：docs/superpowers/specs/2026-07-20-water-fertilizer-design.md §5.8
 */

import { create } from 'zustand';
import { enhancedApiClient } from '@/lib/apiClient';

export interface WateringData {
  id: string;
  waterCode: string;
  recordType: 'manual' | 'fertilizer_dilution' | 'daily_sync';
  fertilizerRecordId?: string;
  sourceDailyRecordId?: string;
  cropName: string;
  cropVariety?: string;
  greenhouseId?: string;
  greenhouseName: string;
  areaId?: string;
  areaName?: string;
  plantingId?: string;
  plantingCode?: string;
  seedlingId?: string;
  seedlingCode?: string;
  waterPool?: string; // JSON 字符串
  totalWater: number;
  waterUnit: string;
  waterCost?: number;
  waterTime: string;
  operatorId?: string;
  operatorName?: string;
  dataSource: 'manual' | 'auto_iot';
  iotDeviceId?: string;
  description?: string;
  status: string;
  createTime: string;
  updateTime: string;
}

/** 数据库 snake_case → 前端 camelCase 字段映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  water_code: 'waterCode',
  record_type: 'recordType',
  fertilizer_record_id: 'fertilizerRecordId',
  source_daily_record_id: 'sourceDailyRecordId',
  crop_name: 'cropName',
  crop_variety: 'cropVariety',
  greenhouse_id: 'greenhouseId',
  greenhouse_name: 'greenhouseName',
  area_id: 'areaId',
  area_name: 'areaName',
  planting_id: 'plantingId',
  planting_code: 'plantingCode',
  seedling_id: 'seedlingId',
  seedling_code: 'seedlingCode',
  water_pool: 'waterPool',
  total_water: 'totalWater',
  water_unit: 'waterUnit',
  water_cost: 'waterCost',
  water_time: 'waterTime',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  data_source: 'dataSource',
  iot_device_id: 'iotDeviceId',
  description: 'description',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 数据库行（snake_case）→ WateringData（camelCase） */
function normalizeWatering(row: Record<string, any>): WateringData {
  const result: Record<string, any> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    if (row[dbKey] !== undefined) {
      result[jsKey] = row[dbKey];
    }
  }
  return result as WateringData;
}

/** WateringData（camelCase）→ 数据库行（snake_case） */
function denormalizeWatering(data: Partial<WateringData>): Record<string, any> {
  const result: Record<string, any> = {};
  for (const [dbKey, jsKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey as keyof WateringData] !== undefined) {
      result[dbKey] = data[jsKey as keyof WateringData];
    }
  }
  return result;
}

interface WateringStoreState {
  items: WateringData[];
  isLoading: boolean;
  error: string | null;

  // Actions
  clearError: () => void;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<WateringData>;
  createItem: (item: Partial<WateringData>) => Promise<WateringData>;
  updateItem: (id: string, updates: Partial<WateringData>) => Promise<WateringData>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  generateCode: () => Promise<string>;
}

export const useWateringStore = create<WateringStoreState>((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  fetchItems: async (filters = {}) => {
    set({ isLoading: true, error: null });
    try {
      const params = new URLSearchParams();
      if (filters.recordType) params.append('recordType', filters.recordType);
      if (filters.cropName) params.append('cropName', filters.cropName);
      if (filters.greenhouseName) params.append('greenhouseName', filters.greenhouseName);
      if (filters.operatorName) params.append('operatorName', filters.operatorName);
      if (filters.startDate) params.append('startDate', filters.startDate);
      if (filters.endDate) params.append('endDate', filters.endDate);
      if (filters.page) params.append('page', filters.page);
      if (filters.pageSize) params.append('pageSize', filters.pageSize);

      const url = `/watering${params.toString() ? `?${params}` : ''}`;
      const response: any = await enhancedApiClient.get(url);
      const items = Array.isArray(response) ? response : Array.isArray(response?.data) ? response.data : [];
      const normalized = items.map(normalizeWatering);
      set({ items: normalized, isLoading: false });
    } catch (err: any) {
      set({ isLoading: false, error: err?.message || '加载浇水记录失败' });
      throw err;
    }
  },

  fetchItemById: async (id: string) => {
    const response: any = await enhancedApiClient.get(`/watering/${id}`);
    const raw = response?.data ?? response;
    return normalizeWatering(raw);
  },

  createItem: async (item: Partial<WateringData>) => {
    const payload = denormalizeWatering(item);
    const response: any = await enhancedApiClient.post('/watering', payload);
    const raw = response?.data ?? response;
    const newItem = normalizeWatering(raw);
    set({ items: [newItem, ...get().items] });
    return newItem;
  },

  updateItem: async (id: string, updates: Partial<WateringData>) => {
    const payload = denormalizeWatering(updates);
    const response: any = await enhancedApiClient.put(`/watering/${id}`, payload);
    const raw = response?.data ?? response;
    const updated = normalizeWatering(raw);
    set({
      items: get().items.map((it) => (it.id === id ? updated : it)),
    });
    return updated;
  },

  deleteItem: async (id: string) => {
    await enhancedApiClient.delete(`/watering/${id}`);
    set({ items: get().items.filter((it) => it.id !== id) });
    return true;
  },

  deleteItems: async (ids: string[]) => {
    const response: any = await enhancedApiClient.post('/watering/batch-delete', { ids });
    const raw = response?.data ?? response;
    // 刷新列表（删除的可能不在当前 items 中）
    await get().fetchItems();
    return raw;
  },

  generateCode: async () => {
    const response: any = await enhancedApiClient.get('/watering/generate-code');
    const raw = response?.data ?? response;
    return raw?.code || '';
  },
}));