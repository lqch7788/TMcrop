/**
 * 入职办理 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/onboarding
 * 注意：后端 onboarding 路由已将 snake_case 列名转为 camelCase 返回
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 入职进度步骤 */
export interface OnboardingProgressStep {
  step: number;
  name: string;
  status: 'pending' | 'processing' | 'completed';
  completedAt?: string;
}

/** 前端使用的入职数据接口（camelCase） */
export interface OnboardingData {
  id: string;
  oid: string;
  name: string;
  idCard: string;
  phone: string;
  position: string;
  department: string;
  departmentOid: string;
  contractType: string;
  dailyWage?: number;
  hourlyWage?: number;
  joinDate: string;
  /** 状态中文: 待入职/办理中/已入职 */
  status: string;
  /** 状态英文代码: pending/processing/onboarded */
  statusCode: string;
  progress: OnboardingProgressStep[];
  requestCode?: string;
  recruitmentId?: string;
  operatorId?: string;
  operatorName?: string;
  approvedAt?: string;
  remarks?: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== 第二步：字段映射表 ====================

/**
 * 后端(snake_case) → 前端(camelCase) 字段名映射
 * 后端 onboarding 路由已做 snake→camel 转换，这里主要处理
 * 降级场景（直接从 DB 读取时的 snake_case 字段）
 */
const FIELD_MAP: Record<string, string> = {
  id_card: 'idCard',
  department_oid: 'departmentOid',
  contract_type: 'contractType',
  daily_wage: 'dailyWage',
  hourly_wage: 'hourlyWage',
  join_date: 'joinDate',
  request_code: 'requestCode',
  recruitment_id: 'recruitmentId',
  operator_id: 'operatorId',
  operator_name: 'operatorName',
  approved_at: 'approvedAt',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 状态码 → 中文标签映射 */
const STATUS_CODE_MAP: Record<string, string> = {
  pending: '待入职',
  processing: '办理中',
  onboarded: '已入职',
};

/** 中文标签 → 状态码反向映射 */
const STATUS_LABEL_MAP: Record<string, string> = {
  '待入职': 'pending',
  '办理中': 'processing',
  '已入职': 'onboarded',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): OnboardingData {
  const result: Record<string, unknown> = { ...db };
  // 应用字段映射（同时支持 snake_case 降级场景）
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 解析 progress JSON 字符串
  let progress = result.progress;
  if (typeof progress === 'string') {
    try {
      progress = JSON.parse(progress as string);
    } catch {
      progress = [];
    }
  }
  if (!Array.isArray(progress)) {
    progress = [];
  }

  // 状态映射：英文代码 → 中文标签，同时保留英文代码
  const rawStatus = (result.status as string) || 'pending';
  const statusLabel = STATUS_CODE_MAP[rawStatus] || '待入职';
  const statusCode = STATUS_LABEL_MAP[rawStatus]
    ? rawStatus // rawStatus 已经是中文标签
    : rawStatus; // rawStatus 是英文代码

  // 设置默认值
  result.id = result.id ?? `OB_${Date.now()}`;
  result.oid = result.oid || result.id || '';
  result.name = result.name || '';
  result.idCard = result.idCard || '';
  result.phone = result.phone || '';
  result.position = result.position || '';
  result.department = result.department || '';
  result.departmentOid = result.departmentOid || '';
  result.contractType = result.contractType || '';
  result.joinDate = result.joinDate || '';
  result.status = statusLabel;
  result.statusCode = statusCode;
  result.progress = progress;
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as unknown as OnboardingData;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<OnboardingData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    if (value === undefined) continue;
    // 跳过前端专用字段
    if (key === 'statusCode') continue;
    const backendKey = reverse[key] || key;
    // status 字段传中文标签给后端
    if (key === 'status') {
      // 如果是中文标签，直接传；如果是英文代码，转为中文标签
      result[backendKey] = STATUS_CODE_MAP[value as string] || value;
    } else {
      result[backendKey] = value;
    }
  }
  return result;
}

// ==================== 第四步：Store 接口 ====================

interface OnboardingState {
  items: OnboardingData[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<OnboardingData>) => Promise<OnboardingData | null>;
  updateItem: (id: string, updates: Partial<OnboardingData>) => Promise<void>;
  updateStatus: (id: string, status: string, operatorId?: string, operatorName?: string) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

// ==================== 第五步：创建 Store ====================

export const useOnboardingStore = create<OnboardingState>()(
  persist(
    (set, get) => ({
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
          if (!params.has('limit')) params.set('limit', '9999');
          const query = params.toString();
          const url = `/onboarding${query ? `?${query}` : ''}`;

          const response = await enhancedApiClient.get<{
            success: boolean;
            data: { records: any[]; pagination: any } | any[];
          }>(url);

          // 容错：onboarding API 返回 {data: {records: [...]}} 格式
          let data: any[] = [];
          if (response?.data) {
            if (Array.isArray(response.data)) {
              data = response.data;
            } else if ((response.data as any)?.records) {
              data = (response.data as any).records;
            } else if ((response as any)?.data?.records) {
              data = (response as any).data.records;
            }
          }

          const normalized = (Array.isArray(data) ? data : []).map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[OnboardingStore] API 获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      createItem: async (data) => {
        try {
          // 后端 POST /api/onboarding 接受 camelCase 字段
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string; oid: string; name: string };
          }>('/onboarding', data, { offlineQueue: true, priority: 0 });

          const newId = (response as any)?.data?.id || `OB${Date.now()}`;
          const newItem = normalize({ ...data, id: newId } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[OnboardingStore] 创建失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateItem: async (id, updates) => {
        const body = { ...updates };

        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/onboarding/${id}`, body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[OnboardingStore] 更新失败，已加入离线队列:', error);
        }
      },

      // ---------- 更新入职状态（POST /api/onboarding/:id/status）----------
      updateStatus: async (id, status, operatorId, operatorName) => {
        // 乐观更新本地状态
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id
              ? {
                  ...item,
                  status: STATUS_CODE_MAP[status] || status,
                  statusCode: STATUS_LABEL_MAP[status] ? status : item.statusCode,
                  operatorId: operatorId || item.operatorId,
                  operatorName: operatorName || item.operatorName,
                }
              : item
          ),
        }));

        try {
          await enhancedApiClient.post(
            `/onboarding/${id}/status`,
            { status, operatorId, operatorName },
            { offlineQueue: true, priority: 0 }
          );
        } catch (error) {
          console.warn('[OnboardingStore] 状态更新失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除单个（DELETE）— 乐观更新 ----------
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/onboarding/${id}`, { offlineQueue: true, priority: 0 });
          return true;
        } catch (error) {
          console.warn('[OnboardingStore] 删除失败，已加入离线队列:', error);
          return false;
        }
      },

      // ---------- 批量删除（POST /api/onboarding/batch-delete）— 乐观更新 ----------
      deleteItems: async (ids) => {
        set((state) => ({
          items: state.items.filter((item) => !ids.includes(item.id)),
        }));

        try {
          await enhancedApiClient.post(
            '/onboarding/batch-delete',
            { ids },
            { offlineQueue: true, priority: 0 }
          );
          return true;
        } catch (error) {
          console.warn('[OnboardingStore] 批量删除失败，已加入离线队列:', error);
          return false;
        }
      },
    }),
    {
      name: 'onboarding-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
