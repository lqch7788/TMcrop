/**
 * 肥料知识库 Store（V2 扁平结构）
 * 2026-07-12：从「主表 FertilizerLibrary + 嵌套 specs[]」重构为单一扁平 FertilizerSpec（25 字段）
 * API 路径：/api/fertilizer-specs
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// 扁平肥料规格（单一实体，25 字段），取代旧的主表 + 嵌套 spec 两层结构
export interface FertilizerSpec {
  id: string;
  fertilizerCode: string;
  fertilizerName: string;
  fertilizerType?: string;
  applicationTiming?: string;
  functionDesc?: string;
  tabooDesc?: string;
  shelfLife?: string;
  storageCondition?: string;
  supplierInfo?: string;
  brandName?: string;
  specContent?: string;
  manufacturer?: string;
  suggestedDosage?: string;
  suggestedRatio?: string;
  dosageUnit?: string;
  remark?: string;
  unitPrice?: number;
  batchNumber?: string;
  productionDate?: string;
  expirationDate?: string;
  stockQuantity?: number;
  status: string;
  createTime: string;
  updateTime: string;
}

// 字段映射表（后端 snake_case → 前端 camelCase），覆盖全部 25 列
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  fertilizer_code: 'fertilizerCode',
  fertilizer_name: 'fertilizerName',
  fertilizer_type: 'fertilizerType',
  application_timing: 'applicationTiming',
  function_desc: 'functionDesc',
  taboo_desc: 'tabooDesc',
  shelf_life: 'shelfLife',
  storage_condition: 'storageCondition',
  supplier_info: 'supplierInfo',
  brand_name: 'brandName',
  spec_content: 'specContent',
  manufacturer: 'manufacturer',
  suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio',
  dosage_unit: 'dosageUnit',
  remark: 'remark',
  unit_price: 'unitPrice',
  batch_number: 'batchNumber',
  production_date: 'productionDate',
  expiration_date: 'expirationDate',
  stock_quantity: 'stockQuantity',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// 规范化：DB 行 → 前端对象
function normalize(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) {
    result[camelKey] = data[dbKey] ?? null;
  }
  return result;
}

// 反规范化：前端对象 → DB 行
function denormalize(item: Partial<FertilizerSpec>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) reverseMap[camelKey] = dbKey;
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    result[dbKey] = value;
  }
  return result;
}

interface FertilizerLibraryState {
  items: FertilizerSpec[];
  isLoading: boolean;
  error: string | null;
  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<FertilizerSpec | null>;
  createItem: (item: Partial<FertilizerSpec>) => Promise<FertilizerSpec | null>;
  updateItem: (id: string, updates: Partial<FertilizerSpec>) => Promise<FertilizerSpec | null>;
  deleteItem: (id: string) => Promise<boolean>;
}

export const useFertilizerLibraryStore = create<FertilizerLibraryState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    clearError: () => set({ error: null }),

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append('limit', '10000');
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/fertilizer-specs?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        set({ items: rawItems as FertilizerSpec[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/fertilizer-specs/${id}`);
        return (response.data ?? response) as FertilizerSpec;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item, FIELD_MAP);
        const response = await enhancedApiClient.post('/fertilizer-specs', body);
        const newItem = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as FertilizerSpec;
        set((state) => ({ items: [newItem, ...state.items] }));
        return newItem;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const body = denormalize(updates, FIELD_MAP);
        const response = await enhancedApiClient.put(`/fertilizer-specs/${id}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as FertilizerSpec;
        set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, ...updated } : i)) }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/fertilizer-specs/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },
  })
);
