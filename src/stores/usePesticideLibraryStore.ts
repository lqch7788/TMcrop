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
  controlType: 'chemical' | 'bio' | 'physical';
  functionDesc?: string;
  tabooDesc?: string;
  targetPests?: string;
  ingredient?: string; // 药剂成分
  mechanism?: string; // 作用机制
  // 2026-07-10：药剂类型（关联 pesticide_type 字典：杀虫剂/杀菌剂/除草剂/杀螨剂/杀线虫剂 等）
  // 用于病虫害防治弹窗按类型过滤药剂名称选项
  pesticideType?: string;
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
  control_type: 'controlType', function_desc: 'functionDesc', taboo_desc: 'tabooDesc',
  target_pests: 'targetPests', ingredient: 'ingredient', mechanism: 'mechanism',
  // 2026-07-10：pesticide_type 字段映射
  pesticide_type: 'pesticideType',
  status: 'status', create_time: 'createTime', update_time: 'updateTime',
};

const SPEC_FIELD_MAP: Record<string, string> = {
  id: 'id', pesticide_id: 'pesticideId', spec_content: 'specContent',
  formulation: 'formulation', manufacturer: 'manufacturer', suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio', dosage_unit: 'dosageUnit', mechanism: 'mechanism',
  brand_name: 'brandName', remark: 'remark', status: 'status', create_time: 'createTime',
};

function normalize(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) {
    result[camelKey] = data[dbKey] ?? null;
  }
  return result;
}

function denormalize(item: Partial<PesticideLibrary>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) reverseMap[camelKey] = dbKey;
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    result[dbKey] = value;
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
        const response = await enhancedApiClient.get<any>(`/pesticide-library?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        set({ items: rawItems as PesticideLibrary[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pesticide-library/${id}`);
        return (response.data ?? response) as PesticideLibrary;
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
