/**
 * 设备分配 Zustand Store — iAGS DeviceDistribution 集成
 *
 * 对接后端: /api/device-distributions
 * IoT设备分配到温室/区域 + 运行参数配置
 * 预留端口 — V1.1 暂无真实IoT设备
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';
import type { DeviceDistribution } from '../services/apiDeviceDistributionService';

const FIELD_MAP: Record<string, string> = {
  id: 'id', oid: 'oid',
  device_name: 'deviceName', device_code: 'deviceCode',
  site_name: 'siteName', area_name: 'areaName',
  device_type: 'deviceType', motor_name: 'motorName',
  sort_order: 'sortOrder', allow_runtime: 'allowRuntime',
  rest_time: 'restTime', initial_status: 'initialStatus',
  circuit: 'circuit', slave_devices: 'slaveDevices',
  start_time: 'startTime', show_curve: 'showCurve',
  specs: 'specs', remarks: 'remarks',
  status: 'status', created_at: 'createdAt', updated_at: 'updatedAt',
};

function normalize(db: Record<string, unknown>): DeviceDistribution {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) result[camel] = result[snake];
  }
  result.id = result.id ?? 0;
  result.sortOrder = (result.sortOrder as number) ?? 0;
  result.showCurve = (result.showCurve as number) ?? 0;
  result.status = (result.status as string) || 'active';
  return result as unknown as DeviceDistribution;
}

function denormalize(data: Partial<DeviceDistribution>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) reverse[camel] = snake;
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

interface DeviceDistributionState {
  items: DeviceDistribution[];
  isLoading: boolean;
  error: string | null;
  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<DeviceDistribution>) => Promise<DeviceDistribution | null>;
  updateItem: (oid: string, updates: Partial<DeviceDistribution>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
}

export const useDeviceDistributionStore = create<DeviceDistributionState>()(
  persist(
    (set) => ({
      items: [], isLoading: false, error: null,

      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          const query = params.toString();
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(`/api/device-distributions${query ? `?${query}` : ''}`);
          const data = Array.isArray(response?.data) ? response.data : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ items: data.map(normalize), isLoading: false });
        } catch (error) {
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>('/api/device-distributions', body);
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) { set({ error: (error as Error).message }); return null; }
      },

      updateItem: async (oid, updates) => {
        const body = denormalize(updates);
        set((state) => ({ items: state.items.map(item => item.oid === oid ? { ...item, ...updates } : item) }));
        try { await enhancedApiClient.put(`/api/device-distributions/${oid}`, body); } catch (error) {}
      },

      deleteItem: async (oid) => {
        set((state) => ({ items: state.items.filter(item => item.oid !== oid) }));
        try { await enhancedApiClient.delete(`/api/device-distributions/${oid}`); return true; } catch (error) { return false; }
      },
    }),
    { name: 'device-distribution-storage', partialize: (state) => ({ items: state.items }) }
  )
);
