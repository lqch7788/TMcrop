/**
 * 物料流转追溯 Zustand Store
 * 2026-06-13 新建
 */
import { create } from 'zustand';
import * as flowService from '../services/apiMaterialFlowService';

interface MaterialFlowState {
  logs: any[];
  total: number;
  loading: boolean;
  traceData: any[];
  statsData: any[];
  // 2026-07-28 审核 H-8：error 状态（修复吞错，"Fail Loud"原则）
  error: string | null;

  loadLogs: (params: any) => Promise<void>;
  loadTrace: (code: string) => Promise<void>;
  loadCropStats: (year?: number) => Promise<void>;
  loadSourceStats: (year?: number) => Promise<void>;
  loadAnnualStats: (year?: number) => Promise<void>;
  // 2026-06-15: 删除支持
  deleteLog: (id: string) => Promise<boolean>;
  batchDeleteLogs: (ids: string[]) => Promise<boolean>;
  clearError: () => void;
}

export const useMaterialFlowStore = create<MaterialFlowState>()((set, get) => ({
  logs: [],
  total: 0,
  loading: false,
  traceData: [],
  statsData: [],
  error: null,

  loadLogs: async (params) => {
    set({ loading: true, error: null });
    try {
      const data = await flowService.getFlowLogs(params);
      set({ logs: data?.list || [], total: data?.total || 0, loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载流转记录失败' });
    }
  },

  loadTrace: async (code) => {
    set({ loading: true, error: null });
    try {
      const data = await flowService.traceFlow(code);
      set({ traceData: data || [], loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载追溯链失败' });
    }
  },

  loadCropStats: async (year?) => {
    set({ loading: true, error: null });
    try {
      const data = await flowService.getCropStats(year);
      set({ statsData: data || [], loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载作物统计失败' });
    }
  },

  loadSourceStats: async (year?) => {
    set({ loading: true, error: null });
    try {
      const data = await flowService.getSourceStats(year);
      set({ statsData: data || [], loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载来源统计失败' });
    }
  },

  loadAnnualStats: async (year?) => {
    set({ loading: true, error: null });
    try {
      const data = await flowService.getAnnualStats(year);
      set({ statsData: data || [], loading: false });
    } catch (e: any) {
      set({ loading: false, error: e?.message || '加载年度统计失败' });
    }
  },

  deleteLog: async (id) => {
    try {
      await flowService.deleteFlowLog(id);
      set({ logs: get().logs.filter((l: any) => l.id !== id), total: Math.max(0, get().total - 1) });
      return true;
    } catch (e: any) {
      set({ error: e?.message || '删除失败' });
      return false;
    }
  },

  batchDeleteLogs: async (ids) => {
    try {
      await flowService.batchDeleteFlowLogs(ids);
      const idSet = new Set(ids);
      set({ logs: get().logs.filter((l: any) => !idSet.has(l.id)), total: Math.max(0, get().total - ids.length) });
      return true;
    } catch (e: any) {
      set({ error: e?.message || '批量删除失败' });
      return false;
    }
  },

  clearError: () => set({ error: null }),
}));
