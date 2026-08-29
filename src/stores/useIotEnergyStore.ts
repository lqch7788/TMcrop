/**
 * IoT 能耗 Store（2026-08-29）
 * 架构：组件 → Store → apiIotEnergyReadingsService → enhancedApiClient → 后端
 * V2.1 铁律：纯内存，无 IndexedDB / localStorage / persist
 */

import { create } from 'zustand';
import { getIotEnergyReadings, IotEnergyReading } from '@/services/apiIotEnergyReadingsService';

interface IotEnergyState {
  readings: IotEnergyReading[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchReadings: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useIotEnergyStore = create<IotEnergyState>()((set, get) => ({
  readings: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchReadings: async (force = false) => {
    const { lastFetch, readings } = get();
    if (!force && lastFetch && readings.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getIotEnergyReadings();
      set({
        readings: data,
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
    await get().fetchReadings(true);
  },

  reset: () => {
    set({
      readings: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  },
}));