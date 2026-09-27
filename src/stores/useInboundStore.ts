/**
 * 物料入库 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */
import { create } from 'zustand';
import * as warehouseService from '../services/apiWarehouseMaterialService';
import type { InboundRecord } from '../services/apiWarehouseMaterialService';

interface InboundState {
  items: InboundRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<InboundRecord, 'id'>) => Promise<InboundRecord | null>;
  updateItem: (id: number, updates: Partial<InboundRecord>) => Promise<InboundRecord | null>;
  deleteItem: (id: number) => Promise<boolean>;
  deleteItems: (ids: number[]) => Promise<boolean>;
}

export const useInboundStore = create<InboundState>()(
  // 2026-09-27 修复：此前签名为 (set)，但 fetchItems 用了 get() → 调用即 ReferenceError
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await warehouseService.getInboundRecords();
        set({ items: data, isLoading: false });
      } catch (error) {
        // logger.error('[useInboundStore] 获取入库记录失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    addItem: async (item) => {
      try {
        const result = await warehouseService.createInboundRecord(item);
        if (result) set((s) => ({ items: [result, ...s.items] }));
        return result;
      } catch (error) {
        // logger.error('[useInboundStore] 添加入库记录失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      try {
        // 2026-09-27：只提交后端白名单字段——此前传 {...record} 携带 id/voidedDate 会被
        // 400 拒绝（"包含非法更新字段"），导致编辑保存与作废全部失败。
        // 后端已做兼容剔除，这里前端也保持干净（undefined 字段会被 JSON.stringify 丢弃，不会误覆盖）
        const payload = {
          code: updates.code,
          inboundDate: updates.inboundDate,
          supplier: updates.supplier,
          operator: updates.operator,
          status: updates.status,
          materials: updates.materials,
        };
        const result = await warehouseService.updateInboundRecord(id, payload);
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? { ...i, ...result } : i) }));
        return result;
      } catch (error) {
        // 2026-09-27 fail-loud：错误写入 store.error，调用方据此提示用户（此前静默吞掉，
        // 后端 400 拒绝时前端无任何反馈 → 用户以为"删不掉/没反应"）
        set({ error: error instanceof Error ? error.message : '更新入库记录失败' });
        return null;
      }
    },

    deleteItem: async (id) => {
      try {
        const result = await warehouseService.deleteInboundRecord(id);
        if (result) set((s) => ({ items: s.items.filter((i) => i.id !== id) }));
        return result;
      } catch (error) {
        // 2026-09-27 fail-loud：同 updateItem
        set({ error: error instanceof Error ? error.message : '删除入库记录失败' });
        return false;
      }
    },

    deleteItems: async (ids) => {
      try {
        const results = await Promise.all(ids.map((id) => warehouseService.deleteInboundRecord(id)));
        const allSuccess = results.every(Boolean);
        if (allSuccess) set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)) }));
        return allSuccess;
      } catch (error) {
        // logger.error('[useInboundStore] 批量删除入库记录失败:', error);
        return false;
      }
    },
  })
);
