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
  // 2026-07-24：多区域多作物时汇总所有作物名（JSON 字符串），与施肥记录一致
  cropNames?: string;
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
  crop_names: 'cropNames',
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
      // 2026-07-28 审核 H-12：改用通用 forEach 循环，避免硬编码字段（新增筛选字段被静默丢弃）
      const params = new URLSearchParams();
      Object.entries(filters).forEach(([k, v]) => {
        if (v != null && v !== '') params.append(k, String(v));
      });

      const url = `/watering${params.toString() ? `?${params}` : ''}`;
      // 2026-07-27 审核修复 C-2：enhancedApiClient 已解包 .data，信任其结果
      const items = (await enhancedApiClient.get(url)) as WateringData[];
      set({ items, isLoading: false });
    } catch (err: any) {
      // 2026-07-28 审核 H-11：与 useFertilizerStore 对齐，只 setError 不 throw（页面 useEffect 统一弹 toast，否则会在控制台报 unhandled promise rejection）
      set({ isLoading: false, error: err?.message || '加载浇水记录失败' });
    }
  },

  fetchItemById: async (id: string) => {
    return (await enhancedApiClient.get(`/watering/${id}`)) as WateringData;
  },

  createItem: async (item: Partial<WateringData>) => {
    // 直接发 camelCase（后端 Zod schema 期望 camelCase）— 参照 FertilizerStore 模式
    const newItem = (await enhancedApiClient.post('/watering', item)) as WateringData;
    set({ items: [newItem, ...get().items] });
    return newItem;
  },

  updateItem: async (id: string, updates: Partial<WateringData>) => {
    // 直接发 camelCase（后端 Zod schema 期望 camelCase）— 参照 FertilizerStore 模式
    const updated = (await enhancedApiClient.put(`/watering/${id}`, updates)) as WateringData;
    set({
      items: get().items.map((it) => (it.id === id ? updated : it)),
    });
    return updated;
  },

  deleteItem: async (id: string) => {
    try {
      await enhancedApiClient.delete(`/watering/${id}`);
      set({ items: get().items.filter((it) => it.id !== id) });
      return true;
    } catch (err: any) {
      // 2026-07-27 审核修复 H-9：与 useFertilizerStore.deleteItem 对齐，错误不冒泡
      set({ error: err?.message || '删除失败' });
      return false;
    }
  },

  deleteItems: async (ids: string[]) => {
    try {
      // 2026-07-28 审核 H-10：加 try/catch，与 useFertilizerStore.deleteItems 对齐，避免错误冒泡
      // 2026-07-27 审核修复 C-2：enhancedApiClient 已解包，return 结构化结果而非 raw
      // 2026-07-28 审核 C-4：移除内部 fetchItems()，避免丢失筛选条件。改由调用方（FertilizerPage）显式按筛选 refetch，与 useFertilizerStore 对齐
      const result = (await enhancedApiClient.post('/watering/batch-delete', { ids })) as {
        deleted?: number; skipped?: number;
      };
      return {
        deleted: result?.deleted ?? 0,
        skipped: result?.skipped ?? 0,
      };
    } catch (err: any) {
      set({ error: err?.message || '批量删除浇水记录失败' });
      return { deleted: 0, skipped: ids.length };
    }
  },

  generateCode: async () => {
    // 2026-07-27 审核修复 C-2：enhancedApiClient 已解包；generate-code 响应也是 {data:{code:'...'}}
    const result = (await enhancedApiClient.get('/watering/generate-code')) as { code?: string };
    return result?.code || '';
  },
}));