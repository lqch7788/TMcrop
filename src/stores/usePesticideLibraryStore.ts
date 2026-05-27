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
  status: string;
  createTime: string;
  updateTime: string;
  specs?: PesticideSpec[];
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
}

const FIELD_MAP: Record<string, string> = {
  id: 'id', pesticide_code: 'pesticideCode', pesticide_name: 'pesticideName',
  control_type: 'controlType', function_desc: 'functionDesc', taboo_desc: 'tabooDesc',
  target_pests: 'targetPests', status: 'status', create_time: 'createTime', update_time: 'updateTime',
};

const SPEC_FIELD_MAP: Record<string, string> = {
  id: 'id', pesticide_id: 'pesticideId', spec_content: 'specContent',
  formulation: 'formulation', manufacturer: 'manufacturer', suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio', dosage_unit: 'dosageUnit', status: 'status', create_time: 'createTime',
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
  })
);
