/**
 * 分区管理 Zustand Store — iAGS GreenHouseArea 集成
 *
 * V2.1 架构 - 已简化
 * 对接后端: /api/farm-partitions
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

/** 分区数据接口 */
export interface FarmPartition {
  id: number;
  oid: string;
  parentOid: string | null;
  name: string;
  areaType: string;
  greenhouseType: string | null;
  area: number;
  areaUnit: string;
  managerOid: string | null;
  managerName: string | null;
  hmiDeviceOid: string | null;
  sensorConfig: any;
  cameraConfig: any;
  waterFertilizerConfig: any;
  address: string | null;
  description: string | null;
  sortOrder: number;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
  children?: FarmPartition[];
}

// ==================== 字段映射表 ====================

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  oid: 'oid',
  parent_oid: 'parentOid',
  name: 'name',
  area_type: 'areaType',
  greenhouse_type: 'greenhouseType',
  area: 'area',
  area_unit: 'areaUnit',
  manager_oid: 'managerOid',
  manager_name: 'managerName',
  hmi_device_oid: 'hmiDeviceOid',
  sensor_config: 'sensorConfig',
  camera_config: 'cameraConfig',
  water_fertilizer_config: 'waterFertilizerConfig',
  address: 'address',
  description: 'description',
  sort_order: 'sortOrder',
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// ==================== 规范化函数 ====================

function normalize(db: Record<string, unknown>): FarmPartition {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? 0;
  result.areaType = result.areaType || 'greenhouse';
  result.area = Number(result.area) || 0;
  result.sortOrder = Number(result.sortOrder) || 0;
  result.status = result.status || 'active';
  // 解析 JSON 配置字段
  ['sensorConfig', 'cameraConfig', 'waterFertilizerConfig'].forEach(f => {
    if (typeof result[f] === 'string') {
      try { result[f] = JSON.parse(result[f] as string); } catch { result[f] = null; }
    }
  });
  return result as unknown as FarmPartition;
}

function denormalize(data: Partial<FarmPartition>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    // JSON 配置字段序列化
    if (['sensorConfig', 'cameraConfig', 'waterFertilizerConfig'].includes(key) && typeof value === 'object') {
      result[backendKey] = JSON.stringify(value);
    } else {
      result[backendKey] = value;
    }
  }
  return result;
}

// ==================== Store 接口 ====================

interface FarmPartitionState {
  items: FarmPartition[];
  tree: FarmPartition[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  fetchTree: () => Promise<void>;
  createItem: (data: Partial<FarmPartition>) => Promise<FarmPartition | null>;
  updateItem: (oid: string, updates: Partial<FarmPartition>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
}

// ==================== 创建 Store ====================

export const useFarmPartitionStore = create<FarmPartitionState>()(
  (set, get) => ({
      items: [],
      tree: [],
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
          const url = `/api/farm-partitions${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(url);
          const data = Array.isArray(response?.data) ? response.data
            : Array.isArray((response as any)?.data) ? (response as any).data : [];
          const normalized = data.map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          // logger.warn('[FarmPartitionStore] API 获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchTree: async () => {
        try {
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>('/api/farm-partitions/tree/all');
          const data = Array.isArray(response?.data) ? response.data
            : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ tree: data });
        } catch (error) {
          // logger.warn('[FarmPartitionStore] 获取分区树失败:', error);
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>(
            '/api/farm-partitions', body
          );
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          // logger.warn('[FarmPartitionStore] 创建失败:', error);
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
          await enhancedApiClient.put(`/api/farm-partitions/${oid}`, body);
        } catch (error) {
          // logger.warn('[FarmPartitionStore] 更新失败:', error);
        }
      },

      deleteItem: async (oid) => {
        set((state) => ({
          items: state.items.filter(item => item.oid !== oid && item.parentOid !== oid),
        }));
        try {
          await enhancedApiClient.delete(`/api/farm-partitions/${oid}`);
          return true;
        } catch (error) {
          // logger.warn('[FarmPartitionStore] 删除失败:', error);
          return false;
        }
      },
    }
  )
);
