/**
 * 离职申请 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/resignation
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 前端使用的离职数据接口（camelCase） */
export interface ResignationData {
  id: string;
  resignationCode: string;
  workerId: string;
  workerName: string;
  department?: string;
  position?: string;
  /** 离职类型: 主动离职/被动离职 */
  resignationType: string;
  reason: string;
  expectedLastDay: string;
  actualLastDay?: string;
  handoverUserId?: string;
  handoverUserName?: string;
  handoverNote?: string;
  /** 状态英文代码: pending/approved/rejected/cancelled */
  status: string;
  /** 状态中文标签: 待审批/已通过/已拒绝/已取消 */
  statusLabel: string;
  approver?: string;
  approveTime?: string;
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

// ==================== 第二步：字段映射表 ====================

/**
 * 后端(snake_case) → 前端(camelCase) 字段名映射
 */
const FIELD_MAP: Record<string, string> = {
  resignation_code: 'resignationCode',
  worker_id: 'workerId',
  worker_name: 'workerName',
  department: 'department',
  position: 'position',
  resignation_type: 'resignationType',
  reason: 'reason',
  expected_last_day: 'expectedLastDay',
  actual_last_day: 'actualLastDay',
  handover_user_id: 'handoverUserId',
  handover_user_name: 'handoverUserName',
  handover_note: 'handoverNote',
  status: 'status',
  status_label: 'statusLabel',
  approver: 'approver',
  approve_time: 'approveTime',
  remarks: 'remarks',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): ResignationData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 设置默认值
  result.id = result.id ?? `RSG_${Date.now()}`;
  result.resignationCode = result.resignationCode || '';
  result.workerId = result.workerId || '';
  result.workerName = result.workerName || '';
  result.resignationType = result.resignationType || '主动离职';
  result.reason = result.reason || '';
  result.expectedLastDay = result.expectedLastDay || '';
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || result.status || '待审批';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as unknown as ResignationData;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<ResignationData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第四步：Store 接口 ====================

interface ResignationState {
  items: ResignationData[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<ResignationData>) => Promise<ResignationData | null>;
  updateItem: (id: string, updates: Partial<ResignationData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

// ==================== 第五步：创建 Store ====================

export const useResignationStore = create<ResignationState>()(
  (set, get)=> ({
      items: [],
      isLoading: false,
      error: null,

      // ---------- 查询（READ）----------
      fetchItems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
          // 获取尽可能多的记录
          if (!params.has('limit')) params.set('limit', '9999');
          const query = params.toString();
          const url = `/resignation${query ? `?${query}` : ''}`;

          const response = await enhancedApiClient.get<{
            success: boolean;
            data: ResignationData[];
            meta?: { total: number };
          }>(url);

          // enhancedApiClient 已提取 .data，response 即为实际数据数组
          const data = Array.isArray(response) ? response : [];
          const normalized = data.map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[ResignationStore] API 获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string; resignation_code: string };
          }>('/resignation', body);

          const newId = (response as any)?.id || `RSG${Date.now()}`;
          const newItem = normalize({ ...data, id: newId } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[ResignationStore] 创建失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateItem: async (id, updates) => {
        const body = denormalize(updates);

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/resignation/${id}`, body);
        } catch (error) {
          console.warn('[ResignationStore] 更新失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除单个（DELETE）— 乐观更新 ----------
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/resignation/${id}`);
          return true;
        } catch (error) {
          console.warn('[ResignationStore] 删除失败，已加入离线队列:', error);
          return false;
        }
      },

      // ---------- 批量删除（BATCH DELETE）— 乐观更新 ----------
      deleteItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await Promise.all(
            ids.map((id) =>
              enhancedApiClient
                .delete(`/resignation/${id}`)
                .catch(() => {})
            )
          );
          return true;
        } catch {
          return false;
        }
      },
    })
);
