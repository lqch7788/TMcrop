/**
 * 基础设施管理 Store
 *
 * 种子数据来自 data/farm/farmData，后续可对接后端 API
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

// ========== 类型定义 ==========

export interface Infrastructure {
  id: string;
  code: string;
  name: string;
  type: string;
  location: string;
  greenhouseId?: string;
  status: 'normal' | 'warning' | 'damaged';
}

// ========== 种子数据 ==========

const DEFAULT_INFRASTRUCTURE: Infrastructure[] = [
  { id: 'INF001', code: 'INF001', name: '2号温室滴灌系统', type: '灌溉', location: '日光温室2号', greenhouseId: 'G005', status: 'warning' },
  { id: 'INF002', code: 'INF002', name: '1号温室滴灌系统', type: '灌溉', location: '玻璃温室A区', greenhouseId: 'G001', status: 'normal' },
  { id: 'INF003', code: 'INF003', name: 'A区排水沟渠', type: '排水', location: '园区A区', status: 'normal' },
  { id: 'INF004', code: 'INF004', name: 'B区排水沟渠', type: '排水', location: '园区B区', status: 'normal' },
  { id: 'INF005', code: 'INF005', name: '供电线路A', type: '供电', location: '园区主干道', status: 'normal' },
  { id: 'INF006', code: 'INF006', name: '管理房仓库', type: '房屋', location: '园区入口', status: 'normal' },
  { id: 'INF007', code: 'INF007', name: '生产资料仓库', type: '房屋', location: '园区中部', status: 'warning' },
  { id: 'INF008', code: 'INF008', name: '园区主干道', type: '道路', location: '园区环形通道', status: 'normal' },
];

// ========== Store ==========

interface InfrastructureState {
  infrastructures: Infrastructure[];
  isLoading: boolean;
  error: string | null;

  fetchInfrastructures: () => Promise<void>;
  addInfrastructure: (item: Omit<Infrastructure, 'id' | 'code'>) => void;
  updateInfrastructure: (id: string, updates: Partial<Infrastructure>) => void;
  deleteInfrastructure: (id: string) => void;
}

export const useInfrastructureStore = create<InfrastructureState>()(
  persist(
    (set, get) => ({
      infrastructures: [],
      isLoading: false,
      error: null,

      fetchInfrastructures: async () => {
        if (get().infrastructures.length > 0) return;
        set({ isLoading: true });
        try {
          // TODO: 对接后端 API /api/infrastructure
          set({ infrastructures: DEFAULT_INFRASTRUCTURE, isLoading: false });
        } catch {
          set({ infrastructures: DEFAULT_INFRASTRUCTURE, isLoading: false });
        }
      },

      addInfrastructure: (item) => {
        const newId = `INF${String(get().infrastructures.length + 1).padStart(3, '0')}`;
        const newItem: Infrastructure = { ...item, id: newId, code: newId };
        set((s) => ({ infrastructures: [...s.infrastructures, newItem] }));
      },

      updateInfrastructure: (id, updates) => {
        set((s) => ({
          infrastructures: s.infrastructures.map((i) => (i.id === id ? { ...i, ...updates } : i)),
        }));
      },

      deleteInfrastructure: (id) => {
        set((s) => ({ infrastructures: s.infrastructures.filter((i) => i.id !== id) }));
      },
    }),
    {
      name: 'infrastructure-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ infrastructures: state.infrastructures }),
    }
  )
);
