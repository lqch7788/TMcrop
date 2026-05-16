/**
 * 行政区划 Zustand Store
 * V10.0 新增 — 四级级联懒加载
 * 策略：cache-first，数据极少变化
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型 ==========
export interface RegionNode {
  id: number;
  name: string;
  parentId: number;
  level: 'country' | 'province' | 'city' | 'area';
}

interface RegionState {
  provinces: RegionNode[];
  childrenCache: Record<number, RegionNode[]>;
  isLoading: boolean;
  error: string | null;

  fetchProvinces: () => Promise<void>;
  getChildren: (parentId: number) => Promise<RegionNode[]>;
  searchRegions: (keyword: string, level?: string) => Promise<RegionNode[]>;
  initRegions: () => Promise<void>;
}

export const useRegionStore = create<RegionState>()(
  persist(
    (set, get) => ({
      provinces: [],
      childrenCache: {},
      isLoading: false,
      error: null,

      fetchProvinces: async () => {
        const cached = get().provinces;
        if (cached.length > 0) return;

        set({ isLoading: true });
        try {
          const response = await enhancedApiClient.get<any>('/region?parent_id=1');
          const data = Array.isArray(response.data ?? response) ? (response.data ?? response) : (response.data?.data ?? []);
          set({ provinces: data, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },

      getChildren: async (parentId: number) => {
        const cached = get().childrenCache[parentId];
        if (cached?.length > 0) return cached;

        try {
          const response = await enhancedApiClient.get<any>(`/region?parent_id=${parentId}`);
          const data = Array.isArray(response.data ?? response) ? (response.data ?? response) : (response.data?.data ?? []);
          set((s) => ({ childrenCache: { ...s.childrenCache, [parentId]: data } }));
          return data;
        } catch {
          return [];
        }
      },

      searchRegions: async (keyword: string, level?: string) => {
        try {
          const params = new URLSearchParams({ keyword });
          if (level) params.append('level', level);
          const response = await enhancedApiClient.get<any>(`/region/search?${params.toString()}`);
          return Array.isArray(response.data ?? response) ? (response.data ?? response) : (response.data?.data ?? []);
        } catch {
          return [];
        }
      },

      initRegions: async () => {
        set({ isLoading: true });
        try {
          await enhancedApiClient.post('/region/init');
          const response = await enhancedApiClient.get<any>('/region?parent_id=1');
          const data = Array.isArray(response.data ?? response) ? (response.data ?? response) : (response.data?.data ?? []);
          set({ provinces: data, isLoading: false });
        } catch (err) {
          set({ error: (err as Error).message, isLoading: false });
        }
      },
    }),
    {
      name: 'region-data-storage',
      partialize: (state) => ({
        provinces: state.provinces,
        childrenCache: state.childrenCache,
      }),
    }
  )
);
