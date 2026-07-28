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
  /**
   * 2026-07-28：获取指定 category/type/variety 下的下一个子品种序号（3位流水号）
   * - 在 store.items（全量来自后端 DB）中筛选本品种已用序号
   * - 返回「最低可用」的 001-998（严格流水号顺序填补间隙，不跳号）
   * - 跳过 999 占位码（"其他"），不计入 10/11 位历史脏数据
   * - 每个品种独立计数，不参考其它品种
   * - 1-998 全部占满时返回 'FULL'（调用方应拒绝保存）
   * - 替代老 cropVarietyService.getMaxDetailVarietyCode（只查 localStorage）
   */
  getNextSubVariety1Code: (categoryCode: string, typeCode: string, varietyCode: string) => string;
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
        // 2026-07-28 修复：不再清空 items（之前 `set({ items: [], ... })` 会导致 UI 闪烁空数据，
        // 也是"新增/编辑/删除后列表和树形图不同步"的根因之一）。
        // 改为只读取已有 items 构建下拉选项（不触发新的 API 请求）
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
        // 2026-07-27：不再静默吞错，透传后端错误（包括 409 Conflict）
        // 之前 addItem 返回 null，调用方拿不到具体原因，导致 409 被 UI 误判为"成功"
        console.error('[useCropVarietyStore] 新增失败:', error);
        throw error;
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
        // 2026-07-27 审核 C-4：不再静默吞错，透传后端错误（包括 409 Conflict）让调用方弹窗
        console.error('[useCropVarietyStore] 更新失败:', error);
        throw error;
      }
    },

    deleteItem: async (id) => {
      try {
        await apiCropVarietyService.deleteVariety(id);
        set(s => ({ items: get().items.filter(item => item.id !== id) }));
        await get().loadVarietyOptions();
        return true;
      } catch (error) {
        // 2026-07-27 审核 C-4：透传错误让调用方弹窗
        console.error('[useCropVarietyStore] 删除失败:', error);
        throw error;
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

    // 2026-07-28：在 store.items 中找指定 category/type/variety 下「最低可用」subVariety1Code（严格流水号顺序，填补间隙）
    getNextSubVariety1Code: (categoryCode, typeCode, varietyCode) => {
      const prefix = `${categoryCode}${typeCode}${varietyCode}`;
      const usedCodes = new Set<number>();
      for (const v of get().items) {
        // 2026-07-28：仅 9 位合法编码计入流水号；10/11 位历史脏数据忽略
        if (!v.cropCode || v.cropCode.length !== 9 || !v.cropCode.startsWith(prefix)) continue;
        const n = parseInt(v.cropCode.slice(6, 9), 10);
        // 跳过 999 占位码（"其他"），不参与流水号竞争
        if (!isNaN(n) && n >= 1 && n < 999) {
          usedCodes.add(n);
        }
      }
      // 严格流水号：1-998 中最低可用 = 不跳号、不参考其它品种
      for (let candidate = 1; candidate <= 998; candidate++) {
        if (!usedCodes.has(candidate)) {
          return String(candidate).padStart(3, '0');
        }
      }
      // 极端：1-998 全部占满
      return 'FULL';
    },
  })
);
