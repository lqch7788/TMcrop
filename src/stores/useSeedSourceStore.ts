/**
 * 种源管理 Zustand Store (V2.1 架构)
 * 数据流：enhancedApiClient → Store → 页面组件
 *
 * 铁律（2026-06-06 强化）：
 * - 错误必须 throw 给上层，禁止 catch 后静默返 null/false/[]（HIGH #3 / L1）
 * - updateItem 用服务端真值 setState（HIGH #5）
 * - propagationStatus 用 PropagationStatus 字面量联合，禁 `as any`（M1）
 * - 80 行结束分支下沉到 endSeedSource action（M2）
 */
import { create } from 'zustand';
import { SeedSource } from '../types/crop';
import * as seedSourceService from '../services/apiSeedSourceService';
import type { CheckDeletableResult, DeletableReference } from '../services/apiSeedSourceService';
import { seedSourceTransferService, type TransferItem, type TransferResult } from '../services/seedSourceTransferService';
import { useInventoryStore } from './useInventoryStore';
import { todayLocal } from '@/lib/dateUtils';

/** 结束类型 */
export type EndType = 'normal' | 'abnormal';

/** 结束种源 action 入参 */
export interface EndSeedSourceParams {
  endType: EndType;
  /** 关联生产计划 ID（存在则走 cropBatch 结束流程） */
  productionPlanId?: string;
  /** 关联生产计划编码（用于展示） */
  productionPlanCode?: string;
}

interface SeedSourceState {
  items: SeedSource[];
  isLoading: boolean;
  error: string | null;

  // ===== 错误清理 =====
  /** 手动清空 error 状态（由页面在 toast 后调用） */
  clearError: () => void;

  // ===== 列表 =====
  loadItems: () => Promise<void>;
  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: () => Promise<void>;
  addItem: (item: Parameters<typeof seedSourceService.addSeedSource>[0]) => Promise<SeedSource>;
  updateItem: (id: string, updates: Partial<SeedSource>) => Promise<SeedSource>;
  deleteItem: (id: string) => Promise<void>;
  deleteItems: (ids: string[]) => Promise<void>;

  // ===== 关联检查 =====
  /** CRITICAL #2: 检查种源是否可删除（组件不再直调 enhancedApiClient） */
  checkDeletable: (id: string) => Promise<CheckDeletableResult>;

  // ===== 结束流程（M2: 从组件下沉） =====
  /** 结束种源订单：优先走 cropBatch 结束流程，否则强结种源本身 */
  endSeedSource: (id: string, params: EndSeedSourceParams) => Promise<{ mode: 'batch' | 'force' }>;

  // ===== 繁殖过程 =====
// 2026-07-14：删除 addPropagationRecord/loadPropagationRecords/updatePropagationRecord/
//   deletePropagationRecord/updatePropagationStage/completePropagation 6 个方法
//   （grep 全项目无外部调用——前端 v3 改造已移除繁殖过程功能入口）

  // ===== 库存调拨入种源（2026-06-24）=====
  /**
   * 调拨入种源：多选库存 → 移动语义写入
   * - 调拨成功后重新拉种源列表
   * - 触发 useInventoryStore.notifyChange() 跨页刷新作物库存
   * - 不 catch 错误（让上层 toast 显示具体信息）
   * - P0-2 修复：operator 参数必传（之前缺失导致审计流水中 operator_name='system'）
   */
  createFromTransfer: (
    items: TransferItem[],
    operator?: { id?: string; name?: string }
  ) => Promise<TransferResult[]>;

  // ===== 2026-07-18: 种源合并功能 =====
  /**
   * 查询合并候选（同合并键的最早一条 active 种源）
   */
  findMatchable: (params: {
    cropCode: string;
    seedForm: string;
    unit: string;
    generation: string | null;
    propagationMethod: string | null;
  }) => Promise<any>;

  /**
   * 冲销入库流水（软删除 + 库存回退）
   * 调用方负责刷新相关数据
   */
  reverseInbound: (
    seedSourceId: string,
    payload: { inboundRecordId: string; reason: string }
  ) => Promise<void>;
}

