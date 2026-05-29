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
  status: string;
  createTime: string;
}

export interface PesticideForRelation {
  id: string;
  pesticideCode: string;
  pesticideName: string;
  controlType: 'chemical' | 'bio' | 'physical';
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
};

function normalize(data: Record<string, unknown>): PestDiseaseDict {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    result[camelKey] = data[dbKey] ?? null;
  }
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
        set({ items: rawItems as PestDiseaseDict[], isLoading: false });
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
      const response = await enhancedApiClient.get<any>(`/pest-disease-dict/next-code?type=${type}`);
      return (response as any).next_code || response.next_code || '';
    },

    fetchRelatedPesticides: async (pestId) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-disease-dict/${pestId}/relations`);
        const items = Array.isArray(response) ? response : response?.data ?? [];
        return items as PesticideForRelation[];
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
