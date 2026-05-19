/**
 * 仓库 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { getWarehouses, createWarehouse, updateWarehouse, deleteWarehouse, type Warehouse } from '../services/apiBasicDataService';

interface WarehouseStore {
  warehouses: Warehouse[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadWarehouses: () => Promise<void>;

  // CRUD
  addWarehouse: (warehouse: Partial<Warehouse>) => Promise<Warehouse>;
  editWarehouse: (id: string, warehouse: Partial<Warehouse>) => Promise<void>;
  removeWarehouse: (id: string) => Promise<void>;

  // 刷新
  refreshWarehouses: () => Promise<void>;
}

export const useWarehouseStore = create<WarehouseStore>()(
  persist(
    (set, get) => ({
      warehouses: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadWarehouses: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().warehouses.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getWarehouses();
          // 防御：确保 API 返回的是数组（可能返回包装对象 {success, data}）
          const safeData = Array.isArray(data) ? data : [];
          set({ warehouses: safeData, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载仓库失败', loading: false });
        }
      },

      addWarehouse: async (warehouse) => {
        const result = await createWarehouse(warehouse);
        set(state => ({ warehouses: [...state.warehouses, result] }));
        return result;
      },

      editWarehouse: async (id, warehouse) => {
        await updateWarehouse(id, warehouse);
        set(state => ({
          warehouses: state.warehouses.map(w => w.id === id ? { ...w, ...warehouse } : w)
        }));
      },

      removeWarehouse: async (id) => {
        await deleteWarehouse(id);
        set(state => ({ warehouses: state.warehouses.filter(w => w.id !== id) }));
      },

      refreshWarehouses: async () => {
        set({ lastFetch: null });
        await get().loadWarehouses();
      },
    }),
    {
      name: 'warehouse_store',
      partialize: (state) => ({ warehouses: state.warehouses }),
      merge: (persisted: unknown, current) => {
        const p = persisted as Partial<WarehouseStore> | null;
        return {
          ...current,
          warehouses: Array.isArray(p?.warehouses) ? p!.warehouses : current.warehouses,
        };
      },
    }
  )
);

// 辅助函数
export const getWarehouseByOid = (oid: string): Warehouse | undefined => {
  return useWarehouseStore.getState().warehouses.find(w => w.oid === oid);
};

export const getActiveWarehouses = (): Warehouse[] => {
  return useWarehouseStore.getState().warehouses.filter(w => w.status === 'active');
};
