/**
 * 病虫害字典 Store (V12.0)
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface PestDiseaseDict {
  id: string;
  dictCode: string;
  dictName: string;
  dictType: 'pest' | 'disease';
  targetCrops?: string;
  description?: string;
  // 2026-07-16：病虫害图片（base64 data URL 数组 JSON）
  images?: string[];
  status: string;
  createTime: string;
}

export interface PesticideForRelation {
  id: string;
  pesticideCode: string;
  pesticideName: string;
  // 2026-07-10：移除 controlType；新增 pesticideTypes 数组（关联药剂类型）
  pesticideTypes?: string[];
}

interface PestDiseaseDictState {
  items: PestDiseaseDict[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<PestDiseaseDict | null>;
  createItem: (item: Partial<PestDiseaseDict>) => Promise<PestDiseaseDict | null>;
  updateItem: (id: string, updates: Partial<PestDiseaseDict>) => Promise<PestDiseaseDict | null>;
  deleteItem: (id: string) => Promise<boolean>;
  fetchByCrop: (cropName: string) => Promise<PestDiseaseDict[]>;
  fetchNextCode: (type: 'pest' | 'disease') => Promise<string>;
  fetchRelatedPesticides: (pestId: string) => Promise<PesticideForRelation[]>;
  addRelation: (pesticideId: string, pestId: string) => Promise<boolean>;
  removeRelation: (pesticideId: string, pestId: string) => Promise<boolean>;
  updateRelations: (pestId: string, pesticideIds: string[]) => Promise<boolean>;
}

const FIELD_MAP: Record<string, string> = {
  id: 'id', dict_code: 'dictCode', dict_name: 'dictName', dict_type: 'dictType',
  target_crops: 'targetCrops', description: 'description', status: 'status', create_time: 'createTime',
  // 2026-07-16：图片字段（DB 存 JSON 字符串，normalize 时 parse 为 string[]）
  images: 'images',
};

/**
 * 2026-07-16：images 反序列化 — DB/API 返回 JSON 字符串，前端需要 string[]
 * 兼容 3 种输入：已是数组（透传）/ JSON 字符串（parse）/ null·undefined·解析失败（[]）
 */
function parseImages(raw: unknown): string[] {
  if (Array.isArray(raw)) return raw.filter((s): s is string => typeof s === 'string');
  if (typeof raw === 'string' && raw.trim()) {
    try {
      const parsed = JSON.parse(raw);
      return Array.isArray(parsed) ? parsed.filter((s): s is string => typeof s === 'string') : [];
    } catch {
      return [];
    }
  }
  return [];
}

function normalize(data: Record<string, unknown>): PestDiseaseDict {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    result[camelKey] = data[dbKey] ?? null;
  }
  // camelCase 中间件可能已把 key 转 camel，双向兜底
  if (result.images == null && data.images != null) result.images = data.images;
  result.images = parseImages(result.images);
  return result as unknown as PestDiseaseDict;
}

function denormalize(item: Partial<PestDiseaseDict>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) reverseMap[camelKey] = dbKey;
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    result[dbKey] = value;
  }
  return result;
}

export const usePestDiseaseDictStore = create<PestDiseaseDictState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        // 默认获取较多数据（病虫害词典总量约70条）
        params.append('limit', '10000');
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/pest-disease-dict?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        // 2026-07-16：images 反序列化（JSON 字符串 → string[]），修复列表页图片列崩溃
        const items = (rawItems as Record<string, unknown>[]).map((r) => ({
          ...r,
          images: parseImages(r.images),
        })) as unknown as PestDiseaseDict[];
        set({ items, isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-disease-dict/${id}`);
        return (response.data ?? response) as PestDiseaseDict;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item);
        const response = await enhancedApiClient.post('/pest-disease-dict', body);
        const newItem = normalize((response.data ?? response) as Record<string, unknown>);
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
        const response = await enhancedApiClient.put(`/pest-disease-dict/${id}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>);
        set((state) => ({ items: state.items.map((i) => (i.id === id ? updated : i)) }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/pest-disease-dict/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    fetchByCrop: async (cropName) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-disease-dict/by-crop/${encodeURIComponent(cropName)}`);
        return (Array.isArray(response.data ?? response) ? response.data : []) as PestDiseaseDict[];
      } catch {
        return [];
      }
    },

    fetchNextCode: async (type) => {
      // 2026-07-16：后端 middleware 已转 camelCase（response.nextCode），但兼容老版本 fallback snake_case
      const response = await enhancedApiClient.get<any>(`/pest-disease-dict/next-code?type=${type}`);
      const payload = response?.data ?? response;
      return payload?.nextCode || payload?.next_code || '';
    },

    fetchRelatedPesticides: async (pestId) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-disease-dict/${pestId}/relations`);
        const items = Array.isArray(response) ? response : response?.data ?? [];
        // 2026-07-10：兼容后端返回的 pesticide_type 字段（snake_case JSON 字符串），前端统一为 pesticideTypes[]
        return items.map((item: Record<string, unknown>) => {
          if (Array.isArray(item.pesticideTypes)) return item as PesticideForRelation;
          let arr: string[] = [];
          if (Array.isArray(item.pesticide_types)) {
            arr = (item.pesticide_types as string[]).filter((v): v is string => typeof v === 'string');
          } else if (typeof item.pesticide_type === 'string' && item.pesticide_type.trim()) {
            try {
              const parsed = JSON.parse(item.pesticide_type);
              arr = Array.isArray(parsed) ? parsed.filter((v): v is string => typeof v === 'string') : [];
            } catch {
              arr = item.pesticide_type ? [item.pesticide_type] : [];
            }
          }
          return { ...item, pesticideTypes: arr } as PesticideForRelation;
        });
      } catch {
        return [];
      }
    },

    addRelation: async (pesticideId, pestId) => {
      try {
        await enhancedApiClient.post(`/pest-disease-dict/${pestId}/relations`, { pesticideId });
        return true;
      } catch {
        return false;
      }
    },

    removeRelation: async (pesticideId, pestId) => {
      try {
        await enhancedApiClient.delete(`/pest-disease-dict/${pestId}/relations/${pesticideId}`);
        return true;
      } catch {
        return false;
      }
    },

    updateRelations: async (pestId, pesticideIds) => {
      try {
        // 获取当前关联
        const current = await get().fetchRelatedPesticides(pestId);
        const currentIds = current.map(p => p.id);

        // 添加新的关联
        for (const pesticideId of pesticideIds) {
          if (!currentIds.includes(pesticideId)) {
            await get().addRelation(pesticideId, pestId);
          }
        }

        // 删除不再关联的
        for (const pesticideId of currentIds) {
          if (!pesticideIds.includes(pesticideId)) {
            await get().removeRelation(pesticideId, pestId);
          }
        }
        return true;
      } catch {
        return false;
      }
    },
  })
);
