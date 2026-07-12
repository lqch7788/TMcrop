/**
 * 药剂知识库 Store（V2 扁平化 2026-07-12）
 * 从「主表 PesticideLibrary + 嵌套 specs[]」重构为单一扁平 PesticideSpec（26 字段）
 * 对齐肥料库 FertilizerSpec 扁平模式
 * API 路径：/api/pesticide-library（后端已重写为扁平 CRUD）
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// 扁平药剂规格（单一实体，26 字段），取代旧的主表 + 嵌套 spec 两层结构
export interface PesticideSpec {
  id: string;
  pesticideCode: string;
  pesticideName: string;
  pesticideTypes?: string[];       // 药剂类型 JSON 数组（如 ["insecticide","fungicide"]）
  ingredient?: string;             // 药剂成分
  mechanism?: string;              // 作用机制
  functionDesc?: string;           // 功能说明
  tabooDesc?: string;              // 使用禁忌
  targetPests?: string;            // 防治对象
  specContent?: string;            // 含量（如 "50%"）
  formulation?: string;            // 剂型
  manufacturer?: string;           // 生产厂家
  brandName?: string;              // 品牌名称
  suggestedDosage?: string;        // 建议用量
  suggestedRatio?: string;         // 稀释比例
  dosageUnit?: string;             // 用量单位
  remark?: string;                 // 备注
  // 2026-07-12：库存字段（对齐肥料库）
  stockQuantity?: number;
  stockUnit?: string;
  unitPrice?: number;
  batchNumber?: string;
  productionDate?: string;
  expirationDate?: string;
  packageSpec?: string;
  status: string;
  createTime: string;
  updateTime: string;
}

// 字段映射表（后端 snake_case → 前端 camelCase），覆盖全部 26 字段
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  pesticide_code: 'pesticideCode',
  pesticide_name: 'pesticideName',
  pesticide_type: 'pesticideTypes',
  ingredient: 'ingredient',
  mechanism: 'mechanism',
  function_desc: 'functionDesc',
  taboo_desc: 'tabooDesc',
  target_pests: 'targetPests',
  spec_content: 'specContent',
  formulation: 'formulation',
  manufacturer: 'manufacturer',
  brand_name: 'brandName',
  suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio',
  dosage_unit: 'dosageUnit',
  remark: 'remark',
  stock_quantity: 'stockQuantity',
  stock_unit: 'stockUnit',
  unit_price: 'unitPrice',
  batch_number: 'batchNumber',
  production_date: 'productionDate',
  expiration_date: 'expirationDate',
  package_spec: 'packageSpec',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/**
 * JSON 数组 ↔ 字符串数组转换
 * - DB 中 pesticide_type 是 JSON 字符串如 '["insecticide","fungicide_fungi"]'
 * - 前端用 string[] 形式
 */
function parsePesticideTypes(value: unknown): string[] {
  if (Array.isArray(value)) return value.filter((x): x is string => typeof x === 'string');
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return value ? [value] : [];
    }
  }
  return [];
}

function stringifyPesticideTypes(types: string[] | undefined | null): string | null {
  if (!types || types.length === 0) return null;
  return JSON.stringify(types);
}

// 规范化：DB 行 → 前端对象
function normalize(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    if (camelKey === 'pesticideTypes') {
      result[camelKey] = parsePesticideTypes(row[dbKey]);
    } else {
      result[camelKey] = row[dbKey] ?? null;
    }
  }
  return result;
}

// 反规范化：前端对象 → DB 行
function denormalize(item: Partial<PesticideSpec>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) reverseMap[camelKey] = dbKey;
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    if (camelKey === 'pesticideTypes') {
      result[dbKey] = stringifyPesticideTypes(value as string[] | undefined | null);
    } else {
      result[dbKey] = value;
    }
  }
  return result;
}

interface PesticideLibraryState {
  items: PesticideSpec[];
  isLoading: boolean;
  error: string | null;
  /** 手动清空 error 状态 */
  clearError: () => void;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<PesticideSpec | null>;
  createItem: (item: Partial<PesticideSpec>) => Promise<PesticideSpec | null>;
  updateItem: (id: string, updates: Partial<PesticideSpec>) => Promise<PesticideSpec | null>;
  deleteItem: (id: string) => Promise<boolean>;
  /** 入库：增加指定 spec 的库存量 */
  stockIn: (id: string, quantity: number, remark?: string) => Promise<number | null>;
}

export const usePesticideLibraryStore = create<PesticideLibraryState>()(
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
        const response = await enhancedApiClient.get<PesticideSpec[] | { data: PesticideSpec[] }>(
          `/pesticide-library?${params.toString()}`
        );
        const rawItems: PesticideSpec[] = Array.isArray(response)
          ? response
          : (response as { data: PesticideSpec[] })?.data ?? [];
        // camelCase 中间件把 pesticide_type 转成 pesticideType（单数），需兼容
        const normalized = rawItems.map((row: any) => {
          const rawType = row.pesticideType || row.pesticide_type;
          if (!Array.isArray(row.pesticideTypes) && rawType) {
            row.pesticideTypes = parsePesticideTypes(rawType);
          }
          return row as PesticideSpec;
        });
        set({ items: normalized, isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response: any = await enhancedApiClient.get(`/pesticide-library/${id}`);
        const item = (response?.data ?? response) as Record<string, unknown>;
        const rawType = item.pesticideType || item.pesticide_type;
        if (!Array.isArray(item.pesticideTypes) && rawType) {
          item.pesticideTypes = parsePesticideTypes(rawType);
        }
        return item as PesticideSpec;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item);
        const response: any = await enhancedApiClient.post('/pesticide-library', body);
        // enhancedApiClient 已解包 .data 并返回 camelCase，直接使用
        const newItem = (response?.data ?? response) as PesticideSpec;
        set((state) => ({ items: [newItem, ...state.items] }));
        return newItem;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const body = denormalize(updates);
        const response: any = await enhancedApiClient.put(`/pesticide-library/${id}`, body);
        // enhancedApiClient 已解包 .data 并返回 camelCase，直接使用
        const updated = (response?.data ?? response) as PesticideSpec;
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? { ...i, ...updated } : i)),
        }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/pesticide-library/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    stockIn: async (id, quantity, remark) => {
      try {
        const response = await enhancedApiClient.post<{ newStock?: number }>(
          `/pesticide-library/${id}/stock-in`,
          { quantity, remark }
        );
        // enhancedApiClient 已解包 .data
        const newStock = response?.newStock;
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
  })
);
