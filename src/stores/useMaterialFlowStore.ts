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

  loadLogs: (params: any) => Promise<void>;
  loadTrace: (code: string) => Promise<void>;
  loadCropStats: (year?: number) => Promise<void>;
  loadSourceStats: (year?: number) => Promise<void>;
  loadAnnualStats: (year?: number) => Promise<void>;
  // 2026-06-15: 删除支持
  deleteLog: (id: string) => Promise<boolean>;
  batchDeleteLogs: (ids: string[]) => Promise<boolean>;
}

export const useMaterialFlowStore = create<MaterialFlowState>()((set, get) => ({
  logs: [],
  total: 0,
  loading: false,
  traceData: [],
  statsData: [],

  loadLogs: async (params) => {
    set({ loading: true });
    try {
      const data = await flowService.getFlowLogs(params);
      set({ logs: data?.list || [], total: data?.total || 0, loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadTrace: async (code) => {
    set({ loading: true });
    try {
      const data = await flowService.traceFlow(code);
      set({ traceData: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadCropStats: async (year?) => {
    set({ loading: true });
    try {
      const data = await flowService.getCropStats(year);
      set({ statsData: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadSourceStats: async (year?) => {
    set({ loading: true });
    try {
      const data = await flowService.getSourceStats(year);
      set({ statsData: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  loadAnnualStats: async (year?) => {
    set({ loading: true });
    try {
      const data = await flowService.getAnnualStats(year);
      set({ statsData: data || [], loading: false });
    } catch {
      set({ loading: false });
    }
  },

  deleteLog: async (id) => {
    try {
      await flowService.deleteFlowLog(id);
      set({ logs: get().logs.filter((l: any) => l.id !== id), total: Math.max(0, get().total - 1) });
      return true;
    } catch {
      return false;
    }
  },

  batchDeleteLogs: async (ids) => {
    try {
      await flowService.batchDeleteFlowLogs(ids);
      const idSet = new Set(ids);
      set({ logs: get().logs.filter((l: any) => !idSet.has(l.id)), total: Math.max(0, get().total - ids.length) });
      return true;
    } catch {
      return false;
    }
  },
}));
