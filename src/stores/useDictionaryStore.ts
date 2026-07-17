/**
 * 字典 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { getDictionaries, type Dictionary } from '../services/apiBasicDataService';
import { logger } from '../lib/logger';

interface DictionaryStore {
  dictionaries: Dictionary[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadDictionaries: () => Promise<void>;

  // 刷新
  refreshDictionaries: () => Promise<void>;
}

export const useDictionaryStore = create<DictionaryStore>()(
  (set, get) => ({
      dictionaries: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadDictionaries: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        // 缓存5分钟，但先清空强制重新加载（解决数据格式问题）
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().dictionaries.length > 0) {
          // 检查数据是否有效（是否有 categoryCode 字段）
          const dicts = get().dictionaries;
          if (dicts.length > 0 && 'categoryCode' in dicts[0]) {
            return;
          }
        }

        set({ loading: true, error: null });
        try {
          const data = await getDictionaries();
          // 字典数据加载成功
          set({ dictionaries: data, loading: false, lastFetch: now });
        } catch (error) {
          logger.error('[DictionaryStore] 加载字典失败', error);
          set({ error: error instanceof Error ? error.message : '加载字典失败', loading: false });
        }
      },

      refreshDictionaries: async () => {
        set({ lastFetch: null });
        await get().loadDictionaries();
      },
    })
);

// 辅助函数 - 按分类获取字典项
// 注意：API返回的是 snake_case (category_code, dict_code)，需要兼容处理
// 还要兼容旧格式: category + code + name
export const getDictItems = (category: string): Dictionary[] => {
  const dicts = useDictionaryStore.getState().dictionaries;
  return dicts
    .filter(d => {
      const cat = d.categoryCode || (d as any).category_code || (d as any).category;
      return cat === category && d.status === 'active';
    })
    .map(d => ({
      // 统一转换为新格式
      id: d.id,
      categoryCode: d.categoryCode || (d as any).category_code || (d as any).category,
      dictCode: d.dictCode || (d as any).dict_code || (d as any).code,
      dictLabel: d.dictLabel || (d as any).name,
      dictValue: d.dictValue || (d as any).name,
      sortOrder: d.sortOrder || (d as any).sort_order,
      color: d.color,
      status: d.status,
      createdAt: d.createdAt || (d as any).created_at,
      updatedAt: (d as any).updatedAt || (d as any).updated_at,
    }));
};

// 获取字典项名称
// 2026-07-17：pesticide_type 字典兜底（解决字典未加载/缓存未刷新显示英文 bug）
// 覆盖全部分类常用码 — 即使后端字典未拉到，前端也能显示中文
const DICT_FALLBACK: Record<string, Record<string, string>> = {
  pesticide_type: {
    insecticide: '杀虫剂',
    fungicide: '杀菌剂',
    herbicide: '除草剂',
    acaricide: '杀螨剂',
    plant_growth_regulator: '调节剂',
    protective: '保护剂',
    adjuvant: '助剂',
    other: '其他',
    nematicide: '杀线虫剂',
    insecticide_chewing: '杀虫剂-咀嚼式',
    insecticide_sucking: '杀虫剂-刺吸式',
    acaricide_mite: '杀螨剂-螨类',
    fungicide_fungi: '杀菌剂-真菌',
    fungicide_bacteria: '杀菌剂-细菌',
    fungicide_virus: '杀菌剂-病毒',
    protective_contact: '保护剂-接触式',
    protective_systemic: '保护剂-系统性',
    adjuvant_penetration: '助剂-渗透剂',
    adjuvant_synergist: '助剂-增效剂',
    pgr_promoter: '调节剂-促进生长',
    pgr_retardant: '调节剂-延缓生长',
    pgr_ripening: '调节剂-催熟催黄',
    pgr_rooting: '调节剂-生根壮苗',
    pgr_fruit_set: '调节剂-保花保果',
    pgr_stress: '调节剂-抗逆增效',
  },
  application_method: {
    spray: '喷雾',
    drench: '灌根',
    fumigation: '熏蒸',
    broadcast: '撒施',
    trap: '诱捕',
    soak: '浸泡',
    other: '其他',
  },
  control_type: {
    chemical: '化学防治',
    bio: '生物防治',
    physical: '物理防治',
  },
};

export const getDictItemName = (category: string, code: string): string => {
  if (!code) return '';

  const state = useDictionaryStore.getState();

  // 如果字典未加载，触发加载（异步，不阻塞）
  if (state.dictionaries.length === 0 && !state.loading) {
    state.loadDictionaries();
  }

  const dicts = state.dictionaries;

  // 标准化字段映射，兼容多种数据格式
  const item = dicts.find(d => {
    const cat = d.categoryCode || (d as any).category || (d as any).category_code;
    const c = d.dictCode || (d as any).code || (d as any).dict_code;
    return cat === category && c === code;
  });

  if (item) {
    return item.dictLabel || (item as any).dict_label || (item as any).name || code;
  }

  // 2026-07-17：字典未命中查 FALLBACK 兜底（前端不显示英文原码）
  const fallback = DICT_FALLBACK[category]?.[code];
  if (fallback) return fallback;

  if (!item) {
    // 如果找不到，尝试模糊匹配（处理空格/逗号分隔的多值情况）
    const codeParts = code.split(/[,\s]+/).filter(Boolean);
    if (codeParts.length > 1) {
      // 多个值，用中文分隔符连接
      const names = codeParts.map(part => {
        const partItem = dicts.find(d => {
          const cat = d.categoryCode || (d as any).category || (d as any).category_code;
          const c = d.dictCode || (d as any).code || (d as any).dict_code;
          return cat === category && c === part;
        });
        return partItem
          ? (partItem.dictLabel || (partItem as any).name || partItem.dictCode || part)
          : part;
      });
      return names.join('、');
    }
    return code; // 找不到就返回原始 code
  }

  // 优先使用 name（兼容旧格式），其次 dictLabel（新格式），最后是 dictCode
  return (item as any).name || item.dictLabel || item.dictCode || code;
};

// 2026-07-10：getDictLabel 别名（兼容其他组件 import 旧名）
export const getDictLabel = getDictItemName;

// 获取字典分类列表
export const getDictionaryCategories = (): string[] => {
  const dicts = useDictionaryStore.getState().dictionaries;
  const categories = [...new Set(dicts.map(d => d.categoryCode || (d as any).category_code))];
  return categories;
};
