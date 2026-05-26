/**
 * 职位 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';import { getPositions, createPosition, updatePosition, deletePosition, type Position } from '../services/apiBasicDataService';

interface PositionStore {
  positions: Position[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadPositions: () => Promise<void>;

  // CRUD
  addPosition: (position: Partial<Position>) => Promise<Position>;
  editPosition: (id: string, position: Partial<Position>) => Promise<void>;
  removePosition: (id: string) => Promise<void>;

  // 刷新
  refreshPositions: () => Promise<void>;
}

export const usePositionStore = create<PositionStore>()(
  (set, get)=> ({
      positions: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadPositions: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().positions.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getPositions();
          set({ positions: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载职位失败', loading: false });
        }
      },

      addPosition: async (position) => {
        const result = await createPosition(position);
        set(state => ({ positions: [...state.positions, result] }));
        return result;
      },

      editPosition: async (id, position) => {
        await updatePosition(id, position);
        set(state => ({
          positions: state.positions.map(p => p.id === id ? { ...p, ...position } : p)
        }));
      },

      removePosition: async (id) => {
        await deletePosition(id);
        set(state => ({ positions: state.positions.filter(p => p.id !== id) }));
      },

      refreshPositions: async () => {
        set({ lastFetch: null });
        await get().loadPositions();
      },
    })
);

// 辅助函数
export const getPositionByOid = (oid: string): Position | undefined => {
  return usePositionStore.getState().positions.find(p => p.oid === oid);
};

export const getPositionsByDepartment = (departmentOid: string): Position[] => {
  return usePositionStore.getState().positions.filter(p => p.departmentOid === departmentOid);
};

export const getActivePositions = (): Position[] => {
  return usePositionStore.getState().positions.filter(p => p.status === 'active');
};
