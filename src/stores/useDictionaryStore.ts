/**
 * 字典 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
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
  persist(
    (set, get) => ({
      dictionaries: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadDictionaries: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().dictionaries.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getDictionaries();
          set({ dictionaries: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载字典失败', loading: false });
        }
      },

      refreshDictionaries: async () => {
        set({ lastFetch: null });
        await get().loadDictionaries();
      },
    }),
    {
      name: 'dictionary_store',
      partialize: (state) => ({ dictionaries: state.dictionaries }),
    }
  )
);

// 辅助函数 - 按分类获取字典项
export const getDictItems = (category: string): Dictionary[] => {
  return useDictionaryStore.getState().dictionaries.filter(
    d => d.categoryCode === category && d.status === 'active'
  );
};

// 获取字典项名称
export const getDictItemName = (category: string, code: string): string => {
  const item = useDictionaryStore.getState().dictionaries.find(
    d => d.categoryCode === category && d.dictCode === code
  );
  return item?.dictLabel || code;
};

// 获取字典分类列表
export const getDictionaryCategories = (): string[] => {
  const dicts = useDictionaryStore.getState().dictionaries;
  const categories = [...new Set(dicts.map(d => d.categoryCode))];
  return categories;
};
