/**
 * 招聘申请 Zustand Store (V2.1 架构 - 已简化)
 * 数据流：enhancedApiClient → Store → 页面组件
 * 无缓存层，直接调用API
 */

import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

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
  priority: string;
  priorityLabel: string;
  status: string;
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

/** 后端(snake_case) → 前端(camelCase) 字段名映射 */
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

/** 后端数据 → 前端数据 */
function normalize(db: Record<string, unknown>): RecruitmentData {
  const result: Record<string, unknown> = { ...db };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
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
  result.createTime = result.createTime || new Date().toISOString();
  return result as unknown as RecruitmentData;
}

/** 前端数据 → 后端数据 */
function denormalize(data: Partial<RecruitmentData>): Record<string, unknown> {
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

export const useRecruitmentStore = create<RecruitmentState>()(
  (set) => ({
    items: [],
    isLoading: false,
    error: null,

    fetchItems: async (filters) => {
      set({ isLoading: true, error: null });
      try {
        const params = new URLSearchParams();
        if (filters) {
          Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
        }
        if (!params.has('limit')) params.set('limit', '9999');
        const query = params.toString();
        const url = `/recruitment${query ? `?${query}` : ''}`;

        const response = await enhancedApiClient.get<{
          success: boolean;
          data: RecruitmentData[];
        }>(url);

        const data = Array.isArray(response) ? response : [];
        const normalized = data.map(normalize);
        set({ items: normalized, isLoading: false });
      } catch (error) {
        console.warn('[RecruitmentStore] API获取失败:', error);
        set({ error: (error as Error).message, isLoading: false });
      }
    },

    createItem: async (data) => {
      try {
        const body = denormalize(data);
        const response = await enhancedApiClient.post<{
          success: boolean;
          data: { id: string; recruitment_code: string };
        }>('/recruitment', body);

        const newId = (response as any)?.id || `REC${Date.now()}`;
        const newItem = normalize({ ...data, id: newId } as Record<string, unknown>);
        set((state) => ({ items: [newItem, ...state.items] }));
        return newItem;
      } catch (error) {
        console.warn('[RecruitmentStore] 创建失败:', error);
        return null;
      }
    },

    updateItem: async (id, updates) => {
      const body = denormalize(updates);
      set((state) => ({
        items: state.items.map((item) =>
          item.id === id ? { ...item, ...updates } : item
        ),
      }));

      try {
        await enhancedApiClient.put(`/recruitment/${id}`, body);
      } catch (error) {
        console.warn('[RecruitmentStore] 更新失败:', error);
      }
    },

    deleteItem: async (id) => {
      set((state) => ({
        items: state.items.filter((item) => item.id !== id),
      }));

      try {
        await enhancedApiClient.delete(`/recruitment/${id}`);
        return true;
      } catch (error) {
        console.warn('[RecruitmentStore] 删除失败:', error);
        return false;
      }
    },

    deleteItems: async (ids) => {
      set((state) => ({
        items: state.items.filter((item) => !ids.includes(item.id)),
      }));

      try {
        await Promise.all(
          ids.map((id) =>
            enhancedApiClient.delete(`/recruitment/${id}`)
          )
        );
        return true;
      } catch {
        return false;
      }
    },
  })
);
