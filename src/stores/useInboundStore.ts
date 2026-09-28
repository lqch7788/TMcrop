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

/**
 * 2026-09-28 审计修复：历史入库单的明细 JSON 没有 id（实测 14 单 / 64 行），
 * 而编辑弹窗按 `m.id === materialId` 匹配行——`undefined === undefined` 成立会让
 * "改一行 = 改全部行、删一行 = 删全部行"（React key 也随之重复）。
 * 读取时统一补稳定负数 id（不与真实 id 冲突）。
 */
function normalizeInboundRecord<T extends { materials?: any[] }>(record: T): T {
  if (!record || !Array.isArray((record as any).materials)) return record;
  return {
    ...record,
    materials: (record as any).materials.map((m: any, i: number) => ({
      ...m,
      id: typeof m?.id === 'number' ? m.id : -(i + 1),
    })),
  } as T;
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
        // 明细 id 归一化（防止"改一行=改全部行"）+ 非数组兜底
        const list = Array.isArray(data) ? data : [];
        set({ items: list.map((r) => normalizeInboundRecord(r)), isLoading: false });
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
        if (result) set((s) => ({ items: [normalizeInboundRecord(result), ...s.items] }));
        return result;
      } catch (error) {
        // 2026-09-28 审计修复：fail-loud——此前只 `return null` 连错误都丢掉，
        // 调用方无从提示，用户看到"弹窗关闭+表单清空"却什么都没保存（以为系统丢数据）
        set({ error: error instanceof Error ? error.message : '创建入库记录失败' });
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
        if (result) set((s) => ({ items: s.items.map((i) => i.id === id ? normalizeInboundRecord({ ...i, ...result }) : i) }));
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
        // 2026-09-28 审计修复：用 allSettled 逐条收集结果——
        // 此前 Promise.all 只要一条抛错整批返回 false，失败原因/失败 id 全部丢失，
        // 且已成功的记录仍留在本地列表（与后端不一致）。
        const results = await Promise.allSettled(ids.map((id) => warehouseService.deleteInboundRecord(id)));
        const failedIds = ids.filter((_, i) => results[i].status === 'rejected');
        const deletedIds = ids.filter((_, i) => results[i].status === 'fulfilled');
        if (deletedIds.length > 0) {
          set((s) => ({ items: s.items.filter((i) => !deletedIds.includes(i.id)) }));
        }
        if (failedIds.length > 0) {
          const firstRejected = results.find((r) => r.status === 'rejected') as PromiseRejectedResult | undefined;
          const reason = firstRejected?.reason instanceof Error ? firstRejected.reason.message : '未知原因';
          set({ error: `以下入库单删除失败：${failedIds.join('、')}；原因：${reason}` });
          return false;
        }
        return true;
      } catch (error) {
        set({ error: error instanceof Error ? error.message : '批量删除入库记录失败' });
        return false;
      }
    },
  })
);