export const useSeedSourceStore = create<SeedSourceState>()((set, get) => ({
  items: [],
  isLoading: false,
  error: null,

  clearError: () => set({ error: null }),

  loadItems: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await seedSourceService.getSeedSources();
      set({ items: data, isLoading: false });
    } catch (error) {
      // loadItems 保留 setState 错误模式（不 throw，避免页面加载崩溃，但记录错误信息）
      set({ error: (error as Error).message, isLoading: false });
    }
  },

  // 2026-07-18 P2-M4：fetchItems 别名
  fetchItems: async () => { await get().loadItems(); },

  addItem: async (item) => {
    // 错误直接向上抛（HIGH #3）
    const result = await seedSourceService.addSeedSource(item);
    if (result) {
      set((state) => ({ items: [result, ...state.items] }));
    }
    return result;
  },

  updateItem: async (id, updates) => {
    // 2026-06-06: 错误直接向上抛 + 用服务端真值 setState（HIGH #5）
    const serverRecord = await seedSourceService.updateSeedSource(id, updates);
    if (serverRecord) {
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...serverRecord } : item
        ),
      }));
      return serverRecord;
    }
    // 服务端未返回完整记录，回退到本地 reloadItems 保持一致性
    await get().loadItems();
    const fresh = get().items.find((it) => it.id === id);
    if (!fresh) {
      throw new Error(`更新后未找到种源记录：${id}`);
    }
    return fresh;
  },

  deleteItem: async (id) => {
    // 错误直接向上抛（HIGH #3 / L1）
    await seedSourceService.deleteSeedSource(id);
    set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
  },

  deleteItems: async (ids) => {
    await seedSourceService.deleteSeedSources(ids);
    set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
  },

  checkDeletable: async (id) => {
    return await seedSourceService.checkSeedSourceDeletable(id);
  },

  endSeedSource: async (id, params) => {
    // 2026-06-06: M2 — 把 SeedSourcePage.handleEnd 80 行分支逻辑下沉到 Store
    // 2026-07-14：删除 productionPlanId 死分支（注释承认"调用方应当已走完 cropBatch 结束流程；
    //   此处仅记录结束标记作为兜底"——但实际什么都没做，直接 return，行为无意义）
    // 注：cropBatch 结束流程涉及另一个 service（apiCropBatchService），由调用方通过 opts 注入，
    //      保持 Store 单职责（只管种源表 + 必要的本地缓存修改）。
    const current = get().items.find((it) => it.id === id);
    if (!current) {
      throw new Error(`种源记录不存在：${id}`);
    }
    // 强结分支（原本 params.productionPlanId 分支已删除）
    await get().updateItem(id, {
      endType: params.endType,
      endTime: todayLocal(),
      // 强结时清空关联（避免误导）
      productionPlanCode: null as unknown as string,
    });
    return { mode: 'force' as const };
  },

  // 2026-07-14：删除 6 个繁殖过程死方法实现（addPropagationRecord/loadPropagationRecords/
//   updatePropagationRecord/deletePropagationRecord/updatePropagationStage/completePropagation）

  // 2026-06-24: 库存调拨入种源 — 多选调拨 → 后端事务 → 触发跨页刷新
  // P0-2 修复：operator 参数完整透传到 service（之前签名只接 items，operator 静默丢失）
  createFromTransfer: async (items, operator) => {
    set({ isLoading: true, error: null });
    try {
      const results = await seedSourceTransferService.createFromTransfer(items, operator);
      // 重新拉种源列表（让新调拨的种源立即可见）
      await get().loadItems();
      // 触发作物库存页跨页刷新（扣减了原库存）
      useInventoryStore.getState().notifyChange();
      return results;
    } finally {
      set({ isLoading: false });
    }
  },

  // ===== 2026-07-18: 种源合并功能 =====

  findMatchable: async (params) => {
    // 错误向上抛（V2.1 铁律：不静默吞错）
    return await seedSourceService.findMatchableSeedSource({
      ...params,
      propagationMethod: params.propagationMethod || null,
    });
  },

  reverseInbound: async (seedSourceId, payload) => {
    // 错误向上抛
    await seedSourceService.reverseInboundRecord(seedSourceId, payload);
    // 调用方决定是否 loadItems 刷新列表
  },
}));

// 重新导出类型，方便组件用
export type { CheckDeletableResult, DeletableReference };
