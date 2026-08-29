/**
 * IoT 预警 Store（2026-08-29）
 * 架构：组件 → Store → apiIotAlertsService → enhancedApiClient → 后端
 * V2.1 铁律：纯内存，无 IndexedDB / localStorage / persist
 */

import { create } from 'zustand';
import { getIotAlerts, IotAlert, AlertStatus } from '@/services/apiIotAlertsService';

interface IotAlertState {
  alerts: IotAlert[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  fetchAlerts: (force?: boolean, status?: AlertStatus) => Promise<void>;
  refresh: () => Promise<void>;
  reset: () => void;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useIotAlertStore = create<IotAlertState>()((set, get) => ({
  alerts: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchAlerts: async (force = false, status?: AlertStatus) => {
    const { lastFetch, alerts } = get();
    if (!force && lastFetch && alerts.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getIotAlerts(status);
      set({
        alerts: data,
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
    await get().fetchAlerts(true);
  },

  reset: () => {
    set({
      alerts: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  },
}));