/**
 * 作物品种库 Zustand Store
 * 数据流：组件 → Store → apiCropVarietyService → enhancedApiClient → Backend API
 * 三级降级：API → IndexedDB → localStorage
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { CropVariety } from '../types/cropVariety';
import * as apiCropVarietyService from '../services/apiCropVarietyService';
import * as cropVarietyService from '../services/cropVarietyService';

interface CropVarietyState {
  /** 品种列表 */
  items: CropVariety[];
  /** 加载状态 */
  isLoading: boolean;
  /** 是否已完成首次加载 */
  isInitialized: boolean;
  /** 错误信息 */
  error: string | null;

  // === 数据加载 ===
  /** 从后端加载所有品种 */
  loadItems: () => Promise<void>;
  /** 强制刷新（跳过缓存） */
  refreshItems: () => Promise<void>;

  // === CRUD ===
  /** 新增品种 */
  addItem: (data: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 更新品种 */
  updateItem: (id: string, updates: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 删除品种 */
  deleteItem: (id: string) => Promise<boolean>;

  // === 数据迁移 ===
  /** 将 localStorage 数据迁移到后端数据库 */
  migrateFromLocalStorage: () => Promise<{ inserted: number; skipped: number }>;
}

export const useCropVarietyStore = create<CropVarietyState>()(
  persist(
    (set, get) => ({
      items: [],
      isLoading: false,
      isInitialized: false,
      error: null,

      // ==================== 数据加载 ====================

      loadItems: async () => {
        // 避免重复加载
        if (get().isLoading) return;

        set({ isLoading: true, error: null });
        try {
          // 从 API 获取
          const data = await apiCropVarietyService.getAllVarieties();
          set({ items: data, isLoading: false, isInitialized: true });
        } catch (error) {
          console.error('[useCropVarietyStore] API获取失败，降级到localStorage:', error);
          // 降级：从 localStorage 读取
          try {
            const localData = cropVarietyService.getAllVarieties();
            set({ items: localData, isLoading: false, isInitialized: true, error: '使用本地缓存数据' });
          } catch (localError) {
            set({ error: (error as Error).message, isLoading: false, isInitialized: true });
          }
        }
      },

      refreshItems: async () => {
        set({ isLoading: true, error: null });
        try {
          const data = await apiCropVarietyService.getAllVarieties();
          set({ items: data, isLoading: false });
        } catch (error) {
          console.error('[useCropVarietyStore] 刷新失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ==================== CRUD ====================

      addItem: async (data) => {
        try {
          const id = await apiCropVarietyService.createVariety(data as Partial<CropVariety>);
          // 重新从 API 获取完整数据以确保一致性
          await get().refreshItems();
          return get().items.find(v => v.id === id) || null;
        } catch (error) {
          console.error('[useCropVarietyStore] 新增失败:', error);
          // 降级：本地新增
          try {
            const input = data as any;
            const newVariety = cropVarietyService.addVariety(input);
            if (newVariety) {
              set(s => ({ items: [newVariety, ...s.items] }));
              return newVariety;
            }
          } catch (localError) {
            console.error('[useCropVarietyStore] 本地新增也失败:', localError);
          }
          return null;
        }
      },

      updateItem: async (id, updates) => {
        try {
          await apiCropVarietyService.updateVariety(id, updates as Partial<CropVariety>);
          // 乐观更新本地状态
          set(s => ({
            items: s.items.map(item =>
              item.id === id ? { ...item, ...updates, updateTime: new Date().toLocaleString('zh-CN') } : item
            )
          }));
          return get().items.find(v => v.id === id) || null;
        } catch (error) {
          console.error('[useCropVarietyStore] 更新失败:', error);
          // 降级：本地更新
          try {
            const updated = cropVarietyService.updateVariety(id, updates as any);
            if (updated) {
              set(s => ({
                items: s.items.map(item => item.id === id ? updated : item)
              }));
              return updated;
            }
          } catch (localError) {
            console.error('[useCropVarietyStore] 本地更新也失败:', localError);
          }
          return null;
        }
      },

      deleteItem: async (id) => {
        try {
          await apiCropVarietyService.deleteVariety(id);
          set(s => ({ items: s.items.filter(item => item.id !== id) }));
          return true;
        } catch (error) {
          console.error('[useCropVarietyStore] 删除失败:', error);
          // 降级：本地删除
          try {
            cropVarietyService.deleteVariety(id);
            set(s => ({ items: s.items.filter(item => item.id !== id) }));
            return true;
          } catch (localError) {
            console.error('[useCropVarietyStore] 本地删除也失败:', localError);
            return false;
          }
        }
      },

      // ==================== 数据迁移 ====================

      migrateFromLocalStorage: async () => {
        try {
          // 读取 localStorage 中的全部品种数据
          const localData = cropVarietyService.getAllVarieties();
          if (localData.length === 0) {
            return { inserted: 0, skipped: 0 };
          }

          // 批量导入到后端数据库（后端按 crop_code 去重）
          const result = await apiCropVarietyService.bulkImportVarieties(
            localData as unknown as Record<string, unknown>[]
          );

          console.log(`[useCropVarietyStore] 迁移完成: 新增 ${result.inserted}, 跳过 ${result.skipped}`);

          // 迁移后重新加载
          await get().refreshItems();

          return { inserted: result.inserted, skipped: result.skipped };
        } catch (error) {
          console.error('[useCropVarietyStore] 迁移失败:', error);
          return { inserted: 0, skipped: 0 };
        }
      },
    }),
    {
      name: 'crop-variety-store',
      partialize: (state) => ({
        items: state.items,
        isInitialized: state.isInitialized,
      }),
    }
  )
);
