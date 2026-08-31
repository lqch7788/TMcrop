/**
 * v0.3 P0-1：批次时间线 Zustand Store
 *
 * 模式遵循 useSystemConfigStore.ts 模板
 * 增强版 API client 已自动解包 data，store 不再 .data 二层访问
 */

import { create } from 'zustand';
import {
  getBatchTimeline,
  getBatchTimelineSummary,
  type TimelineEvent,
  type TimelineSummary,
  type TimelineQuery,
} from '@/services/apiBatchTimelineService';

interface BatchTimelineState {
  events: TimelineEvent[];
  summary: TimelineSummary | null;
  loading: boolean;
  error: string | null;
  pagination: {
    page: number;
    pageSize: number;
    total: number;
  };
  filter: TimelineQuery;

  fetchTimeline: (batchCode: string, query?: TimelineQuery) => Promise<void>;
  fetchSummary: (batchCode: string) => Promise<void>;
  setFilter: (filter: Partial<TimelineQuery>) => void;
  reset: () => void;
}

const initialState = {
  events: [],
  summary: null,
  loading: false,
  error: null,
  pagination: { page: 1, pageSize: 50, total: 0 },
  filter: {},
};

export const useBatchTimelineStore = create<BatchTimelineState>((set, get) => ({
  ...initialState,

  fetchTimeline: async (batchCode: string, query: TimelineQuery = {}) => {
    set({ loading: true, error: null });
    try {
      const response = await getBatchTimeline(batchCode, query);
      set({
        events: response.items,
        pagination: {
          page: response.page,
          pageSize: response.pageSize,
          total: response.total,
        },
        loading: false,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message, loading: false });
    }
  },

  fetchSummary: async (batchCode: string) => {
    try {
      const response = await getBatchTimelineSummary(batchCode);
      set({ summary: response.summary });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      set({ error: message });
    }
  },

  setFilter: (filter: Partial<TimelineQuery>) => {
    set((state) => ({ filter: { ...state.filter, ...filter } }));
  },

  reset: () => {
    set(initialState);
  },
}));

export default useBatchTimelineStore;
