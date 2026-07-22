/**
 * 肥料知识库 Store（V2 扁平结构）
 * 2026-07-12：从「主表 FertilizerLibrary + 嵌套 specs[]」重构为单一扁平 FertilizerSpec（28 字段）
 * API 路径：/api/fertilizer-specs
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// 2026-07-16：保留旧别名 FertilizerLibrary 兼容 settings 页面（useState<FertilizerLibrary> 6 处引用）
export type FertilizerLibrary = FertilizerSpec;

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
  // 2026-07-12：包装规格（如 50kg/包、5kg/桶）
  packageSpec?: string;
  // 2026-07-12：库存单位（kg/g/t/L/mL/袋/包/桶/瓶/块 等）
  stockUnit?: string;
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
  package_spec: 'packageSpec',  // 2026-07-12：包装规格
  stock_unit: 'stockUnit',      // 2026-07-12：库存单位
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
  /** 入库：增加指定 spec 的库存量 */
  stockIn: (id: string, quantity: number, remark?: string) => Promise<number | null>;
  // 2026-07-22：使用记录 API（C9 修复：组件不再绕过 store 直接 fetch）
  fetchUsageRecords: (specId: string) => Promise<any[]>;
  deleteUsageRecord: (usageId: string, source: string) => Promise<boolean>;
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
        const response = await enhancedApiClient.get<FertilizerSpec[] | { data: FertilizerSpec[] }>(`/fertilizer-specs?${params.toString()}`);
        const rawItems: FertilizerSpec[] = Array.isArray(response) ? response : (response as { data: FertilizerSpec[] })?.data ?? [];
        set({ items: rawItems, isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        // enhancedApiClient 已解包 .data 并返回 camelCase 对象，直接使用
        const response: any = await enhancedApiClient.get(`/fertilizer-specs/${id}`);
        return ((response as any)?.data ?? response) as FertilizerSpec;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item, FIELD_MAP);
        const response: any = await enhancedApiClient.post('/fertilizer-specs', body);
        // enhancedApiClient 已解包 .data 并返回 camelCase 对象，直接使用
        const newItem = (response?.data ?? response) as FertilizerSpec;
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
        const response: any = await enhancedApiClient.put(`/fertilizer-specs/${id}`, body);
        // enhancedApiClient 已解包 .data 并返回 camelCase 对象，直接使用
        const updated = (response?.data ?? response) as FertilizerSpec;
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

    stockIn: async (id, quantity, remark) => {
      try {
        const response = await enhancedApiClient.post<{ newStock?: number }>(`/fertilizer-specs/${id}/stock-in`, { quantity, remark });
        // enhancedApiClient 已解包 .data，response 即为 spec 对象 + newStock
        const newStock = response?.newStock;
        // 更新本地列表中的库存
        if (newStock != null) {
          set((state) => ({
            items: state.items.map((i) =>
              i.id === id ? { ...i, stockQuantity: newStock } : i
            ),
          }));
        }
        return newStock;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    // 2026-07-22：使用记录 — 替代组件内直接调 enhancedApiClient，遵守 V2.1 铁律
    fetchUsageRecords: async (specId: string) => {
      try {
        const response: any = await enhancedApiClient.get(`/pest-records/by-spec/${specId}`);
        return Array.isArray(response) ? response : (response?.data ?? []);
      } catch (err) {
        set({ error: (err as Error).message });
        return [];
      }
    },

    // 2026-07-22：删除单条使用记录（按 source 路由到不同表）
    deleteUsageRecord: async (usageId: string, source: string) => {
      try {
        const url = source === 'fertilization'
          ? `/fertilizer/${usageId}`
          : `/pest-records/${usageId}`;
        await enhancedApiClient.delete(url);
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },
  })
);
