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
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
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
  })
);
