/**
 * 施肥管理 Zustand Store (V2.1 架构 - 已简化)
 * 直连 enhancedApiClient
 */
import { create } from 'zustand';
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
  // 2026-07-05: seedling 关联（与 planting 二选一，互斥）
  seedlingId?: string;
  seedlingCode?: string;
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
  /** G11 V1.1：关联肥料库 id（外键到 fertilizer_library.id），老数据可空 */
  fertilizerId?: string | null;
  // 2026-07-12：施肥区域池（JSON 字符串，每条独立 [type, code, area, quantity, unit, dilutionRatio]）
  fertilizationPool?: string;
  // 2026-07-12 重构：spec 快照字段（参考后端 schema）
  specId?: string;
  specBatchNumber?: string;
  specUnitPriceSnapshot?: number;
  specBrandName?: string;
  // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
  cropNames?: string;
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
  // G11 V1.1：关联肥料库 id 映射
  fertilizer_id: 'fertilizerId',
  // 2026-07-12：施肥区域池
  fertilization_pool: 'fertilizationPool',
  // 2026-07-16：spec 快照字段映射（对齐后端 schema spec_id/spec_batch_number/spec_unit_price_snapshot/spec_brand_name）
  spec_id: 'specId',
  spec_batch_number: 'specBatchNumber',
  spec_unit_price_snapshot: 'specUnitPriceSnapshot',
  spec_brand_name: 'specBrandName',
  // 2026-07-20：多作物名 JSON 数组（支持跨作物批量施肥）
  crop_names: 'cropNames',
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
  isLoading: boolean;
  error: string | null;

  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<FertilizerData | null>;
  createItem: (item: Partial<FertilizerData>) => Promise<FertilizerData | null>;
  updateItem: (id: string, updates: Partial<FertilizerData>) => Promise<FertilizerData | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<{ deleted: number; skipped: number }>;
  /** 2026-07-16：失败时抛错（修 silent failure：返回 '' 让 AddModal 静默吞错） */
  generateCode: () => Promise<string>;
}

// ========== Store 实现 ==========
export const useFertilizerStore = create<FertilizerState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/fertilizer?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        set({ items: rawItems as FertilizerData[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      // 2026-07-16：失败时抛错（修 silent failure），调用方负责 toString + toast
      const response = await enhancedApiClient.get<any>(`/fertilizer/${id}`);
      return (response.data ?? response) as FertilizerData;
    },

    createItem: async (item) => {
      try {
        // 直接发 camelCase（后端 Zod schema 期望 camelCase，camelCaseRequestMiddleware 未注册）
        const response = await enhancedApiClient.post('/fertilizer', item);
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
        // 直接发 camelCase（与 createItem 一致）
        const response = await enhancedApiClient.put(`/fertilizer/${id}`, updates);
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

    generateCode: async () => {
      // 2026-07-16：失败时抛错（修 silent failure），AddModal 检测到抛错就 toast "编号生成失败请重试或手动输入"
      const response = await enhancedApiClient.get<any>('/fertilizer/generate-code');
      const payload = response.data ?? response;
      return payload?.data?.code ?? payload?.code ?? '';
    },
  })
);
