/**
 * 物料编码规则分类树 Store
 * 数据流: Component → Store → enhancedApiClient → Backend API (SQLite)
 *
 * 存储格式: 扁平行记录 ←DB→ 树形结构 (BigCategory[])
 * 树形结构用于前端展示，扁平结构用于 API 通信
 */

import { create } from 'zustand';
import {
  fetchCategories,
  createCategory,
  updateCategory,
  deleteCategory,
  type MaterialCodeCategory,
  type CreateCategoryPayload,
  type UpdateCategoryPayload
} from '../services/apiMaterialCodeCategoryService';

// ========== 树形结构类型 (与 codeRuleData.ts 保持一致) ==========

export interface SubCategory {
  code: string;
  name: string;
}

export interface MidCategory {
  code: string;
  name: string;
  subCategories: SubCategory[];
}

export interface BigCategory {
  code: string;
  name: string;
  nameEn: string;
  midCategories: MidCategory[];
}

// ========== Store 状态 ==========

interface MaterialCodeRuleState {
  // 核心数据
  categories: BigCategory[];
  isLoading: boolean;
  error: string | null;

  // 计算属性辅助
  isLoaded: boolean;

  // 数据加载
  loadCategories: () => Promise<void>;

  // 名称编辑
  updateBigName: (bigCode: string, newName: string) => Promise<void>;
  updateMidName: (bigCode: string, midCode: string, newName: string) => Promise<void>;
  updateSubName: (bigCode: string, midCode: string, subCode: string, newName: string) => Promise<void>;

  // 新增分类
  addBigCategory: (code: string, name: string, nameEn?: string) => Promise<void>;
  addMidCategory: (bigCode: string, code: string, name: string) => Promise<void>;
  addSubCategory: (bigCode: string, midCode: string, code: string, name: string) => Promise<void>;

  // 删除分类
  deleteBigCategory: (bigCode: string) => Promise<void>;
  deleteMidCategory: (bigCode: string, midCode: string) => Promise<void>;
  deleteSubCategory: (bigCode: string, midCode: string, subCode: string) => Promise<void>;
}

// ========== 工具函数: 扁平行转树形结构 ==========

function flatToTree(rows: MaterialCodeCategory[]): BigCategory[] {
  // 第一遍：隔离各层级
  const bigRows = rows.filter(r => r.level === 'big');
  const midRows = rows.filter(r => r.level === 'mid');
  const subRows = rows.filter(r => r.level === 'sub');

  return bigRows.map(big => {
    const mids = midRows
      .filter(m => m.parentCode === big.code)
      .sort((a, b) => a.sortOrder - b.sortOrder)
      .map(mid => {
        const parentKey = big.code + mid.code; // e.g., "SP01"
        const subs = subRows
          .filter(s => s.parentCode === parentKey)
          .sort((a, b) => a.sortOrder - b.sortOrder)
          .map(sub => ({ code: sub.code, name: sub.name }));
        return { code: mid.code, name: mid.name, subCategories: subs };
      });
    return {
      code: big.code,
      name: big.name,
      nameEn: big.nameEn || '',
      midCategories: mids,
    };
  });
}

export const useMaterialCodeRuleStore = create<MaterialCodeRuleState>()((set, get) => ({
  categories: [],
  isLoading: false,
  error: null,
  isLoaded: false,

  // ========== 加载全部数据 ==========
  loadCategories: async () => {
    if (get().isLoaded && get().categories.length > 0) return; // 防重复加载
    set({ isLoading: true, error: null });
    try {
      const rows = await fetchCategories();
      const tree = flatToTree(rows);
      set({ categories: tree, isLoading: false, isLoaded: true });
    } catch (err: unknown) {
      // logger.error('加载物料编码分类失败:', err);
      set({ isLoading: false, error: err instanceof Error ? err.message : '加载失败' });
    }
  },

  // ========== 更新大类名称 ==========
  updateBigName: async (bigCode, newName) => {
    await updateCategory(bigCode, { name: newName });
    set(state => ({
      categories: state.categories.map(b =>
        b.code === bigCode ? { ...b, name: newName } : b
      ),
    }));
  },

  // ========== 更新中类名称 ==========
  updateMidName: async (bigCode, midCode, newName) => {
    await updateCategory(midCode, { name: newName });
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: b.midCategories.map(m =>
            m.code === midCode ? { ...m, name: newName } : m
          ),
        };
      }),
    }));
  },

  // ========== 更新小类名称 ==========
  updateSubName: async (bigCode, midCode, subCode, newName) => {
    await updateCategory(subCode, { name: newName });
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: b.midCategories.map(m => {
            if (m.code !== midCode) return m;
            return {
              ...m,
              subCategories: m.subCategories.map(s =>
                s.code === subCode ? { ...s, name: newName } : s
              ),
            };
          }),
        };
      }),
    }));
  },

  // ========== 新增大类 ==========
  addBigCategory: async (code, name, nameEn) => {
    const payload: CreateCategoryPayload = { code, name, nameEn: nameEn || '', level: 'big', ruleType: 'material' };
    await createCategory(payload);
    set(state => ({
      categories: [...state.categories, { code, name, nameEn: nameEn || '', midCategories: [] }],
    }));
  },

  // ========== 新增中类 ==========
  addMidCategory: async (bigCode, code, name) => {
    const payload: CreateCategoryPayload = { code, name, parentCode: bigCode, level: 'mid', ruleType: 'material' };
    await createCategory(payload);
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: [...b.midCategories, { code, name, subCategories: [] }],
        };
      }),
    }));
  },

  // ========== 新增小类 ==========
  addSubCategory: async (bigCode, midCode, code, name) => {
    const parentKey = bigCode + midCode; // e.g., "SP01"
    const payload: CreateCategoryPayload = { code, name, parentCode: parentKey, level: 'sub', ruleType: 'material' };
    await createCategory(payload);
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: b.midCategories.map(m => {
            if (m.code !== midCode) return m;
            return {
              ...m,
              subCategories: [...m.subCategories, { code, name }],
            };
          }),
        };
      }),
    }));
  },

  // ========== 删除大类 ==========
  deleteBigCategory: async (bigCode) => {
    await deleteCategory(bigCode);
    set(state => ({
      categories: state.categories.filter(b => b.code !== bigCode),
    }));
  },

  // ========== 删除中类 ==========
  deleteMidCategory: async (bigCode, midCode) => {
    await deleteCategory(midCode);
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: b.midCategories.filter(m => m.code !== midCode),
        };
      }),
    }));
  },

  // ========== 删除小类 ==========
  deleteSubCategory: async (bigCode, midCode, subCode) => {
    await deleteCategory(subCode);
    set(state => ({
      categories: state.categories.map(b => {
        if (b.code !== bigCode) return b;
        return {
          ...b,
          midCategories: b.midCategories.map(m => {
            if (m.code !== midCode) return m;
            return {
              ...m,
              subCategories: m.subCategories.filter(s => s.code !== subCode),
            };
          }),
        };
      }),
    }));
  },
}));
