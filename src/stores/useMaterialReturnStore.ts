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
  addItem: (item: Omit<MaterialReturnRecord, 'id'>) => Promise<MaterialReturnRecord | null>;
  updateItem: (id: string | number, updates: Partial<MaterialReturnRecord>) => Promise<boolean>;
  deleteItem: (id: string | number) => Promise<boolean>;
  deleteItems: (ids: (string | number)[]) => Promise<boolean>;
}

export const useMaterialReturnStore = create<MaterialReturnState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await returnService.getMaterialReturns();
        set({ items: data, isLoading: false });
      } catch (error) {
        console.error('[useMaterialReturnStore] 获取退料失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await returnService.createMaterialReturn(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        console.error('[useMaterialReturnStore] 添加退料失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await returnService.updateMaterialReturn(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        console.error('[useMaterialReturnStore] 更新退料失败:', error);
        return false;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await returnService.deleteMaterialReturn(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        console.error('[useMaterialReturnStore] 删除退料失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const result = await returnService.deleteMaterialReturns(ids);
        if (result) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return result;
      } catch (error) {
        console.error('[useMaterialReturnStore] 批量删除退料失败:', error);
        return false;
      }
    },
  })
);
