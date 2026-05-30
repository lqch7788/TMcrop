/**
 * 水肥一体机 Zustand Store — iAGS WaterFertilizer 集成
 *
 * 灌溉时段、间隔和ABC混合比例参数配置
 * 对接后端: /api/water-fertilizer
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

export interface WaterFertilizerConfig {
  id: number;
  oid: string;
  partitionOid: string;
  deviceOid: string | null;
  deviceCode: string | null;
  machineAddr: string | null;
  macAddr: string | null;
  startTime: string | null;
  endTime: string | null;
  intervalValue: number;
  intervalUnit: string;
  mixRatioA: number;
  mixRatioB: number;
  mixRatioC: number;
  description: string | null;
  partitionName?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ==================== 间隔单位常量 ====================

export const INTERVAL_UNITS = [
  { value: 'minute', label: '分钟' },
  { value: 'hour', label: '小时' },
  { value: 'day', label: '天' },
];

// ==================== 字段映射表 ====================

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  oid: 'oid',
  partition_oid: 'partitionOid',
  device_oid: 'deviceOid',
  device_code: 'deviceCode',
  machine_addr: 'machineAddr',
  mac_addr: 'macAddr',
  start_time: 'startTime',
  end_time: 'endTime',
  interval_value: 'intervalValue',
  interval_unit: 'intervalUnit',
  mix_ratio_a: 'mixRatioA',
  mix_ratio_b: 'mixRatioB',
  mix_ratio_c: 'mixRatioC',
  description: 'description',
  partition_name: 'partitionName',
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

function normalize(db: Record<string, unknown>): WaterFertilizerConfig {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? 0;
  result.intervalValue = Number(result.intervalValue) || 1;
  result.intervalUnit = result.intervalUnit || 'day';
  result.mixRatioA = Number(result.mixRatioA) || 0;
  result.mixRatioB = Number(result.mixRatioB) || 0;
  result.mixRatioC = Number(result.mixRatioC) || 0;
  result.status = result.status || 'active';
  return result as unknown as WaterFertilizerConfig;
}

function denormalize(data: Partial<WaterFertilizerConfig>): Record<string, unknown> {
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

interface WaterFertilizerState {
  items: WaterFertilizerConfig[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<WaterFertilizerConfig>) => Promise<WaterFertilizerConfig | null>;
  updateItem: (oid: string, updates: Partial<WaterFertilizerConfig>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
  dispatchParams: (oid: string) => Promise<boolean>;
}

export const useWaterFertilizerStore = create<WaterFertilizerState>()(
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
          const url = `/api/water-fertilizer${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(url);
          const data = Array.isArray(response?.data) ? response.data
            : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ items: data.map(normalize), isLoading: false });
        } catch (error) {
          // logger.warn('[WaterFertilizerStore] 获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>(
            '/api/water-fertilizer', body
          );
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          // logger.warn('[WaterFertilizerStore] 创建失败:', error);
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
          await enhancedApiClient.put(`/api/water-fertilizer/${oid}`, body);
        } catch (error) {
          // logger.warn('[WaterFertilizerStore] 更新失败:', error);
        }
      },

      deleteItem: async (oid) => {
        set((state) => ({ items: state.items.filter(item => item.oid !== oid) }));
        try {
          await enhancedApiClient.delete(`/api/water-fertilizer/${oid}`);
          return true;
        } catch (error) {
          // logger.warn('[WaterFertilizerStore] 删除失败:', error);
          return false;
        }
      },

      dispatchParams: async (oid) => {
        try {
          await enhancedApiClient.post(`/api/water-fertilizer/${oid}/dispatch`, {});
          return true;
        } catch (error) {
          // logger.warn('[WaterFertilizerStore] 下发失败:', error);
          return false;
        }
      },
    })
);
