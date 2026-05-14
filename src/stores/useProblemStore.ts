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
  };
  const r: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(db)) {
    r[map[k] || k] = v;
  }
  r.title = r.title || r.problem_title || '';
  r.status = r.status || 'pending';
  r.createdAt = r.createdAt || r.create_time || new Date().toISOString();
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
          const data = Array.isArray(response?.data) ? response.data : [];
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
          const newId = (response as any)?.data?.id || Date.now();
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
