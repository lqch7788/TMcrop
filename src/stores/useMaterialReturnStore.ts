/**
 * 生产退料 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import { MaterialReturnRecord } from '../services/apiMaterialReturnService';
import * as returnService from '../services/apiMaterialReturnService';

interface MaterialReturnState {
  items: MaterialReturnRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<MaterialReturnRecord, 'id'>) => Promise<MaterialReturnRecord | null>;
  updateItem: (id: string | number, updates: Partial<MaterialReturnRecord>) => Promise<boolean>;
  deleteItem: (id: string | number) => Promise<boolean>;
  deleteItems: (ids: (string | number)[]) => Promise<boolean>;
}

export const useMaterialReturnStore = create<MaterialReturnState>()(
  // 2026-09-27 修复（P2-8）：补上 get 参数——此前 create((set) => ...) 未声明 get，
  // fetchItems 内的 get() 调用即 ReferenceError（当前无调用方，一旦调用必崩）
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await returnService.getMaterialReturns();
        set({ items: data, isLoading: false });
      } catch (error) {
        const msg = error instanceof Error ? error.message : '获取退料失败';
        set({ error: msg, isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    addItem: async (item) => {
      try {
        const result = await returnService.createMaterialReturn(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        // 2026-09-27 修复（P2-8）：silent swallow → fail loud（此前吞错返回 null，调用方无感知）
        const msg = error instanceof Error ? error.message : '新增退料失败';
        set({ error: msg });
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await returnService.updateMaterialReturn(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : '更新退料失败';
        set({ error: msg });
        return false;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await returnService.deleteMaterialReturn(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : '删除退料失败';
        set({ error: msg });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await returnService.deleteMaterialReturns(ids);
        if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return result;
      } catch (error) {
        const msg = error instanceof Error ? error.message : '批量删除退料失败';
        set({ error: msg });
        return false;
      }
    },
  })
);
