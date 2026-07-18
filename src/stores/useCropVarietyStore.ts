/**
 * 作物品种库 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：组件 → Store → apiCropVarietyService → enhancedApiClient → Backend API
 */
import { create } from 'zustand';
import { CropVariety, CropVarietyOption } from '../types/cropVariety';
import * as apiCropVarietyService from '../services/apiCropVarietyService';

interface CropVarietyState {
  /** 品种列表 */
  items: CropVariety[];
  /** 品种选项列表（用于下拉选择） */
  varietyOptions: CropVarietyOption[];
  /** 类别选项列表 */
  categoryOptions: Array<{ value: string; label: string }>;
  /** 加载状态 */
  isLoading: boolean;
  /** 是否已完成首次加载 */
  isInitialized: boolean;
  /** 错误信息 */
  error: string | null;

  // === 数据加载 ===
  /** 从后端加载所有品种 */
  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  /** 强制刷新 */
  refreshItems: () => Promise<void>;
  /** 加载品种选项（下拉选择用） */
  loadVarietyOptions: () => Promise<void>;

  // === CRUD ===
  /** 新增品种 */
  addItem: (data: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 更新品种 */
  updateItem: (id: string, updates: Partial<CropVariety>) => Promise<CropVariety | null>;
  /** 删除品种 */
  deleteItem: (id: string) => Promise<boolean>;

  // === 辅助方法 ===
  /** 根据编码获取品种 */
  getVarietyByCode: (cropCode: string) => CropVariety | undefined;
  /** 搜索品种 */
  searchVarieties: (keyword: string) => CropVariety[];
}

export const useCropVarietyStore = create<CropVarietyState>()(
  (set, get) => ({
    items: [],
    varietyOptions: [],
    categoryOptions: [],
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
        // logger.error('[useCropVarietyStore] 获取品种失败:', error);
        set({ error: (error as Error).message, isLoading: false, isInitialized: true });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    refreshItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await apiCropVarietyService.getAllVarieties();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[useCropVarietyStore] 刷新失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    loadVarietyOptions: async () => {
      try {
        // 清空现有数据，强制从API重新加载（避免API的旧数据含重复）
        set({ items: [], varietyOptions: [], categoryOptions: [] });
        await get().loadItems();
        const items = get().items;
        // 构建品种选项
        const varietyOptions: CropVarietyOption[] = items
          .filter(v => v.status === 'active')
          .map(v => ({
            value: v.cropCode,
            label: v.detailVarietyName || v.subVariety1Name || v.varietyName,
            category: v.categoryName,
            categoryCode: v.categoryCode,
            typeName: v.typeName,
            typeCode: v.typeCode,
            varietyCode: v.varietyCode,
            subVariety1Name: v.subVariety1Name,
            subVariety1Code: v.subVariety1Code,
            detailVarietyCode: v.detailVarietyCode,
            detailVarietyName: v.detailVarietyName,
            alias: v.alias,
            fullPath: `${v.categoryName} > ${v.typeName} > ${v.varietyName}${v.subVariety1Name ? ` > ${v.subVariety1Name}` : ''}${v.detailVarietyName ? ` > ${v.detailVarietyName}` : ''}`
          }));
        // 构建类别选项（从品种数据提取）
        const categoryMap = new Map<string, string>();
        items.forEach(v => {
          if (v.categoryCode && v.categoryName) {
            categoryMap.set(v.categoryCode, v.categoryName);
          }
        });
        const categoryOptions = Array.from(categoryMap.entries())
          .map(([value, label]) => ({ value, label }))
          .sort((a, b) => a.label.localeCompare(b.label));
        set({ varietyOptions, categoryOptions });
      } catch (error) {
        // logger.error('[useCropVarietyStore] 加载品种选项失败:', error);
      }
    },

    addItem: async (data) => {
      try {
        const id = await apiCropVarietyService.createVariety(data as Partial<CropVariety>);
        await get().refreshItems();
        await get().loadVarietyOptions();
        return get().items.find(v => v.id === id) || null;
      } catch (error) {
        // logger.error('[useCropVarietyStore] 新增失败:', error);
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
        await get().loadVarietyOptions();
        return get().items.find(v => v.id === id) || null;
      } catch (error) {
        // logger.error('[useCropVarietyStore] 更新失败:', error);
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        await apiCropVarietyService.deleteVariety(id);
        set(s => ({ items: s.items.filter(item => item.id !== id) }));
        await get().loadVarietyOptions();
        return true;
      } catch (error) {
        // logger.error('[useCropVarietyStore] 删除失败:', error);
        return false;
      }
    },

    getVarietyByCode: (cropCode) => {
      return get().items.find(v => v.cropCode === cropCode);
    },

    searchVarieties: (keyword) => {
      if (!keyword.trim()) return [];
      const lowerKeyword = keyword.toLowerCase().trim();
      return get().items.filter(v =>
        v.cropCode.toLowerCase().includes(lowerKeyword) ||
        v.varietyName.toLowerCase().includes(lowerKeyword) ||
        (v.subVariety1Name && v.subVariety1Name.toLowerCase().includes(lowerKeyword)) ||
        (v.detailVarietyName && v.detailVarietyName.toLowerCase().includes(lowerKeyword))
      );
    },
  })
);
