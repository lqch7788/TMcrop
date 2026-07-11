/**
 * 药剂知识库 Store (V12.0)
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface PesticideSpec {
  id: string;
  pesticideId: string;
  specContent?: string;
  formulation?: string;
  manufacturer?: string;
  suggestedDosage?: string;
  suggestedRatio?: string;
  dosageUnit?: string;
  mechanism?: string; // 作用机制
  brandName?: string; // 品牌名称
  remark?: string; // 备注
  status: string;
  createTime: string;
}

export interface PesticideLibrary {
  id: string;
  pesticideCode: string;
  pesticideName: string;
  functionDesc?: string;
  tabooDesc?: string;
  targetPests?: string;
  ingredient?: string; // 药剂成分
  mechanism?: string; // 作用机制
  // 2026-07-10：药剂类型数组（关联 pesticide_type 字典：杀虫剂/杀菌剂/除草剂/杀螨剂/杀线虫剂 等）
  // 支持多值 + 层级化：同一药剂可同时属于多种类型，如 ["insecticide","fungicide_fungi"]
  pesticideTypes?: string[];
  status: string;
  createTime: string;
  updateTime: string;
  specs?: PesticideSpec[];
}

export interface PestDiseaseForRelation {
  id: string;
  dictCode: string;
  dictName: string;
  dictType: 'pest' | 'disease';
  targetCrops?: string;
  description?: string;
}

interface PesticideLibraryState {
  items: PesticideLibrary[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<PesticideLibrary | null>;
  createItem: (item: Partial<PesticideLibrary>) => Promise<PesticideLibrary | null>;
  updateItem: (id: string, updates: Partial<PesticideLibrary>) => Promise<PesticideLibrary | null>;
  deleteItem: (id: string) => Promise<boolean>;
  createSpec: (pesticideId: string, spec: Partial<PesticideSpec>) => Promise<PesticideSpec | null>;
  updateSpec: (specId: string, spec: Partial<PesticideSpec>) => Promise<PesticideSpec | null>;
  deleteSpec: (specId: string) => Promise<boolean>;
  fetchRelatedPests: (pesticideId: string) => Promise<PestDiseaseForRelation[]>;
  updateRelations: (pesticideId: string, pestIds: string[]) => Promise<boolean>;
  removeRelation: (pesticideId: string, pestId: string) => Promise<boolean>;
}

const FIELD_MAP: Record<string, string> = {
  id: 'id', pesticide_code: 'pesticideCode', pesticide_name: 'pesticideName',
  function_desc: 'functionDesc', taboo_desc: 'tabooDesc',
  target_pests: 'targetPests', ingredient: 'ingredient', mechanism: 'mechanism',
  // 2026-07-10：pesticide_type → pesticideTypes（JSON 数组，normalize/denormalize 中处理）
  pesticide_type: 'pesticideTypes',
  status: 'status', create_time: 'createTime', update_time: 'updateTime',
};

/**
 * 2026-07-10：JSON 数组 ↔ 字符串数组转换
 * - DB 中 pesticide_type 是 JSON 字符串如 '["insecticide","fungicide_fungi"]'
 * - 前端用 string[] 形式
 */
// 2026-07-10：JSON 数组 ↔ 字符串数组转换
// - DB 中 pesticide_type 是 JSON 字符串如 '["insecticide","fungicide_fungi"]'
// - 前端用 string[] 形式
// - camelCase 中间件可能把 pesticide_type 转成 pesticideType（旧名），都兼容
function parsePesticideTypes(value: unknown, fallbackValue?: unknown): string[] {
  // 优先用 fallbackValue（可能是 pesticideType camelCase 单数字段名）
  const v = value !== undefined && value !== null ? value : fallbackValue;
  if (Array.isArray(v)) return v.filter((x): x is string => typeof x === 'string');
  if (typeof v === 'string' && v.trim()) {
    try {
      const parsed = JSON.parse(v);
      return Array.isArray(parsed) ? parsed.filter((x): x is string => typeof x === 'string') : [];
    } catch {
      return v ? [v] : [];
    }
  }
  return [];
}

function stringifyPesticideTypes(types: string[] | undefined | null): string | null {
  if (!types || types.length === 0) return null;
  return JSON.stringify(types);
}

const SPEC_FIELD_MAP: Record<string, string> = {
  id: 'id', pesticide_id: 'pesticideId', spec_content: 'specContent',
  formulation: 'formulation', manufacturer: 'manufacturer', suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio', dosage_unit: 'dosageUnit', mechanism: 'mechanism',
  brand_name: 'brandName', remark: 'remark', status: 'status', create_time: 'createTime',
};

