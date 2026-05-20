/**
 * 仓库物料 Zustand Store
 * 数据流：enhancedApiClient → Store → 页面组件
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import * as warehouseService from '../services/apiWarehouseMaterialService';
import type { Material } from '../services/apiWarehouseMaterialService';

interface WarehouseMaterialState {
  items: Material[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  addItem: (item: Omit<Material, 'id'>) => Promise<Material | null>;
  updateItem: (id: number, updates: Partial<Material>) => Promise<Material | null>;
  deleteItem: (id: number) => Promise<boolean>;
  deleteItems: (ids: number[]) => Promise<boolean>;
}

export const useWarehouseMaterialStore = create<WarehouseMaterialState>()(
  persist(
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
          console.error('[useWarehouseMaterialStore] 获取物料失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      addItem: async (item) => {
        try {
          const result = await warehouseService.createMaterial(item);
          if (result) set((s) => ({ items: [...s.items, { ...item, id: result.id } as Material] }));
          return result;
        } catch (error) {
          console.error('[useWarehouseMaterialStore] 添加物料失败:', error);
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          const result = await warehouseService.updateMaterial(id, updates);
          if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...updates } : i) }));
          return result;
        } catch (error) {
          console.error('[useWarehouseMaterialStore] 更新物料失败:', error);
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          const result = await warehouseService.deleteMaterial(id);
          if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
          return result;
        } catch (error) {
          console.error('[useWarehouseMaterialStore] 删除物料失败:', error);
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
          console.error('[useWarehouseMaterialStore] 批量删除物料失败:', error);
          return false;
        }
      },
    }),
    {
      name: 'warehouse-material-storage',
      partialize: (s) => ({ items: s.items }),
      merge: (persisted, current) => ({
        ...current,
        ...(persisted as Record<string, unknown>),
        items: Array.isArray((persisted as Record<string, unknown>)?.items)
          ? (persisted as Record<string, unknown>).items as Material[]
          : (current as { items: Material[] }).items,
      }),
    }
  )
);
