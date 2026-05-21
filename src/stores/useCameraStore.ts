/**
 * 摄像头 Zustand Store — iAGS Camera 集成
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件
 * 对接后端: /api/cameras
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 类型定义 ====================

export interface Camera {
  id: number;
  oid: string;
  cameraName: string;
  cameraCode: string | null;
  rtspUrl: string | null;
  httpUrl: string | null;
  partitionOid: string | null;
  greenhouseOid: string | null;
  brand: string | null;
  model: string | null;
  username: string | null;
  password: string | null;
  channelCount: number;
  partitionName?: string;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

// ==================== 字段映射表 ====================

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  oid: 'oid',
  camera_name: 'cameraName',
  camera_code: 'cameraCode',
  rtsp_url: 'rtspUrl',
  http_url: 'httpUrl',
  partition_oid: 'partitionOid',
  greenhouse_oid: 'greenhouseOid',
  brand: 'brand',
  model: 'model',
  username: 'username',
  password: 'password',
  channel_count: 'channelCount',
  partition_name: 'partitionName',
  status: 'status',
  created_at: 'createdAt',
  updated_at: 'updatedAt',
};

// ==================== 规范化函数 ====================

function normalize(db: Record<string, unknown>): Camera {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? 0;
  result.channelCount = Number(result.channelCount) || 1;
  result.status = result.status || 'active';
  return result as unknown as Camera;
}

function denormalize(data: Partial<Camera>): Record<string, unknown> {
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

interface CameraState {
  items: Camera[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<Camera>) => Promise<Camera | null>;
  updateItem: (oid: string, updates: Partial<Camera>) => Promise<void>;
  deleteItem: (oid: string) => Promise<boolean>;
}

// ==================== 创建 Store ====================

export const useCameraStore = create<CameraState>()(
  persist(
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
          const url = `/api/cameras${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: any[] }>(url);
          const data = Array.isArray(response?.data) ? response.data
            : Array.isArray((response as any)?.data) ? (response as any).data : [];
          set({ items: data.map(normalize), isLoading: false });
        } catch (error) {
          console.warn('[CameraStore] API 获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{ success: boolean; data: any }>(
            '/api/cameras', body
          );
          const saved = (response as any)?.data || response;
          const newItem = normalize({ ...data, ...saved } as Record<string, unknown>);
          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[CameraStore] 创建失败:', error);
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
          await enhancedApiClient.put(`/api/cameras/${oid}`, body);
        } catch (error) {
          console.warn('[CameraStore] 更新失败:', error);
        }
      },

      deleteItem: async (oid) => {
        set((state) => ({ items: state.items.filter(item => item.oid !== oid) }));
        try {
          await enhancedApiClient.delete(`/api/cameras/${oid}`);
          return true;
        } catch (error) {
          console.warn('[CameraStore] 删除失败:', error);
          return false;
        }
      },
    }),
    {
      name: 'camera-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
