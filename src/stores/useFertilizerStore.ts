/**
 * 施肥管理 Zustand Store
 * V10.0 新增 — 直连 enhancedApiClient
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========
export interface FertilizerData {
  id: string;
  fertilizerCode: string;
  farmTaskId?: string;
  productionPlanId?: string;
  productionPlanCode?: string;
  plantingId?: string;
  plantingCode?: string;
  greenhouseId?: string;
  greenhouseName: string;
  areaName?: string;
  cropName: string;
  cropVariety?: string;
  fertilizerName: string;
  fertilizerType: string;
  dilutionRatio: string;
  quantity: number;
  unit: string;
  unitPrice: number;
  totalCost: number;
  fertilizeTime: string;
  operatorId?: string;
  operatorName?: string;
  dataSource: 'manual' | 'auto_iot';
  iotDeviceId?: string;
  iotRecordId?: string;
  description?: string;
  status: string;
  createTime: string;
  updateTime: string;
}

// ========== FIELD_MAP ==========
const FIELD_MAP: Record<string, string> = {
  fertilizer_code: 'fertilizerCode',
  farm_task_id: 'farmTaskId',
  production_plan_id: 'productionPlanId',
  production_plan_code: 'productionPlanCode',
  planting_id: 'plantingId',
  planting_code: 'plantingCode',
  greenhouse_id: 'greenhouseId',
  greenhouse_name: 'greenhouseName',
  area_name: 'areaName',
  crop_name: 'cropName',
  crop_variety: 'cropVariety',
  fertilizer_name: 'fertilizerName',
  fertilizer_type: 'fertilizerType',
  dilution_ratio: 'dilutionRatio',
  quantity: 'quantity',
  unit: 'unit',
  unit_price: 'unitPrice',
  total_cost: 'totalCost',
  fertilize_time: 'fertilizeTime',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  data_source: 'dataSource',
  iot_device_id: 'iotDeviceId',
  iot_record_id: 'iotRecordId',
  description: 'description',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ========== 转换函数 ==========
function normalizeFertilizer(db: Record<string, unknown>): FertilizerData {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    result[camelKey] = db[dbKey] ?? null;
  }
  return result as FertilizerData;
}

function denormalizeFertilizer(item: Partial<FertilizerData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    reverseMap[camelKey] = dbKey;
  }
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    result[dbKey] = value;
  }
  return result;
}

// ========== Store 接口 ==========
interface FertilizerState {
  items: FertilizerData[];
  stats: any[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<FertilizerData | null>;
  createItem: (item: Partial<FertilizerData>) => Promise<FertilizerData | null>;
  updateItem: (id: string, updates: Partial<FertilizerData>) => Promise<FertilizerData | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  fetchStats: (filters?: Record<string, string>) => Promise<void>;
  ingestIotRecords: (deviceId: string, records: any[]) => Promise<any>;
  generateCode: () => Promise<string>;
}

// ========== Store 实现 ==========
export const useFertilizerStore = create<FertilizerState>()(
  persist(
    (set, get) => ({
      items: [],
      stats: [],
      isLoading: false,
      error: null,

      fetchItems: async (filters = {}) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
          const response = await enhancedApiClient.get<any>(`/fertilizer?${params.toString()}`);
          // enhancedApiClient 已解包 data，queryToObjects 已在服务端转 camelCase
          const rawItems = Array.isArray(response) ? response : response?.data ?? [];
          set({ items: rawItems as FertilizerData[], isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      fetchItemById: async (id: string) => {
        try {
          const response = await enhancedApiClient.get<any>(`/fertilizer/${id}`);
          // enhancedApiClient 已解包 data，queryToObjects 已在服务端转 camelCase
          return (response.data ?? response) as FertilizerData;
        } catch {
          return null;
        }
      },

      createItem: async (item) => {
        try {
          // denormalize: camelCase → snake_case（后端 req.body 期望 snake_case）
          const body = denormalizeFertilizer(item);
          const response = await enhancedApiClient.post('/fertilizer', body);
          // 响应：enhancedApiClient 已解包 data，queryToObjects 已转 camelCase
          const newItem = (response.data ?? response) as FertilizerData;
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (err) {
          set({ error: (err as Error).message });
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          const body = denormalizeFertilizer(updates);
          const response = await enhancedApiClient.put(`/fertilizer/${id}`, body);
          // 响应：enhancedApiClient 已解包 data，queryToObjects 已转 camelCase
          const updated = (response.data ?? response) as FertilizerData;
          set((state) => ({
            items: state.items.map((i) => (i.id === id ? updated : i)),
          }));
          return updated;
        } catch (err) {
          set({ error: (err as Error).message });
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          await enhancedApiClient.delete(`/fertilizer/${id}`);
          set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
          return true;
        } catch (err) {
          set({ error: (err as Error).message });
          return false;
        }
      },

      deleteItems: async (ids) => {
        try {
          const response = await enhancedApiClient.post('/fertilizer/batch-delete', { ids });
          const result = response.data ?? response;
          if (result.deleted > 0) {
            set((state) => ({ items: state.items.filter((i) => !ids.includes(i.id)) }));
          }
          return { deleted: result.deleted ?? 0, skipped: result.skipped ?? 0 };
        } catch (err) {
          set({ error: (err as Error).message });
          return { deleted: 0, skipped: ids.length };
        }
      },

      fetchStats: async (filters = {}) => {
        try {
          const params = new URLSearchParams();
          Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
          const response = await enhancedApiClient.get<any>(`/fertilizer/stats?${params.toString()}`);
          set({ stats: Array.isArray(response.data ?? response) ? response.data ?? response : [] });
        } catch (err) {
          set({ error: (err as Error).message });
        }
      },

      ingestIotRecords: async (deviceId, records) => {
        try {
          const response = await enhancedApiClient.post('/fertilizer/iot-ingest', {
            device_id: deviceId,
            device_name: `设备${deviceId}`,
            records,
          });
          return response.data ?? response;
        } catch (err) {
          set({ error: (err as Error).message });
          return null;
        }
      },

      generateCode: async () => {
        try {
          const response = await enhancedApiClient.get<any>('/fertilizer/generate-code');
          return (response.data ?? response)?.data?.code ?? (response.data ?? response)?.code ?? '';
        } catch {
          return '';
        }
      },
    }),
    {
      name: 'fertilizer-data-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
