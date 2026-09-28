/**
 * 生产退料 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 *
 * 2026-09-28 审核修复：
 *  - 所有 action 失败时设置 error 并 **throw**（fail loud，调用方必须感知失败）
 *    —— 此前吞错返回 null/false，调用方无法区分"成功"与"失败"，
 *    导致保存失败时 UI 仍弹窗关闭、用户以为已保存。
 *  - updateItem 用后端返回的完整记录替换（后端 PUT 现已返回完整记录，
 *    含状态规范化后的 status/statusClass 与库存联动后的最新数据）。
 *  - 新增 voidItem（作废退料单）。
 */
import { create } from 'zustand';
import { MaterialReturnRecord } from '../services/apiMaterialReturnService';
import * as returnService from '../services/apiMaterialReturnService';

interface MaterialReturnState {
  items: MaterialReturnRecord[];
  isLoading: boolean;
  error: string | null;

  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  addItem: (item: Omit<MaterialReturnRecord, 'id'>) => Promise<MaterialReturnRecord>;
  updateItem: (id: string | number, updates: Partial<MaterialReturnRecord>) => Promise<MaterialReturnRecord | null>;
  voidItem: (id: string | number, reason: string) => Promise<MaterialReturnRecord | null>;
  deleteItem: (id: string | number) => Promise<void>;
  deleteItems: (ids: (string | number)[]) => Promise<void>;
}

/** 从 unknown 提取错误文案 */
function toMessage(error: unknown, fallback: string): string {
  return error instanceof Error ? error.message : fallback;
}

export const useMaterialReturnStore = create<MaterialReturnState>()(
  (set, get) => ({
    items: [],
    isLoading: false,
    error: null,

    loadItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const data = await returnService.getMaterialReturns();
        set({ items: data, isLoading: false });
      } catch (error) {
        const msg = toMessage(error, '获取退料失败');
        set({ error: msg, isLoading: false });
        throw new Error(msg);
      }
    },

    // 2026-07-18 P2-M4：fetchItems 别名
    fetchItems: async () => { await get().loadItems(); },

    addItem: async (item) => {
      try {
        const result = await returnService.createMaterialReturn(item);
        if (!result) throw new Error('创建退料失败：后端未返回记录');
        // 后端返回完整记录，直接前插（无需再 reload）
        set((s) => ({ items: [result, ...s.items], error: null }));
        return result;
      } catch (error) {
        const msg = toMessage(error, '新增退料失败');
        set({ error: msg });
        throw new Error(msg);
      }
    },

    updateItem: async (id, updates) => {
      try {
        const result = await returnService.updateMaterialReturn(id, updates);
        // 后端返回完整记录 → 整行替换；兜底为局部 merge（兼容旧响应）
        set((s) => ({
          items: s.items.map((i) => {
            if (i.id !== id) return i;
            return typeof result === 'object' && result !== null
              ? (result as MaterialReturnRecord)
              : { ...i, ...updates };
          }),
          error: null,
        }));
        return typeof result === 'object' && result !== null ? (result as MaterialReturnRecord) : null;
      } catch (error) {
        const msg = toMessage(error, '更新退料失败');
        set({ error: msg });
        throw new Error(msg);
      }
    },

    // 2026-09-28 新增：作废退料单（状态置「已作废」+ 记录原因，后端自动回收库存）
    voidItem: async (id, reason) => {
      try {
        const result = await returnService.voidMaterialReturn(id, reason);
        set((s) => ({
          items: s.items.map((i) => {
            if (i.id !== id) return i;
            return typeof result === 'object' && result !== null
              ? (result as MaterialReturnRecord)
              : { ...i, status: '已作废', statusClass: 'voided', rejectReason: reason };
          }),
          error: null,
        }));
        return typeof result === 'object' && result !== null ? (result as MaterialReturnRecord) : null;
      } catch (error) {
        const msg = toMessage(error, '作废退料失败');
        set({ error: msg });
        throw new Error(msg);
      }
    },

    deleteItem: async (id) => {
      try {
        await returnService.deleteMaterialReturn(id);
        set((s) => ({ items: s.items.filter((i) => i.id !== id), error: null }));
      } catch (error) {
        const msg = toMessage(error, '删除退料失败');
        set({ error: msg });
        throw new Error(msg);
      }
    },

    deleteItems: async (ids) => {
      try {
        await returnService.deleteMaterialReturns(ids);
        // 后端批量删除为单事务（全成功或全回滚），成功才从此处过滤
        set((s) => ({ items: s.items.filter((i) => !ids.includes(i.id)), error: null }));
      } catch (error) {
        const msg = toMessage(error, '批量删除退料失败');
        set({ error: msg });
        throw new Error(msg);
      }
    },
  })
);