function normalize(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) {
    // 2026-07-10：pesticideTypes 特殊处理（JSON 数组 → string[]）
    // 兼容后端 camelCase 中间件用 'pesticideType' 单数的情况
    if (camelKey === 'pesticideTypes') {
      result[camelKey] = parsePesticideTypes(data[dbKey], (data as any).pesticideType);
    } else {
      result[camelKey] = data[dbKey] ?? null;
    }
  }
  return result;
}

function denormalize(item: Partial<PesticideLibrary>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) reverseMap[camelKey] = dbKey;
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    // 2026-07-10：pesticideTypes 特殊处理（string[] → JSON 字符串）
    if (camelKey === 'pesticideTypes') {
      result[dbKey] = stringifyPesticideTypes(value as string[] | undefined | null);
    } else {
      result[dbKey] = value;
    }
  }
  return result;
}

export const usePesticideLibraryStore = create<PesticideLibraryState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append('limit', '10000'); // 获取所有数据
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const url = `/pesticide-library?${params.toString()}`;
        console.log('[usePesticideLibraryStore] fetchItems URL:', url);
        const response = await enhancedApiClient.get<any>(url);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        console.log('[usePesticideLibraryStore] rawItems count:', rawItems.length, 'first:', rawItems[0]);
        // 2026-07-10：normalize 在 store 层确保 pesticideTypes 始终是数组
        // 兼容 snake_case (pesticide_type) + camelCase 单数 (pesticideType) 两种字段名
        const normalized = (rawItems as Record<string, unknown>[]).map((row) => {
          if (!Array.isArray(row.pesticideTypes)) {
            row.pesticideTypes = parsePesticideTypes(row.pesticide_type, row.pesticideType);
          }
          return row as PesticideLibrary;
        });
        console.log('[usePesticideLibraryStore] set items, count:', normalized.length);
        set({ items: normalized, isLoading: false });
      } catch (err) {
        console.error('[usePesticideLibraryStore] fetchItems error:', err);
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pesticide-library/${id}`);
        const item = (response.data ?? response) as Record<string, unknown>;
        // 2026-07-10：兼容 camelCase 中间件可能没转 pesticide_type → pesticideTypes 的情况
        if (item.pesticide_type !== undefined && !Array.isArray(item.pesticideTypes)) {
          item.pesticideTypes = parsePesticideTypes(item.pesticide_type);
        }
        return item as PesticideLibrary;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item, FIELD_MAP);
        const response = await enhancedApiClient.post('/pesticide-library', body);
        const newItem = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as PesticideLibrary;
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
        const response = await enhancedApiClient.put(`/pesticide-library/${id}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as PesticideLibrary;
        set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, ...updated } : i)) }));
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

    createSpec: async (pesticideId, spec) => {
      try {
        const body = denormalize(spec, SPEC_FIELD_MAP);
        const response = await enhancedApiClient.post(`/pesticide-library/${pesticideId}/specs`, body);
        const newSpec = normalize((response.data ?? response) as Record<string, unknown>, SPEC_FIELD_MAP) as PesticideSpec;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === pesticideId ? { ...i, specs: [...(i.specs || []), newSpec] } : i
          ),
        }));
        return newSpec;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    updateSpec: async (specId, spec) => {
      try {
        const body = denormalize(spec, SPEC_FIELD_MAP);
        const response = await enhancedApiClient.put(`/pesticide-library/specs/${specId}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>, SPEC_FIELD_MAP) as PesticideSpec;
        set((state) => ({
          items: state.items.map((i) => ({
            ...i,
            specs: i.specs?.map((s) => (s.id === specId ? updated : s)) || [],
          })),
        }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteSpec: async (specId) => {
      try {
        await enhancedApiClient.delete(`/pesticide-library/specs/${specId}`);
        set((state) => ({
          items: state.items.map((i) => ({
            ...i,
            specs: i.specs?.filter((s) => s.id !== specId) || [],
          })),
        }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    fetchRelatedPests: async (pesticideId) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pesticide-library/${pesticideId}/relations`);
        const items = Array.isArray(response) ? response : response?.data ?? [];
        return items as PestDiseaseForRelation[];
      } catch {
        return [];
      }
    },

    updateRelations: async (pesticideId, pestIds) => {
      try {
        await enhancedApiClient.put(`/pesticide-library/${pesticideId}/relations`, { pestIds });
        return true;
      } catch {
        return false;
      }
    },

    removeRelation: async (pesticideId, pestId) => {
      try {
        await enhancedApiClient.delete(`/pesticide-library/${pesticideId}/relations/${pestId}`);
        return true;
      } catch {
        return false;
      }
    },
  })
);
