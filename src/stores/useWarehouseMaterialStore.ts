/**
 * 仓库物料 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import * as warehouseService from '../services/apiWarehouseMaterialService';
import type { Material } from '../services/apiWarehouseMaterialService';

interface WarehouseMaterialState {
  items: Material[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<Material, 'id'>) => Promise<Material | null>;
  updateItem: (id: number, updates: Partial<Material>) => Promise<Material | null>;
  deleteItem: (id: number) => Promise<boolean>;
  deleteItems: (ids: number[]) => Promise<boolean>;
}

export const useWarehouseMaterialStore = create<WarehouseMaterialState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await warehouseService.getMaterials();
        set({ items: Array.isArray(data) ? data : [], isLoading: false });
      } catch (error) {
        // logger.error('[useWarehouseMaterialStore] 获取物料失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    addItem: async (item) => {
      try {
        const result = await warehouseService.createMaterial(item);
        // 修复：新建物料 unshift 到列表头部，与后端 ORDER BY id DESC 一致
        // 旧 push 到末尾会让用户在第一页看不到新建的
        if (result) set((s) => ({ items: [{ ...item, id: result.id } as Material, ...s.items] }));
        return result;
      } catch (error) {
        // logger.error('[useWarehouseMaterialStore] 添加物料失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await warehouseService.updateMaterial(id, updates);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
        return result;
      } catch (error) {
        // logger.error('[useWarehouseMaterialStore] 更新物料失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await warehouseService.deleteMaterial(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        // logger.error('[useWarehouseMaterialStore] 删除物料失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const results = await Promise.all(ids.map((id) => warehouseService.deleteMaterial(id)));
        const allSuccess = results.every(Boolean);
        if (allSuccess) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return allSuccess;
      } catch (error) {
        // logger.error('[useWarehouseMaterialStore] 批量删除物料失败:', error);
        return false;
      }
    },
  })
);
