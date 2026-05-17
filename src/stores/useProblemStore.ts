/**
 * 问题管理 Zustand Store
 *
 * 架构：enhancedApiClient → API → IndexedDB → localStorage (三级降级)
 * 数据流：Store → 组件 (组件不直接读写localStorage)
 *
 * 对接后端: /api/problems
 */

import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型 ==========

export interface ProblemData {
  id: number | string;
  problem_code?: string;
  problemCode?: string;
  problem_title?: string;
  title?: string;
  problem_description?: string;
  description?: string;
  problem_type?: string;
  problemType?: string;
  severity?: string;
  source_type?: string;
  sourceType?: string;
  source_id?: string;
  sourceId?: string;
  inspection_id?: string;
  inspectionId?: string;
  inspection_code?: string;
  inspectionCode?: string;
  greenhouse_id?: string;
  greenhouseId?: string;
  greenhouse_name?: string;
  greenhouseName?: string;
  batch_id?: string;
  batchId?: string;
  batch_code?: string;
  batchCode?: string;
  handler_id?: string;
  handlerId?: string;
  handler_name?: string;
  handlerName?: string;
  status?: string;
  handle_result?: string;
  handleResult?: string;
  create_time?: string;
  createTime?: string;
  createdAt?: string;
  update_time?: string;
  updateTime?: string;
  updatedAt?: string;
  resolve_time?: string;
  resolveTime?: string;
  resolvedAt?: string;
  assigned_at?: string;
  assignedAt?: string;
  reporter_id?: string;
  reporter_name?: string;
  assignee_id?: string;
  assignee_name?: string;
  priority?: string;
  // 巡查问题流转闭环字段
  crop_name?: string;
  cropName?: string;
  inspector_id?: string;
  inspectorId?: string;
  inspector_name?: string;
  inspectorName?: string;
  check_date?: string;
  checkDate?: string;
  check_time?: string;
  checkTime?: string;
  weather?: string;
  temperature?: number;
  humidity?: number;
  crop_status?: string;
  cropStatus?: string;
  plant_height?: number;
  leaf_count?: number;
  issue_text?: string;
  issueText?: string;
  issue_severity?: string;
  issueSeverity?: string;
  handler?: string;
  handle_date?: string;
  handleDate?: string;
  source_task_id?: string;
  sourceTaskId?: string;
  flow_records?: string;
  flowRecords?: any[];
  rework_count?: number;
  reworkCount?: number;
  accepted_by?: string;
  acceptedBy?: string;
  accepted_time?: string;
  acceptedTime?: string;
  rejected_by?: string;
  rejectedBy?: string;
  rejected_reason?: string;
  rejectedReason?: string;
  rejected_time?: string;
  rejectedTime?: string;
  completion_time?: string;
  completionTime?: string;
  expected_completion?: string;
  expectedCompletion?: string;
  remarks?: string;
  images?: string;
  source_module?: string;
  sourceModule?: string;
  source_detail?: string;
  sourceDetail?: string;
  // 状态标签（API返回）
  statusLabel?: string;
}

