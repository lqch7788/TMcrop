/**
 * 作物品种库 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：组件 → Store → apiCropVarietyService → enhancedApiClient → Backend API
 */
import { create } from 'zustand';
import { CropVariety } from '../types/cropVariety';
import * as apiCropVarietyService from '../services/apiCropVarietyService';

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
  /** 强制刷新 */
  refreshItems: () => Promise<void>;

  // === CRUD ===
  /** 新增品种 */
  addItem: (data: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 更新品种 */
  updateItem: (id: string, updates: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 删除品种 */
  deleteItem: (id: string) => Promise<boolean>;
}

export const useCropVarietyStore = create<CropVarietyState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    isInitialized: false,
    error: null,

    loadItems: async () => {
      if (get().isLoading) return;
      set({ isLoading: true, error: null });
      try {
        const data = await apiCropVarietyService.getAllVarieties();
        set({ items: data, isLoading: false, isInitialized: true });
      } catch (error) {
        console.error('[useCropVarietyStore] 获取品种失败:', error);
        set({ error: (error as Error).message, isLoading: false, isInitialized: true });
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

    addItem: async (data) => {
      try {
        const id = await apiCropVarietyService.createVariety(data as Partial<CropVariety>);
        await get().refreshItems();
        return get().items.find(v => v.id === id) || null;
      } catch (error) {
        console.error('[useCropVarietyStore] 新增失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        await apiCropVarietyService.updateVariety(id, updates as Partial<CropVariety>);
        set(s => ({
          items: s.items.map(item =>
            item.id === id ? { ...item, ...updates, updateTime: new Date().toLocaleString('zh-CN') } : item
          )
        }));
        return get().items.find(v => v.id === id) || null;
      } catch (error) {
        console.error('[useCropVarietyStore] 更新失败:', error);
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
        return false;
      }
    },
  })
);
