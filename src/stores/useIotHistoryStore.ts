/**
 * IoT 历史数据 Store（2026-08-29）
 */

import { create } from 'zustand';
import { getIotHistory, IotHistory, HistoryDataType } from '@/services/apiIotHistoryService';

interface IotHistoryState {
  records: IotHistory[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchHistory: (force?: boolean, dataType?: HistoryDataType) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useIotHistoryStore = create<IotHistoryState>()((set, get) => ({
  records: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchHistory: async (force = false, dataType?: HistoryDataType) => {
    const { lastFetch, records } = get();
    if (!force && lastFetch && records.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getIotHistory(dataType);
      set({
        records: data,
        loading: false,
        error: null,
        lastFetch: Date.now(),
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      set({
        loading: false,
        error: message,
      });
    }
  },

  refresh: async () => {
    await get().fetchHistory(true);
  },

  reset: () => {
    set({
      records: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  },
}));