/**
 * 审批流程 Store - Zustand 状态管理
 * 统一管理审批工作流的增删改查
 */
import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import {
  getWorkflows, createWorkflow, updateWorkflow, deleteWorkflow, toggleWorkflow,
  type ApprovalWorkflow,
} from '../services/apiApprovalWorkflowService';

interface ApprovalWorkflowStore {
  workflows: ApprovalWorkflow[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  loadWorkflows: () => Promise<void>;
  addWorkflow: (data: Partial<ApprovalWorkflow>) => Promise<ApprovalWorkflow>;
  editWorkflow: (id: string, data: Partial<ApprovalWorkflow>) => Promise<void>;
  removeWorkflow: (id: string) => Promise<void>;
  toggleWorkflowStatus: (id: string) => Promise<void>;
  refreshAll: () => Promise<void>;
}

export const useApprovalWorkflowStore = create<ApprovalWorkflowStore>()(
  persist(
    (set, get) => ({
      workflows: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadWorkflows: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().workflows.length > 0) return;

        set({ loading: true, error: null });
        try {
          const data = await getWorkflows();
          set({ workflows: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载审批流程失败', loading: false });
        }
      },

      addWorkflow: async (data) => {
        set({ loading: true, error: null });
        try {
          const created = await createWorkflow(data);
          set((s) => ({ workflows: [...s.workflows, created], loading: false }));
          return created;
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '创建审批流程失败', loading: false });
          throw error;
        }
      },

      editWorkflow: async (id, data) => {
        set({ loading: true, error: null });
        try {
          await updateWorkflow(id, data);
          set((s) => ({ workflows: s.workflows.map((w) => w.id === id ? { ...w, ...data } : w), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '更新审批流程失败', loading: false });
          throw error;
        }
      },

      removeWorkflow: async (id) => {
        set({ loading: true, error: null });
        try {
          await deleteWorkflow(id);
          set((s) => ({ workflows: s.workflows.filter((w) => w.id !== id), loading: false }));
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '删除审批流程失败', loading: false });
          throw error;
        }
      },

      toggleWorkflowStatus: async (id) => {
        const newStatus = await toggleWorkflow(id);
        set((s) => ({
          workflows: s.workflows.map((w) =>
            w.id === id ? { ...w, status: newStatus as 'active' | 'inactive' } : w
          ),
        }));
      },

      refreshAll: async () => { set({ lastFetch: null }); await get().loadWorkflows(); },
    }),
    {
      name: 'approval_workflow_store',
      partialize: (s) => ({ workflows: s.workflows }),
    }
  )
);
