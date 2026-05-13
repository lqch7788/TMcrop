/**
 * 温室/基地 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getGreenhouses, createGreenhouse, updateGreenhouse, deleteGreenhouse, type Greenhouse } from '../services/apiBasicDataService';

interface GreenhouseStore {
  greenhouses: Greenhouse[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadGreenhouses: () => Promise<void>;

  // CRUD
  addGreenhouse: (greenhouse: Partial<Greenhouse>) => Promise<Greenhouse>;
  editGreenhouse: (id: string, greenhouse: Partial<Greenhouse>) => Promise<void>;
  removeGreenhouse: (id: string) => Promise<void>;

  // 刷新
  refreshGreenhouses: () => Promise<void>;
}

export const useGreenhouseStore = create<GreenhouseStore>()(
  persist(
    (set, get) => ({
      greenhouses: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadGreenhouses: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().greenhouses.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getGreenhouses();
          set({ greenhouses: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载温室失败', loading: false });
        }
      },

      addGreenhouse: async (greenhouse) => {
        const result = await createGreenhouse(greenhouse);
        set(state => ({ greenhouses: [...state.greenhouses, result] }));
        return result;
      },

      editGreenhouse: async (id, greenhouse) => {
        await updateGreenhouse(id, greenhouse);
        set(state => ({
          greenhouses: state.greenhouses.map(g => g.id === id ? { ...g, ...greenhouse } : g)
        }));
      },

      removeGreenhouse: async (id) => {
        await deleteGreenhouse(id);
        set(state => ({ greenhouses: state.greenhouses.filter(g => g.id !== id) }));
      },

      refreshGreenhouses: async () => {
        set({ lastFetch: null });
        await get().loadGreenhouses();
      },
    }),
    {
      name: 'greenhouse_store',
      partialize: (state) => ({ greenhouses: state.greenhouses }),
    }
  )
);

// 辅助函数
export const getGreenhouseByOid = (oid: string): Greenhouse | undefined => {
  return useGreenhouseStore.getState().greenhouses.find(g => g.oid === oid);
};

export const getGreenhousesByBase = (baseOid: string): Greenhouse[] => {
  return useGreenhouseStore.getState().greenhouses.filter(g => g.baseOid === baseOid);
};

export const getActiveGreenhouses = (): Greenhouse[] => {
  return useGreenhouseStore.getState().greenhouses.filter(g => g.status === 'active');
};
