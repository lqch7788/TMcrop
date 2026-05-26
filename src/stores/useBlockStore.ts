/**
 * 地块 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';import { getBlocks, createBlock, updateBlock, deleteBlock, type Block } from '../services/apiBasicDataService';

interface BlockStore {
  blocks: Block[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadBlocks: () => Promise<void>;

  // CRUD
  addBlock: (block: Partial<Block>) => Promise<Block>;
  editBlock: (id: string, block: Partial<Block>) => Promise<void>;
  removeBlock: (id: string) => Promise<void>;

  // 刷新
  refreshBlocks: () => Promise<void>;
}

export const useBlockStore = create<BlockStore>()(
  (set, get)=> ({
      blocks: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadBlocks: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().blocks.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getBlocks();
          set({ blocks: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载地块失败', loading: false });
        }
      },

      addBlock: async (block) => {
        const result = await createBlock(block);
        set(state => ({ blocks: [...state.blocks, result] }));
        return result;
      },

      editBlock: async (id, block) => {
        await updateBlock(id, block);
        set(state => ({
          blocks: state.blocks.map(b => b.id === id ? { ...b, ...block } : b)
        }));
      },

      removeBlock: async (id) => {
        await deleteBlock(id);
        set(state => ({ blocks: state.blocks.filter(b => b.id !== id) }));
      },

      refreshBlocks: async () => {
        set({ lastFetch: null });
        await get().loadBlocks();
      },
    })
);

// 辅助函数
export const getBlockByOid = (oid: string): Block | undefined => {
  return useBlockStore.getState().blocks.find(b => b.oid === oid);
};

export const getBlocksByZone = (zoneOid: string): Block[] => {
  return useBlockStore.getState().blocks.filter(b => b.zoneOid === zoneOid);
};

export const getActiveBlocks = (): Block[] => {
  return useBlockStore.getState().blocks.filter(b => b.status === 'active');
};
