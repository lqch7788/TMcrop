/**
 * 领料出库 Zustand Store (V2.1 架构)
 *
 * 架构：enhancedApiClient → API（无缓存层，直接调用 API）
 * 数据流：Store → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/material-executes
 * 参考样板: useTempTaskStore.ts (FIELD_MAP + normalize/denormalize 模式)
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';
import type { MaterialExecuteRecord } from '@/types/materialReceiving';

// ==================== 第一步：字段映射表 ====================

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
const FIELD_MAP: Record<string, string> = {
  id: 'id',
  code: 'code',
  date: 'date',
  applicant: 'applicant',
  warehouse_location: 'warehouseLocation',
  reviewer: 'reviewer',
  operator: 'operator',
  production_batch_code: 'productionBatchCode',
  source_application_codes: 'sourceApplicationCodes',
  execute_status: 'executeStatus',
  execute_status_class: 'executeStatusClass',
  materials: 'materials',
  create_by: 'createBy',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第二步：规范化函数 ====================

/** 后端数据 → 前端数据 */
function normalize(db: Record<string, unknown>): MaterialExecuteRecord {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result) {
      result[camel] = result[snake];
    }
  }
  result.id = result.id ?? `CK${Date.now()}`;
  result.executeStatus = result.executeStatus || '已出库';
  result.executeStatusClass = result.executeStatusClass || 'completed';
  // 确保 JSON 字段被正确解析（后端可能返回字符串）
  if (typeof result.sourceApplicationCodes === 'string') {
    try { result.sourceApplicationCodes = JSON.parse(result.sourceApplicationCodes); } catch { result.sourceApplicationCodes = []; }
  }
  if (!Array.isArray(result.sourceApplicationCodes)) result.sourceApplicationCodes = [];
  if (typeof result.materials === 'string') {
    try { result.materials = JSON.parse(result.materials); } catch { result.materials = []; }
  }
  if (!Array.isArray(result.materials)) result.materials = [];
  return result as unknown as MaterialExecuteRecord;
}

/** 前端数据 → 后端数据 */
function denormalize(data: Partial<MaterialExecuteRecord>): Record<string, unknown> {
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  const result: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(data)) {
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第三步：Store 接口 ====================

interface ExecuteDataState {
  items: MaterialExecuteRecord[];
  isLoading: boolean;
  error: string | null;

  fetchItems: () => Promise<void>;
  createItem: (data: Partial<MaterialExecuteRecord>) => Promise<MaterialExecuteRecord | null>;
  // 2026-09-26 P0 修复：updateItem 返回成功与否（此前 void + 吞错，编辑失败也提示"保存成功"）
  updateItem: (id: number | string, updates: Partial<MaterialExecuteRecord>) => Promise<boolean>;
  deleteItem: (id: number | string) => Promise<boolean>;
  deleteItems: (ids: (number | string)[]) => Promise<boolean>;

  generateCode: () => string;
}

// ==================== 第四步：创建 Store ====================

export const useExecuteDataStore = create<ExecuteDataState>()(
  (set, get)=> ({
      items: [],   // 初始空数组，通过 fetchItems() 从 API 加载
      isLoading: false,
      error: null,

      // ---------- 查询 ----------
      fetchItems: async () => {
        set({ isLoading: true, error: null });
        try {
          // enhancedApiClient 已自动提取 .data，response 直接就是数组
          const list = await enhancedApiClient.get<Record<string, unknown>[]>('/material-executes');

          const data = Array.isArray(list) ? list : [];
          const normalized = data.map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          // 2026-06-04 V2.1 铁律：API 失败直接 set error，无本地缓存兜底
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建（乐观更新）----------
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          body.id = data.id || `CK${Date.now()}`;
          const response = await enhancedApiClient.post<{
            success: boolean; data: { id: string | number; code: string }
          }>('/material-executes', body);

          // enhancedApiClient 已自动提取 .data，response 直接就是 { id, code }
          const newId = (response as any)?.id || body.id;
          const newItem = normalize({ ...data, id: newId } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          // 2026-06-04 V2.1 铁律：API 失败抛错（不允许乐观更新，否则 UI 与 DB 不一致）
          // 2026-09-26 P0 修复：错误信息存入 error，调用方据此提示（此前静默 null，用户只看到"出库失败，请重试"）
          const msg = error instanceof Error ? error.message : '创建出库单失败';
          set({ error: msg });
          return null;
        }
      },

      // ---------- 更新（乐观更新）----------
      updateItem: async (id, updates) => {
        const body = denormalize(updates);

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/material-executes/${id}`, body);
          return true;
        } catch (error) {
          // 2026-09-26 P0 修复：fail loud —— 失败时撤销乐观更新并返回 false，
          // 调用方提示"保存失败"（此前吞错且 UI 已显示新值，与 DB 不一致）
          const msg = error instanceof Error ? error.message : '更新出库单失败';
          set({ error: msg });
          await get().fetchItems(); // 以 DB 为准重拉，撤销乐观更新
          return false;
        }
      },

      // ---------- 删除单个（乐观更新）----------
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/material-executes/${id}`);
          return true;
        } catch (error) {
          // 2026-09-26 P0 修复：删除失败时撤销乐观更新（重拉 DB 真相），
          // 此前 UI 已移除该行但 DB 未删，刷新后"复活"
          const msg = error instanceof Error ? error.message : '删除出库单失败';
          set({ error: msg });
          await get().fetchItems();
          return false;
        }
      },

      // ---------- 批量删除（乐观更新）----------
      deleteItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/material-executes/${id}`)
                .catch(() => {})
            )
          );
          return true;
        } catch {
          return false;
        }
      },

      // ---------- 生成编号 ----------
      generateCode: () => {
        const d = new Date();
        const prefix = `CK${d.getFullYear()}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
        const existing = get().items.filter((i) => i.code.startsWith(prefix));
        return `${prefix}${String(existing.length + 1).padStart(3, '0')}`;
      },
    })
);
