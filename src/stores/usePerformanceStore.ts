/**
 * 绩效考核 Zustand Store
 *
 * 架构：Component → Zustand Store → apiPerformanceService → enhancedApiClient → 后端API (SQLite)
 * 数据流：V2.1 铁律（无缓存、无 persist、无 IndexedDB）
 *
 * 2026-06-27 P0：原 mock + persist 模式已废弃，改为 API 持久化模式
 */

import { create } from 'zustand';
import * as performanceService from '../services/apiPerformanceService';
import type {
  PerformanceRecord,
  CreatePerformanceParams,
  UpdatePerformanceParams,
} from '../services/apiPerformanceService';

// 兼容旧类型（src/components/labor/performance/types.ts）
export type { PerformanceRecord } from '../services/apiPerformanceService';
export interface PerformanceFilters {
  month: string;       // YYYY-MM 或空
  department: string;  // 部门或空
  keyword: string;     // 姓名关键词
}

interface PerformanceState {
  items: PerformanceRecord[];
  filters: PerformanceFilters;
  isLoading: boolean;
  error: string | null;

  // 数据操作
  fetchItems: () => Promise<void>;
  addItem: (item: CreatePerformanceParams) => Promise<PerformanceRecord>;
  updateItem: (id: string, updates: UpdatePerformanceParams) => Promise<PerformanceRecord>;
  deleteItem: (id: string) => Promise<boolean>;
  deleteItems: (ids: string[]) => Promise<boolean>;
  setFilters: (filters: Partial<PerformanceFilters>) => void;
  resetFilters: () => void;
}

export const usePerformanceStore = create<PerformanceState>()(
  (set, get) => ({
    items: [],
    filters: { month: '', department: '', keyword: '' },
    isLoading: false,
    error: null,

    /** 加载考核列表 */
    fetchItems: async () => {
      set({ isLoading: true, error: null });
      try {
        const f = get().filters;
        const response = await performanceService.getPerformanceRecords({
          month: f.month || undefined,
          department: f.department || undefined,
          keyword: f.keyword || undefined,
        });
        set({ items: response.records, isLoading: false });
      } catch (e) {
        const msg = e instanceof Error ? e.message : '加载考核记录失败';
        set({ error: msg, isLoading: false });
        throw e;
      }
    },

    /** 新增考核记录（API 持久化） */
    addItem: async (item) => {
      const created = await performanceService.createPerformance({
        staffId: item.staffId,
        staffName: item.staffName,
        department: item.department,
        month: item.month,
        taskCompletionRate: item.taskCompletionRate ?? 0,
        attendanceRate: item.attendanceRate ?? 0,
        workQuality: item.workQuality ?? 0,
        safetyCompliance: item.safetyCompliance ?? 0,
        teamworkAttitude: item.teamworkAttitude ?? 0,
        totalScore: item.totalScore ?? 0,
        rank: item.rank,
        status: item.status || '待评估',
        remarks: item.remarks,
      });
      set((state) => ({ items: [created, ...state.items] }));
      return created;
    },

    /** 更新考核记录 */
    updateItem: async (id, updates) => {
      const updated = await performanceService.updatePerformance(id, updates);
      set((state) => ({
        items: state.items.map((item) => (item.id === id ? updated : item)),
      }));
      return updated;
    },

    /** 删除单条 */
    deleteItem: async (id) => {
      await performanceService.deletePerformance(id);
      set((state) => ({ items: state.items.filter((item) => item.id !== id) }));
      return true;
    },

    /** 批量删除 */
    deleteItems: async (ids) => {
      await performanceService.deletePerformances(ids);
      set((state) => ({ items: state.items.filter((item) => !ids.includes(item.id)) }));
      return true;
    },

    /** 设置筛选条件 */
    setFilters: (newFilters) => {
      set((state) => ({ filters: { ...state.filters, ...newFilters } }));
    },

    /** 重置筛选条件 */
    resetFilters: () => {
      set({ filters: { month: '', department: '', keyword: '' } });
    },
  })
);