function normalize(db: Record<string, unknown>): ProblemData {
  const map: Record<string, string> = {
    problem_code: 'problemCode', problem_title: 'title', problem_description: 'description',
    problem_type: 'problemType', source_type: 'sourceType', source_id: 'sourceId',
    inspection_id: 'inspectionId', inspection_code: 'inspectionCode',
    greenhouse_id: 'greenhouseId', greenhouse_name: 'greenhouseName',
    batch_id: 'batchId', batch_code: 'batchCode',
    handler_id: 'handlerId', handler_name: 'handlerName',
    handle_result: 'handleResult', create_time: 'createdAt', update_time: 'updatedAt',
    resolve_time: 'resolvedAt', assigned_at: 'assignedAt',
    reporter_id: 'reporterId', reporter_name: 'reporterName',
    assignee_id: 'assigneeId', assignee_name: 'assigneeName',
    // 巡查流转闭环字段
    crop_name: 'cropName',
    inspector_id: 'inspectorId', inspector_name: 'inspectorName',
    check_date: 'checkDate', check_time: 'checkTime',
    crop_status: 'cropStatus',
    plant_height: 'plantHeight', leaf_count: 'leafCount',
    issue_text: 'issueText', issue_severity: 'issueSeverity',
    handle_date: 'handleDate',
    source_task_id: 'sourceTaskId',
    flow_records: 'flowRecords',
    rework_count: 'reworkCount',
    accepted_by: 'acceptedBy', accepted_time: 'acceptedTime',
    rejected_by: 'rejectedBy', rejected_reason: 'rejectedReason', rejected_time: 'rejectedTime',
    completion_time: 'completionTime',
    expected_completion: 'expectedCompletion',
    source_module: 'sourceModule', source_detail: 'sourceDetail',
  };
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(db)) {
    r[map[k] || k] = v;
  }
  r.title = r.title || r.problem_title || '';
  r.status = r.status || 'pending';
  r.createdAt = r.createdAt || r.create_time || new Date().toISOString();
  // flowRecords JSON 解析
  if (typeof r.flowRecords === 'string' && r.flowRecords) {
    try { r.flowRecords = JSON.parse(r.flowRecords as string); } catch { r.flowRecords = []; }
  }
  if (!r.flowRecords) r.flowRecords = [];
  // images JSON 解析
  if (typeof r.images === 'string' && r.images) {
    try { r.images = JSON.parse(r.images as string); } catch { r.images = []; }
  }
  return r as ProblemData;
}

// ========== Store ==========

interface ProblemState {
  problems: ProblemData[];
  isLoading: boolean;
  error: string | null;

  fetchProblems: (filters?: Record<string, string>) => Promise<void>;
  createProblem: (problem: Partial<ProblemData>) => Promise<ProblemData | null>;
  updateProblem: (id: number | string, updates: Partial<ProblemData>) => Promise<void>;
  deleteProblem: (id: number | string) => Promise<boolean>;
  deleteProblems: (ids: (number | string)[]) => Promise<boolean>;
}

export const useProblemStore = create<ProblemState>()(
  persist(
    (set, get) => ({
      problems: [],
      isLoading: false,
      error: null,

      fetchProblems: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters) {
            Object.entries(filters).forEach(([k, v]) => { if (v) params.set(k, v); });
          }
          const query = params.toString();
          const url = `/problems${query ? `?${query}` : ''}`;
          const response = await enhancedApiClient.get<{ success: boolean; data: ProblemData[] }>(url);
          // enhancedApiClient 已提取 .data，response 即为实际数据数组
          const data = Array.isArray(response) ? response : [];
          set({ problems: data.map(normalize), isLoading: false });
        } catch (error) {
          console.warn('[ProblemStore] API获取失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      createProblem: async (problem) => {
        try {
          const response = await enhancedApiClient.post<{ success: boolean; data: { id: number } }>(
            '/problems', problem, { priority: 0 }
          );
          const newId = (response as any)?.id || Date.now();
          const newProblem = { ...problem, id: newId } as ProblemData;
          set((state) => ({ problems: [newProblem, ...state.problems] }));
          return newProblem;
        } catch (error) {
          console.warn('[ProblemStore] 创建失败:', error);
          return null;
        }
      },

      updateProblem: async (id, updates) => {
        set((state) => ({
          problems: state.problems.map((p) => (p.id === id ? { ...p, ...updates } : p)),
        }));
        try {
          await enhancedApiClient.put(`/problems/${id}`, updates, { priority: 0 });
        } catch (error) {
          console.warn('[ProblemStore] 更新失败:', error);
        }
      },

      deleteProblem: async (id) => {
        set((state) => ({ problems: state.problems.filter((p) => p.id !== id) }));
        try {
          await enhancedApiClient.delete(`/problems/${id}`, { priority: 0 });
          return true;
        } catch (error) {
          console.warn('[ProblemStore] 删除失败:', error);
          return false;
        }
      },

      deleteProblems: async (ids) => {
        set((state) => ({ problems: state.problems.filter((p) => !ids.includes(p.id)) }));
        try {
          await Promise.all(ids.map((id) =>
            enhancedApiClient.delete(`/problems/${id}`, { priority: 0 }).catch(() => {})
          ));
          return true;
        } catch { return false; }
      },
    }),
    {
      name: 'problem-data-storage',
      partialize: (state) => ({ problems: state.problems }),
    }
  )
);
