/**
 * 物料入库 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import * as warehouseService from '../services/apiWarehouseMaterialService';
import type { InboundRecord } from '../services/apiWarehouseMaterialService';

interface InboundState {
  items: InboundRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<InboundRecord, 'id'>) => Promise<InboundRecord | null>;
  updateItem: (id: number, updates: Partial<InboundRecord>) => Promise<InboundRecord | null>;
  deleteItem: (id: number) => Promise<boolean>;
  deleteItems: (ids: number[]) => Promise<boolean>;
}

export const useInboundStore = create<InboundState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await warehouseService.getInboundRecords();
        set({ items: data, isLoading: false });
      } catch (error) {
        console.error('[useInboundStore] 获取入库记录失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    addItem: async (item) => {
      try {
        const result = await warehouseService.createInboundRecord(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        console.error('[useInboundStore] 添加入库记录失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await warehouseService.updateInboundRecord(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...result } : i) }));
        return result;
      } catch (error) {
        console.error('[useInboundStore] 更新入库记录失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await warehouseService.deleteInboundRecord(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        console.error('[useInboundStore] 删除入库记录失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const results = await Promise.all(ids.map((id) => warehouseService.deleteInboundRecord(id)));
        const allSuccess = results.every(Boolean);
        if (allSuccess) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return allSuccess;
      } catch (error) {
        console.error('[useInboundStore] 批量删除入库记录失败:', error);
        return false;
      }
    },
  })
);
