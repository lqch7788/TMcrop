/**
 * 设备监控中心 Store（2026-08-29）
 * 架构：组件 → Store → apiMonitoringDevicesService → enhancedApiClient → 后端
 * V2.1 铁律：纯内存，禁止 IndexedDB / localStorage / persist
 */

import { create } from 'zustand';
import {
  getMonitoringDevices,
  MonitoringDevice,
  MonitoringDeviceStatus,
} from '@/services/apiMonitoringDevicesService';

interface MonitoringDeviceState {
  devices: MonitoringDevice[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  /** 加载设备列表（10 分钟内不重复拉） */
  fetchDevices: (force?: boolean, status?: MonitoringDeviceStatus) => Promise<void>;
  /** 强制刷新 */
  refresh: () => Promise<void>;
  /** 重置 */
  reset: () => void;
}

const CACHE_TTL = 10 * 60 * 1000;

export const useMonitoringDeviceStore = create<MonitoringDeviceState>()((set, get) => ({
  devices: [],
  loading: false,
  error: null,
  lastFetch: null,

  fetchDevices: async (force = false, status?: MonitoringDeviceStatus) => {
    const { lastFetch, devices } = get();
    if (!force && lastFetch && devices.length > 0 && Date.now() - lastFetch < CACHE_TTL) {
      return;
    }
    set({ loading: true, error: null });
    try {
      const data = await getMonitoringDevices(status);
      set({
        devices: data,
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
    await get().fetchDevices(true);
  },

  reset: () => {
    set({
      devices: [],
      loading: false,
      error: null,
      lastFetch: null,
    });
  },
}));