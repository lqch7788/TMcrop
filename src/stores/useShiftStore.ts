/**
 * 班次管理 Store - Zustand 状态管理
 * 统一管理班次的增删改查
 */
import { create } from 'zustand';
import {
  getShifts, createShift, updateShift, deleteShift,
  type Shift,
} from '../services/apiBasicDataService';

interface ShiftStore {
  shifts: Shift[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadShifts: () => Promise<void>;
  addShift: (data: Partial<Shift>) => Promise<Shift>;
  updateShift: (id: number, data: Partial<Shift>) => Promise<void>;
  removeShift: (id: number) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useShiftStore = create<ShiftStore>()(
  (set, get)=> ({
      shifts: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadShifts: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().shifts.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getShifts();
          set({ shifts: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载班次数据失败', loading: false });
        }
      },

      addShift: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createShift(data);
          set((s) => ({ shifts: [...s.shifts, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建班次失败', loading: false });
          throw error;
        }
      },

      updateShift: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateShift(id, data);
          set((s) => ({
            shifts: s.shifts.map((sh) => sh.id === id ? { ...sh, ...data } : sh),
            loading: false,
          }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新班次失败', loading: false });
          throw error;
        }
      },

      removeShift: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteShift(id);
          set((s) => ({ shifts: s.shifts.filter((sh) => sh.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除班次失败', loading: false });
          throw error;
        }
      },

      refreshAll: async () => {
        set({ lastFetch: null });
        await get().loadShifts();
      },
    })
);
