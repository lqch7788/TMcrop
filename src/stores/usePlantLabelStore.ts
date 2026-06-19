/**
 * 种植标签管理 Zustand Store
 * 管理标签、标签履历、标记数据
 * 数据流：enhancedApiClient → Store → 组件
 */
import { create } from 'zustand';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export interface PlantLabel {
  id: number;
  label_number: string;
  planting_id: string;
  seedling_id: string | null;
  move_in_area_id: number | null;
  move_in_area_name: string | null;
  move_in_date: string | null;
  move_out_area_id: number | null;
  move_out_area_name: string | null;
  move_out_date: string | null;
  create_time: string;
}

export interface PlantLabelResume {
  id: number;
  label_id: number;
  operation_type: 'move_in' | 'move_out' | 'mark';
  from_area_name: string | null;
  to_area_name: string | null;
  mark_id: number | null;
  mark_name: string | null;
  mark_color: string | null;
  operation_date: string;
  operator_name: string | null;
  create_time: string;
}

export interface PlantMark {
  id: number;
  name: string;
  color: string | null;
  icon: string | null;
  parent_id: number;
  mark_aid: string;
  is_use: number;
  sort_order: number;
}

export interface MoveFormData {
  operationType: 'move_in' | 'move_out';
  labelNumber: string;
  targetArea: string;
  operationDate: string;
  remarks: string;
}

// ========== 预加载的标记种子数据（与后端一致） ==========
const DEFAULT_MARKS: PlantMark[] = [
  { id: 1, name: '正常', color: '#22c55e', icon: 'CheckCircle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 1 },
  { id: 2, name: '关注', color: '#f59e0b', icon: 'AlertTriangle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 2 },
  { id: 3, name: '问题', color: '#ef4444', icon: 'AlertCircle', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 3 },
  { id: 4, name: '优质', color: '#3b82f6', icon: 'Star', parent_id: 0, mark_aid: 'normal', is_use: 1, sort_order: 4 },
];

interface PlantLabelState {
  // 标签列表
  labels: PlantLabel[];
  labelsLoading: boolean;
  // 履历缓存 (label_id → resumes)
  resumeMap: Record<number, PlantLabelResume[]>;
  resumeLoading: boolean;
  // 标记列表
  marks: PlantMark[];
  marksLoading: boolean;

  // 操作
  loadLabels: (plantingId?: string) => Promise<void>;
  loadResumes: (labelId: number) => Promise<PlantLabelResume[]>;
  loadResumesForLabels: (labelIds: number[]) => Promise<void>;
  loadMarks: () => Promise<void>;

  submitMove: (labelId: number, data: MoveFormData) => Promise<boolean>;
  submitMark: (markId: number, labelIds: number[]) => Promise<boolean>;

  /** 批量生成标签 */
  generateBatchLabels: (params: {
    seedling_id?: string;
    planting_id?: string;
    count: number;
    crop_name?: string;
    area_name?: string;
    start_date?: string;
  }) => Promise<{ labels: any[]; totalPrinted: number } | null>;
}

export const usePlantLabelStore = create<PlantLabelState>((set, get) => ({
  labels: [],
  labelsLoading: false,
  resumeMap: {},
  resumeLoading: false,
  marks: DEFAULT_MARKS,
  marksLoading: false,

  /** 加载标签列表 */
  loadLabels: async (plantingId) => {
    set({ labelsLoading: true });
    try {
      const params = new URLSearchParams();
      if (plantingId) params.set('planting_id', plantingId);
      params.set('limit', '200');
      const res = await enhancedApiClient.get(`/plant-labels?${params.toString()}`);
      // 2026-06-05: enhancedApiClient 已自动解包 data 字段；res 实际是数组或 {success, data, meta}，兼容两种
      const list: any[] = Array.isArray(res) ? res : ((res as any)?.data || []);
      set({ labels: list, labelsLoading: false });
    } catch {
      set({ labelsLoading: false });
    }
  },

  /** 加载单个标签的履历 */
  loadResumes: async (labelId) => {
    try {
      const res = await enhancedApiClient.get(`/plant-labels/${labelId}/resumes`);
      if (res.success) {
        set((s) => ({ resumeMap: { ...s.resumeMap, [labelId]: res.data } }));
        return res.data as PlantLabelResume[];
      }
    } catch { /* ignore */ }
    return [];
  },

  /** 批量加载多个标签的履历 */
  loadResumesForLabels: async (labelIds) => {
    set({ resumeLoading: true });
    const map: Record<number, PlantLabelResume[]> = {};
    await Promise.all(labelIds.map(async (id) => {
      try {
        const res = await enhancedApiClient.get(`/plant-labels/${id}/resumes`);
        if (res.success) map[id] = res.data;
      } catch { map[id] = []; }
    }));
    set((s) => ({
      resumeMap: { ...s.resumeMap, ...map },
      resumeLoading: false,
    }));
  },

  /** 加载标记列表 */
  loadMarks: async () => {
    set({ marksLoading: true });
    try {
      const res = await enhancedApiClient.get('/plant-labels/marks/all');
      if (res.success && res.data?.length > 0) {
        set({ marks: res.data, marksLoading: false });
      } else {
        // 后端无数据时使用默认标记
        set({ marksLoading: false });
      }
    } catch {
      set({ marksLoading: false });
    }
  },

  /** 执行移入/移出操作 */
  submitMove: async (labelId, data) => {
    try {
      // 2026-06-19: 操作员 = 当前登录人员（从 authStore 取），不再误用 remarks
      const { useAuthStore } = await import('@/stores/useAuthStore')
      const currentUser = useAuthStore.getState().currentUser
      const operatorName = currentUser?.realName || currentUser?.username || 'system'
      const res = await enhancedApiClient.post(`/plant-labels/${labelId}/resumes`, {
        operation_type: data.operationType,
        to_area_name: data.targetArea,
        operation_date: data.operationDate,
        operator_name: operatorName,
        remarks: data.remarks || null,  // 单独传备注（之前混在 operator_name 里）
      });
      if (res.success) {
        // 刷新标签列表和履历
        await get().loadLabels();
        await get().loadResumes(labelId);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /** 分配标记给标签 */
  submitMark: async (markId, labelIds) => {
    try {
      const res = await enhancedApiClient.post('/plant-labels/marks/assign', {
        mark_id: markId,
        label_ids: labelIds,
      });
      if (res.success) {
        // 刷新标签列表和标记相关的履历
        await get().loadLabels();
        await get().loadResumesForLabels(labelIds);
        return true;
      }
      return false;
    } catch {
      return false;
    }
  },

  /** 批量生成标签（育苗/种植标签打印） */
  generateBatchLabels: async (params) => {
    try {
      const res = await enhancedApiClient.post('/plant-labels/generate-batch', params);
      if (res.success) {
        await get().loadLabels();
        return res.data;
      }
      return null;
    } catch {
      return null;
    }
  },
}));
