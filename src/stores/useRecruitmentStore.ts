/**
 * 招聘申请 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → Hook → 组件 (组件不直接读写 localStorage)
 *
 * 对接后端: /api/recruitment
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ==================== 第一步：类型定义 ====================

/** 前端使用的招聘数据接口（camelCase） */
export interface RecruitmentData {
  id: string;
  recruitmentCode: string;
  deptId: string;
  deptName: string;
  positionId: string;
  position: string;
  headcount: number;
  employmentType: string;
  salaryMin: number;
  salaryMax: number;
  /** 优先级英文代码: low/normal/high/urgent */
  priority: string;
  /** 优先级中文标签: 低/普通/高/紧急 */
  priorityLabel: string;
  /** 状态英文代码: pending/approved/rejected/cancelled */
  status: string;
  /** 状态中文标签: 待审批/已通过/已拒绝/已取消 */
  statusLabel: string;
  reason: string;
  remarks?: string;
  applicantId: string;
  applicantName: string;
  applyDate: string;
  approveTime?: string;
  approver?: string;
  createTime?: string;
  updateTime?: string;
}

// ==================== 第二步：字段映射表 ====================

/**
 * 后端(snake_case) → 前端(camelCase) 字段名映射
 */
const FIELD_MAP: Record<string, string> = {
  recruitment_code: 'recruitmentCode',
  dept_id: 'deptId',
  dept_name: 'deptName',
  position_id: 'positionId',
  position: 'position',
  headcount: 'headcount',
  employment_type: 'employmentType',
  salary_min: 'salaryMin',
  salary_max: 'salaryMax',
  priority: 'priority',
  priority_label: 'priorityLabel',
  status: 'status',
  status_label: 'statusLabel',
  reason: 'reason',
  remarks: 'remarks',
  applicant_id: 'applicantId',
  applicant_name: 'applicantName',
  apply_date: 'applyDate',
  approve_time: 'approveTime',
  approver: 'approver',
  create_time: 'createTime',
  update_time: 'updateTime',
};

// ==================== 第三步：规范化函数 ====================

/** 后端数据 → 前端数据（API 响应处理） */
function normalize(db: Record<string, unknown>): RecruitmentData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  // 设置默认值
  result.id = result.id ?? `REC_${Date.now()}`;
  result.recruitmentCode = result.recruitmentCode || '';
  result.headcount = Number(result.headcount) || 1;
  result.salaryMin = Number(result.salaryMin) || 0;
  result.salaryMax = Number(result.salaryMax) || 0;
  result.priority = result.priority || 'normal';
  result.priorityLabel = result.priorityLabel || result.priority || '普通';
  result.status = result.status || 'pending';
  result.statusLabel = result.statusLabel || result.status || '待审批';
  result.reason = result.reason || '';
  result.applicantId = result.applicantId || '';
  result.applicantName = result.applicantName || '';
  result.applyDate = result.applyDate || '';
  result.createTime = result.createTime || result.create_time || new Date().toISOString();
  return result as unknown as RecruitmentData;
}

/** 前端数据 → 后端数据（API 请求体处理） */
function denormalize(data: Partial<RecruitmentData>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  const reverse: Record<string, string> = {};
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    reverse[camel] = snake;
  }
  for (const [key, value] of Object.entries(data)) {
    // 跳过 undefined 值
    if (value === undefined) continue;
    const backendKey = reverse[key] || key;
    result[backendKey] = value;
  }
  return result;
}

// ==================== 第四步：Store 接口 ====================

interface RecruitmentState {
  items: RecruitmentData[];
  isLoading: boolean;
  error: string | null;

  fetchItems: (filters?: Record<string, string>) => Promise<void>;
  createItem: (data: Partial<RecruitmentData>) => Promise<RecruitmentData | null>;
  updateItem: (id: string, updates: Partial<RecruitmentData>) => Promise<void>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
}

// ==================== 第五步：创建 Store ====================

export const useRecruitmentStore = create<RecruitmentState>()(
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
          // 获取尽可能多的记录（默认50条，传递较大limit获取更多）
          if (!params.has('limit')) params.set('limit', '9999');
          const query = params.toString();
          const url = `/recruitment${query ? `?${query}` : ''}`;

          const response = await enhancedApiClient.get<{
            success: boolean;
            data: RecruitmentData[];
            meta?: { total: number };
          }>(url);

          // 容错：支持嵌套 {success, data} 和直接返回数组两种格式
          let data = response?.data || [];
          if (!Array.isArray(data) && (response as any)?.data) {
            data = Array.isArray((response as any).data) ? (response as any).data : [];
          }

          const normalized = (Array.isArray(data) ? data : []).map(normalize);
          set({ items: normalized, isLoading: false });
        } catch (error) {
          console.warn('[RecruitmentStore] API 获取失败，使用本地缓存:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ---------- 创建（CREATE）— 乐观更新 ----------
      createItem: async (data) => {
        try {
          const body = denormalize(data);
          const response = await enhancedApiClient.post<{
            success: boolean;
            data: { id: string; recruitment_code: string };
          }>('/recruitment', body, { offlineQueue: true, priority: 0 });

          const newId = (response as any)?.data?.id || `REC${Date.now()}`;
          const newItem = normalize({ ...data, id: newId } as Record<string, unknown>);

          set((state) => ({ items: [newItem, ...state.items] }));
          return newItem;
        } catch (error) {
          console.warn('[RecruitmentStore] 创建失败，已加入离线队列:', error);
          set({ error: (error as Error).message });
          return null;
        }
      },

      // ---------- 更新（UPDATE）— 乐观更新 ----------
      updateItem: async (id, updates) => {
        const body = denormalize(updates);

        // 乐观更新：先更新本地状态
        set((state) => ({
          items: state.items.map((item) =>
            item.id === id ? { ...item, ...updates } : item
          ),
        }));

        try {
          await enhancedApiClient.put(`/recruitment/${id}`, body, { offlineQueue: true, priority: 0 });
        } catch (error) {
          console.warn('[RecruitmentStore] 更新失败，已加入离线队列:', error);
        }
      },

      // ---------- 删除单个（DELETE）— 乐观更新 ----------
      deleteItem: async (id) => {
        set((state) => ({
          items: state.items.filter((item) => item.id !== id),
        }));

        try {
          await enhancedApiClient.delete(`/recruitment/${id}`, { offlineQueue: true, priority: 0 });
          return true;
        } catch (error) {
          console.warn('[RecruitmentStore] 删除失败，已加入离线队列:', error);
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
                .delete(`/recruitment/${id}`, { offlineQueue: true, priority: 0 })
                .catch(() => {})
            )
          );
          return true;
        } catch {
          return false;
        }
      },
    }),
    {
      name: 'recruitment-storage',
      partialize: (state) => ({ items: state.items }),
    }
  )
);
