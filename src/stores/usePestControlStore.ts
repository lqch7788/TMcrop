/**
 * 病虫害防治记录 Store (V12.0)
 * 遵循 V2.1 Store 标准模板
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

export interface PestControlData {
  id: string;
  recordCode: string;
  sprayTime: string;
  operatorId?: string;
  operatorName?: string;
  cropName: string;
  greenhouseName?: string;
  controlType: 'chemical' | 'bio' | 'physical';
  pesticideId?: string;
  pesticideName?: string;
  pesticideType?: string;
  specId?: string;
  specContent?: string;
  dosage?: number;
  dosageUnit?: string;
  dilutionRatio?: string;
  targetPest?: string;
  applicationMethod?: string;
  bioAgentId?: string;
  bioAgentName?: string;
  bioAgentType?: string;
  equipmentName?: string;
  equipmentCount?: string;
  useLeafFertilizer: 'yes' | 'no';
  leafFertilizerName?: string;
  leafFertilizerDosage?: number;
  leafFertilizerUnit?: string;
  description?: string;
  photos?: string;
  status: string;
  createTime: string;
  updateTime: string;
}

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  record_code: 'recordCode',
  spray_time: 'sprayTime',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  crop_name: 'cropName',
  greenhouse_name: 'greenhouseName',
  control_type: 'controlType',
  pesticide_id: 'pesticideId',
  pesticide_name: 'pesticideName',
  pesticide_type: 'pesticideType',
  spec_id: 'specId',
  spec_content: 'specContent',
  dosage: 'dosage',
  dosage_unit: 'dosageUnit',
  dilution_ratio: 'dilutionRatio',
  target_pest: 'targetPest',
  application_method: 'applicationMethod',
  bio_agent_id: 'bioAgentId',
  bio_agent_name: 'bioAgentName',
  bio_agent_type: 'bioAgentType',
  equipment_name: 'equipmentName',
  equipment_count: 'equipmentCount',
  use_leaf_fertilizer: 'useLeafFertilizer',
  leaf_fertilizer_name: 'leafFertilizerName',
  leaf_fertilizer_dosage: 'leafFertilizerDosage',
  leaf_fertilizer_unit: 'leafFertilizerUnit',
  description: 'description',
  photos: 'photos',
  status: 'status',
  create_time: 'createTime',
  update_time: 'updateTime',
};

function normalizePestControl(db: Record<string, unknown>): PestControlData {
  const result: Record<string, unknown> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    result[camelKey] = db[dbKey] ?? null;
  }
  return result as unknown as PestControlData;
}

function denormalizePestControl(item: Partial<PestControlData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverseMap: Record<string, string> = {};
  for (const [dbKey, camelKey] of Object.entries(FIELD_MAP)) {
    reverseMap[camelKey] = dbKey;
  }
  for (const [camelKey, value] of Object.entries(item)) {
    const dbKey = reverseMap[camelKey] ?? camelKey;
    result[dbKey] = value;
  }
  return result;
}

interface PestControlState {
  items: PestControlData[];
  stats: any[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchItemById: (id: string) => Promise<PestControlData | null>;
  createItem: (item: Partial<PestControlData>) => Promise<PestControlData | null>;
  updateItem: (id: string, updates: Partial<PestControlData>) => Promise<PestControlData | null>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<{ deleted: number }>;
  fetchStats: (filters?: Record<string, string>) => Promise<void>;
  generateCode: () => Promise<string>;
}

export const usePestControlStore = create<PestControlState>()(
  (set, get) => ({
    items: [],
    stats: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters = {}) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/pest-records?${params.toString()}`);
        const rawItems = Array.isArray(response) ? response : response?.data ?? [];
        set({ items: rawItems as PestControlData[], isLoading: false });
      } catch (err) {
        set({ error: (err as Error).message, isLoading: false });
      }
    },

    fetchItemById: async (id: string) => {
      try {
        const response = await enhancedApiClient.get<any>(`/pest-records/${id}`);
        return ((response as any).data ?? response) as PestControlData;
      } catch {
        return null;
      }
    },

    createItem: async (item) => {
      try {
        const body = denormalizePestControl(item);
        const response = await enhancedApiClient.post<any>('/pest-records', body);
        const newItem = (response.data ?? response) as PestControlData;
        set((state) => ({ items: [newItem, ...state.items] }));
        return newItem;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const body = denormalizePestControl(updates);
        const response = await enhancedApiClient.put<any>(`/pest-records/${id}`, body);
        const updated = (response.data ?? response) as PestControlData;
        set((state) => ({
          items: state.items.map((i) => (i.id === id ? updated : i)),
        }));
        return updated;
      } catch (err) {
        set({ error: (err as Error).message });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await enhancedApiClient.delete(`/pest-records/${id}`);
        set((state) => ({ items: state.items.filter((i) => i.id !== id) }));
        return true;
      } catch (err) {
        set({ error: (err as Error).message });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        console.log('[PestControlStore] deleteItems called with:', ids);
        const response = await enhancedApiClient.post('/pest-records/batch-delete', { ids }) as { deleted?: number };
        console.log('[PestControlStore] deleteItems response:', response);
        const deleted = response?.deleted ?? 0;
        if (deleted > 0) {
          console.log('[PestControlStore] Updating state, removing IDs:', ids);
          set((state) => ({ items: state.items.filter((i) => !ids.includes(i.id)) }));
        }
        return { deleted };
      } catch (err) {
        console.error('[PestControlStore] deleteItems error:', err);
        set({ error: (err as Error).message });
        return { deleted: 0 };
      }
    },

    fetchStats: async (filters = {}) => {
      try {
        const params = new URLSearchParams();
        Object.entries(filters).forEach(([k, v]) => { if (v) params.append(k, v); });
        const response = await enhancedApiClient.get<any>(`/pest-records/stats?${params.toString()}`);
        const statsData = (response as any).data ?? response;
        set({ stats: Array.isArray(statsData) ? statsData : [] });
      } catch (err) {
        set({ error: (err as Error).message });
      }
    },

    generateCode: async () => {
      try {
        const response = await enhancedApiClient.get<any>('/pest-records/generate-code');
        const data = (response as any).data ?? response;
        return data?.code ?? '';
      } catch {
        return '';
      }
    },
  })
);
