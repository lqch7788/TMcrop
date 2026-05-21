/**
 * 能耗配置 Zustand Store — iAGS AreaEnery 集成
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件
 * 对接后端: /api/energy-configs
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

export interface EnergyConfig {
  id: number;
  oid: string;
  partitionOid: string;
  energyType: string;
  deviceOid: string | null;
  deviceName: string | null;
  meterCode: string | null;
  unit: string;
  description: string | null;
  partitionName?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ==================== 能耗类型常量 ====================

export const ENERGY_TYPES = [
  { value: 'electricity', label: '电力', unit: 'kWh' },
  { value: 'water', label: '水', unit: 'm³' },
  { value: 'gas', label: '天然气', unit: 'm³' },
  { value: 'heat', label: '热能', unit: 'GJ' },
  { value: 'diesel', label: '柴油', unit: 'L' },
];

// ==================== 字段映射表 ====================

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  oid: 'oid',
  partition_oid: 'partitionOid',
  energy_type: 'energyType',
  device_oid: 'deviceOid',
  device_name: 'deviceName',
  meter_code: 'meterCode',
  unit: 'unit',
  description: 'description',
  partition_name: 'partitionName',
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// ==================== 规范化函数 ====================

function normalize(db: Record<string, unknown>): EnergyConfig {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? 0;
  result.unit = result.unit || 'kWh';
  result.status = result.status || 'active';
  return result as unknown as EnergyConfig;
}

function denormalize(data: Partial<EnergyConfig>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== Store 接口 ====================

interface EnergyConfigState {
  items: EnergyConfig[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<EnergyConfig>) => Promise<EnergyConfig | null>;
  updateItem: (oid: string, updates: Partial<EnergyConfig>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
}

// ==================== 创建 Store ====================

export const useEnergyConfigStore = create<EnergyConfigState>()(
  (set, get) => ({
      items: [],
      isLoading: false,
      error: null,

      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
          const query = params.toString();
          const url = `/api/energy-configs${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(url);
          const data = Array.isArray(response?.data) ? response.data
            : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ items: data.map(normalize), isLoading: false });
        } catch (error) {
          console.warn('[EnergyConfigStore] API 获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>(
            '/api/energy-configs', body
          );
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[EnergyConfigStore] 创建失败:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      updateItem: async (oid, updates) => {
        const body = denormalize(updates);
        set((state) => ({
          items: state.items.map(item => item.oid === oid ? { ...item, ...updates } : item),
        }));
        try {
          await enhancedApiClient.put(`/api/energy-configs/${oid}`, body);
        } catch (error) {
          console.warn('[EnergyConfigStore] 更新失败:', error);
        }
      },

      deleteItem: async (oid) => {
        set((state) => ({ items: state.items.filter(item => item.oid !== oid) }));
        try {
          await enhancedApiClient.delete(`/api/energy-configs/${oid}`);
          return true;
        } catch (error) {
          console.warn('[EnergyConfigStore] 删除失败:', error);
          return false;
        }
      },
    })
);
