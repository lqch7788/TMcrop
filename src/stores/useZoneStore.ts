/**
 * 区域 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';import { getZones, createZone, updateZone, deleteZone, type Zone } from '../services/apiBasicDataService';

interface ZoneStore {
  zones: Zone[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadZones: () => Promise<void>;

  // CRUD
  addZone: (zone: Partial<Zone>) => Promise<Zone>;
  editZone: (id: string, zone: Partial<Zone>) => Promise<void>;
  removeZone: (id: string) => Promise<void>;

  // 刷新
  refreshZones: () => Promise<void>;
}

export const useZoneStore = create<ZoneStore>()(
  (set, get)=> ({
      zones: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadZones: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().zones.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getZones();
          set({ zones: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载区域失败', loading: false });
        }
      },

      addZone: async (zone) => {
        const result = await createZone(zone);
        set(state => ({ zones: [...state.zones, result] }));
        return result;
      },

      editZone: async (id, zone) => {
        await updateZone(id, zone);
        set(state => ({
          zones: state.zones.map(z => z.id === id ? { ...z, ...zone } : z)
        }));
      },

      removeZone: async (id) => {
        await deleteZone(id);
        set(state => ({ zones: state.zones.filter(z => z.id !== id) }));
      },

      refreshZones: async () => {
        set({ lastFetch: null });
        await get().loadZones();
      },
    })
);

// 辅助函数
export const getZoneByOid = (oid: string): Zone | undefined => {
  return useZoneStore.getState().zones.find(z => z.oid === oid);
};

export const getZonesByBase = (baseOid: string): Zone[] => {
  return useZoneStore.getState().zones.filter(z => z.baseOid === baseOid);
};

export const getActiveZones = (): Zone[] => {
  return useZoneStore.getState().zones.filter(z => z.status === 'active');
};
