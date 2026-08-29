/**
 * IoT 监测配置 Store（2026-08-29）
 */

import { create } from 'zustand';
import { getIotMonitoringConfigs, IotMonitoringConfig } from '@/services/apiIotMonitoringConfigsService';

interface IotMonitoringConfigState {
  configs: IotMonitoringConfig[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchConfigs: (force?: boolean) => Promise<void>;
  refresh: () => Promise<void>;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useIotMonitoringConfigStore = create<IotMonitoringConfigState>()((set, get) => ({
  configs: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchConfigs: async (force = false) => {
    const { lastFetch, configs } = get();
    if (!force && lastFetch && configs.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getIotMonitoringConfigs();
      set({ configs: data, loading: false, error: null, lastFetch: Date.now() });
    } catch (error) {
      set({ loading: false, error: error instanceof Error ? error.message : String(error) });
    }
  },

  refresh: async () => {
    await get().fetchConfigs(true);
  },
}));