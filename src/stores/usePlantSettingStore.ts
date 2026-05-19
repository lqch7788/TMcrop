/**
 * 种植设置 Zustand Store — iAGS Plantset 集成
 *
 * 对接后端: /api/plant-settings
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

export interface PlantSetting {
  id: number;
  oid: string;
  settingKey: string;
  settingValue: string | null;
  cropVarietyOid: string | null;
  iconUrl: string | null;
  description: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

const FIELD_MAP: Record<string, string> = {
  id: 'id', oid: 'oid', setting_key: 'settingKey', setting_value: 'settingValue',
  crop_variety_oid: 'cropVarietyOid', icon_url: 'iconUrl', description: 'description',
  status: 'status', created_at: 'createdAt', updated_at: 'updatedAt',
};

function normalize(db: Record<string, unknown>): PlantSetting {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) result[camel] = result[snake];
  }
  result.id = result.id ?? 0;
  result.status = result.status || 'active';
  return result as unknown as PlantSetting;
}

function denormalize(data: Partial<PlantSetting>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) reverse[camel] = snake;
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

interface PlantSettingState {
  items: PlantSetting[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<PlantSetting>) => Promise<PlantSetting | null>;
  updateItem: (oid: string, updates: Partial<PlantSetting>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
}

export const usePlantSettingStore = create<PlantSettingState>()(
  persist(
    (set) => ({
      items: [], isLoading: false, error: null,

      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          const query = params.toString();
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(`/api/plant-settings${query ? `?${query}` : ''}`);
          const data = Array.isArray(response?.data) ? response.data : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ items: data.map(normalize), isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>('/api/plant-settings', body, { offlineQueue: true, priority: 0 });
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) { set({ error: (error as Error).message }); return null; }
      },

      updateItem: async (oid, updates) => {
        const body = denormalize(updates);
        set((state) => ({ items: state.items.map(item => item.oid === oid ? { ...item, ...updates } : item) }));
        try { await enhancedApiClient.put(`/api/plant-settings/${oid}`, body, { offlineQueue: true, priority: 0 }); } catch (error) {}
      },

      deleteItem: async (oid) => {
        set((state) => ({ items: state.items.filter(item => item.oid !== oid) }));
        try { await enhancedApiClient.delete(`/api/plant-settings/${oid}`, { offlineQueue: true, priority: 0 }); return true; } catch (error) { return false; }
      },
    }),
    { name: 'plant-setting-storage', partialize: (state) => ({ items: state.items }) }
  )
);
