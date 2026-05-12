/**
 * IoT设备监控 Store - IotStore
 *
 * Phase 5: IoT监控模块
 *
 * 设计原则：
 * 1. 优先调用API获取实时数据
 * 2. 支持离线缓存
 * 3. 支持实时数据刷新
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义 ==========

export type DeviceType = 'temperature' | 'humidity' | 'irrigation' | 'light' | 'co2' | 'soil_moisture';
export type DeviceStatus = 'online' | 'offline' | 'warning' | 'error';

export interface Device {
  id: string;
  device_code: string;
  device_name: string;
  device_type: DeviceType;
  greenhouse_id?: string;
  greenhouse_name?: string;
  status: DeviceStatus;
  temperature?: number;
  humidity?: number;
  light_intensity?: number;
  co2_concentration?: number;
  soil_moisture?: number;
  last_report_time?: string;
}

export interface DeviceReading {
  device_id: string;
  device_code: string;
  status: DeviceStatus;
  temperature?: number;
  humidity?: number;
  light_intensity?: number;
  co2_concentration?: number;
  soil_moisture?: number;
  last_report_time?: string;
  timestamp: string;
}

export interface EnvironmentDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

// ========== Store 类型 ==========

interface IotState {
  // 数据
  devices: Device[];
  selectedDevice: Device | null;
  environmentData: EnvironmentDataPoint[];

  // 加载状态
  isLoading: boolean;
  error: string | null;

  // Actions - 数据获取
  fetchDevices: (filters?: { greenhouse_id?: string; device_type?: string; status?: string }) => Promise<void>;
  fetchDeviceLatest: (deviceId: string) => Promise<DeviceReading | null>;
  fetchEnvironmentData: (params: { greenhouse_id?: string; data_type: string; interval?: string }) => Promise<void>;

  // Actions - 设备操作
  setSelectedDevice: (device: Device | null) => void;

  // Actions - 清除数据
  clearEnvironmentData: () => void;
}

// ========== Store 实现 ==========

export const useIotStore = create<IotState>()(
  persist(
    (set, get) => ({
      // 初始状态
      devices: [],
      selectedDevice: null,
      environmentData: [],
      isLoading: false,
      error: null,

      // ========== 数据获取 ==========

      fetchDevices: async (filters) => {
        set({ isLoading: true, error: null });

        try {
          const params = new URLSearchParams();
          if (filters?.greenhouse_id) params.set('greenhouse_id', filters.greenhouse_id);
          if (filters?.device_type) params.set('device_type', filters.device_type);
          if (filters?.status) params.set('status', filters.status);

          const apiData = await enhancedApiClient.get<{ data: Device[] }>(`/iot/devices?${params.toString()}`);

          if (apiData && Array.isArray(apiData)) {
            set({ devices: apiData, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[IotStore] 获取设备列表失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchDeviceLatest: async (deviceId) => {
        try {
          const data = await enhancedApiClient.get<{ data: DeviceReading }>(`/iot/devices/${deviceId}/latest`);
          return data || null;
        } catch (error) {
          console.warn('[IotStore] 获取设备最新数据失败:', error);
          return null;
        }
      },

      fetchEnvironmentData: async (params) => {
        set({ isLoading: true, error: null });

        try {
          const queryParams = new URLSearchParams();
          if (params.greenhouse_id) queryParams.set('greenhouse_id', params.greenhouse_id);
          queryParams.set('data_type', params.data_type);
          if (params.interval) queryParams.set('interval', params.interval);

          const data = await enhancedApiClient.get<{ data: EnvironmentDataPoint[] }>(`/iot/environment?${queryParams.toString()}`);

          if (data && Array.isArray(data)) {
            set({ environmentData: data, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[IotStore] 获取环境数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      // ========== 设备操作 ==========

      setSelectedDevice: (device) => {
        set({ selectedDevice: device });
      },

      // ========== 清除数据 ==========

      clearEnvironmentData: () => {
        set({ environmentData: [] });
      },
    }),
    {
      name: 'iot-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({
        devices: state.devices,
        selectedDevice: state.selectedDevice,
      }),
    }
  )
);

// ========== 辅助函数 ==========

export const getDevicesByGreenhouse = (greenhouseId: string) => {
  return useIotStore.getState().devices.filter(d => d.greenhouse_id === greenhouseId);
};

export const getDevicesByType = (type: DeviceType) => {
  return useIotStore.getState().devices.filter(d => d.device_type === type);
};

export const getOnlineDevices = () => {
  return useIotStore.getState().devices.filter(d => d.status === 'online');
};
