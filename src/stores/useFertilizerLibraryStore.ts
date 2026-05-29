/**
 * 肥料知识库 Store
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface FertilizerSpec {
  id: string;
  fertilizerId: string;
  brandName?: string;
  specContent?: string;
  manufacturer?: string;
  suggestedDosage?: string;
  suggestedRatio?: string;
  dosageUnit?: string;
  remark?: string;
  status: string;
  createTime: string;
}

export interface FertilizerLibrary {
  id: string;
  fertilizerCode: string;
  fertilizerName: string;
  fertilizerType?: 'organic' | 'inorganic' | 'water_soluble' | 'compound' | 'bio' | 'slow_release' | 'trace';
  applicationTiming?: string;
  functionDesc?: string;
  tabooDesc?: string;
  shelfLife?: string;
  storageCondition?: string;
  supplierInfo?: string;
  status: string;
  createTime: string;
  updateTime: string;
  specs?: FertilizerSpec[];
}

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
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

const SPEC_FIELD_MAP: Record<string, string> = {
  id: 'id',
  fertilizer_id: 'fertilizerId',
  brand_name: 'brandName',
  spec_content: 'specContent',
  manufacturer: 'manufacturer',
  suggested_dosage: 'suggestedDosage',
  suggested_ratio: 'suggestedRatio',
  dosage_unit: 'dosageUnit',
  remark: 'remark',
  status: 'status',
  create_time: 'createTime',
};

function normalize(data: Record<string, unknown>, fieldMap: Record<string, string>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(fieldMap)) {
    result[camelKey] = data[dbKey] ?? null;
  }
  return result;
}

function denormalize(item: Partial<FertilizerLibrary>, fieldMap: Record<string, string>): Record<string, unknown> {
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
  items: FertilizerLibrary[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<FertilizerLibrary | null>;
  createItem: (item: Partial<FertilizerLibrary>) => Promise<FertilizerLibrary | null>;
  updateItem: (id: string, updates: Partial<FertilizerLibrary>) => Promise<FertilizerLibrary | null>;
  deleteItem: (id: string) => Promise<boolean>;
  createSpec: (fertilizerId: string, spec: Partial<FertilizerSpec>) => Promise<FertilizerSpec | null>;
  updateSpec: (specId: string, spec: Partial<FertilizerSpec>) => Promise<FertilizerSpec | null>;
  deleteSpec: (specId: string) => Promise<boolean>;
}

export const useFertilizerLibraryStore = create<FertilizerLibraryState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        params.append('limit', '10000');
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/fertilizer-library?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        set({ items: rawItems as FertilizerLibrary[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/fertilizer-library/${id}`);
        return (response.data ?? response) as FertilizerLibrary;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalize(item, FIELD_MAP);
        const response = await enhancedApiClient.post('/fertilizer-library', body);
        const newItem = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as FertilizerLibrary;
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
        const response = await enhancedApiClient.put(`/fertilizer-library/${id}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>, FIELD_MAP) as FertilizerLibrary;
        set((state) => ({ items: state.items.map((i) => (i.id === id ? { ...i, ...updated } : i)) }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/fertilizer-library/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    createSpec: async (fertilizerId, spec) => {
      try {
        const body = denormalize(spec as any, SPEC_FIELD_MAP);
        const response = await enhancedApiClient.post(`/fertilizer-library/${fertilizerId}/specs`, body);
        const newSpec = normalize((response.data ?? response) as Record<string, unknown>, SPEC_FIELD_MAP) as FertilizerSpec;
        set((state) => ({
          items: state.items.map((i) =>
            i.id === fertilizerId ? { ...i, specs: [...(i.specs || []), newSpec] } : i
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
        const body = denormalize(spec as any, SPEC_FIELD_MAP);
        const response = await enhancedApiClient.put(`/fertilizer-library/specs/${specId}`, body);
        const updated = normalize((response.data ?? response) as Record<string, unknown>, SPEC_FIELD_MAP) as FertilizerSpec;
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
        await enhancedApiClient.delete(`/fertilizer-library/specs/${specId}`);
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
