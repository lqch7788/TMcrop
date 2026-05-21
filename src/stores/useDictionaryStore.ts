/**
 * 字典 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { getDictionaries, type Dictionary } from '../services/apiBasicDataService';

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
          console.error('[DictionaryStore] 加载字典失败:', error);
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
export const getDictItems = (category: string): Dictionary[] => {
  const dicts = useDictionaryStore.getState().dictionaries;
  return dicts.filter(
    d => (d.categoryCode === category || (d as any).category_code === category) && d.status === 'active'
  );
};

// 获取字典项名称
export const getDictItemName = (category: string, code: string): string => {
  const dicts = useDictionaryStore.getState().dictionaries;
  const item = dicts.find(
    d => (d.categoryCode === category || (d as any).category_code === category) &&
         (d.dictCode === code || (d as any).dict_code === code)
  );
  return item?.dictLabel || code;
};

// 获取字典分类列表
export const getDictionaryCategories = (): string[] => {
  const dicts = useDictionaryStore.getState().dictionaries;
  const categories = [...new Set(dicts.map(d => d.categoryCode || (d as any).category_code))];
  return categories;
};
