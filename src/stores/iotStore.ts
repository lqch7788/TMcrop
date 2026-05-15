/**
 * IoT设备监控 Store
 *
 * 架构：enhancedApiClient → /api/iot/* → SQLite iot_sensors 表
 * 数据流：Store → 组件（组件不直接读写 localStorage）
 * 种子数据：32 个传感器（4 个温室，8 种类型）
 */

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import { enhancedApiClient } from '../lib/apiClient';

// ========== 类型定义（camelCase，匹配前端 IoTSensor 格式）==========

export type DeviceType = 'air_temp' | 'air_humidity' | 'soil_moisture' | 'soil_temp' | 'soil_ec' | 'soil_ph' | 'light' | 'co2';
export type DeviceStatus = 'normal' | 'warning' | 'critical' | 'offline';

/** 传感器设备（前端格式，camelCase） */
export interface Device {
  id: string;
  sensorId: string;
  greenhouseId: string;
  greenhouseName: string;
  type: DeviceType;
  typeName: string;
  value: number;
  unit: string;
  status: DeviceStatus;
  lastUpdate: string;
  createTime?: string;
  updateTime?: string;
}

export interface EnvironmentDataPoint {
  timestamp: string;
  value: number;
  unit: string;
}

// ========== 字段映射表：后端(snake_case) → 前端(camelCase) ==========

const FIELD_MAP: Record<string, string> = {
  sensor_id: 'sensorId',
  greenhouse_id: 'greenhouseId',
  greenhouse_name: 'greenhouseName',
  type_name: 'typeName',
  last_update: 'lastUpdate',
  create_time: 'createTime',
  update_time: 'updateTime',
};

/** 后端数据 → 前端 Device */
function normalize(raw: Record<string, unknown>): Device {
  const result: Record<string, unknown> = { ...raw };
  for (const [snake, camel] of Object.entries(FIELD_MAP)) {
    if (snake in result && !(camel in result)) {
      result[camel] = result[snake];
    }
  }
  return {
    id: (result.id as string) || '',
    sensorId: (result.sensorId as string) || (result.sensor_id as string) || '',
    greenhouseId: (result.greenhouseId as string) || (result.greenhouse_id as string) || '',
    greenhouseName: (result.greenhouseName as string) || (result.greenhouse_name as string) || '',
    type: (result.type as DeviceType) || 'air_temp',
    typeName: (result.typeName as string) || (result.type_name as string) || '',
    value: Number(result.value ?? 0),
    unit: (result.unit as string) || '',
    status: (result.status as DeviceStatus) || 'normal',
    lastUpdate: (result.lastUpdate as string) || (result.last_update as string) || '',
    createTime: (result.createTime as string) || (result.create_time as string),
    updateTime: (result.updateTime as string) || (result.update_time as string),
  };
}

// ========== Store 接口 ==========

interface IotState {
  devices: Device[];
  selectedDevice: Device | null;
  environmentData: EnvironmentDataPoint[];
  isLoading: boolean;
  error: string | null;

  fetchDevices: (filters?: { greenhouse_id?: string; device_type?: string; status?: string }) => Promise<void>;
  fetchDeviceLatest: (deviceId: string) => Promise<Device | null>;
  fetchEnvironmentData: (params: { greenhouse_id?: string; data_type: string; interval?: string }) => Promise<void>;
  setSelectedDevice: (device: Device | null) => void;
  clearEnvironmentData: () => void;
}

// ========== Store 实现 ==========

export const useIotStore = create<IotState>()(
  persist(
    (set, get) => ({
      devices: [],
      selectedDevice: null,
      environmentData: [],
      isLoading: false,
      error: null,

      fetchDevices: async (filters) => {
        set({ isLoading: true, error: null });
        try {
          const params = new URLSearchParams();
          if (filters?.greenhouse_id) params.set('greenhouse_id', filters.greenhouse_id);
          if (filters?.device_type) params.set('device_type', filters.device_type);
          if (filters?.status) params.set('status', filters.status);

          const data = await enhancedApiClient.get<Record<string, unknown>[]>(`/iot/devices?${params.toString()}`);
          const normalized = (Array.isArray(data) ? data : []).map(normalize);
          set({ devices: normalized, isLoading: false });
        } catch (error) {
          console.warn('[IotStore] 获取设备列表失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      fetchDeviceLatest: async (deviceId) => {
        try {
          const data = await enhancedApiClient.get<Record<string, unknown>>(`/iot/devices/${deviceId}/latest`);
          return data ? normalize(data) : null;
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

          const data = await enhancedApiClient.get<EnvironmentDataPoint[]>(`/iot/environment?${queryParams.toString()}`);
          if (Array.isArray(data)) {
            set({ environmentData: data, isLoading: false });
          } else {
            set({ isLoading: false });
          }
        } catch (error) {
          console.warn('[IotStore] 获取环境数据失败:', error);
          set({ error: (error as Error).message, isLoading: false });
        }
      },

      setSelectedDevice: (device) => set({ selectedDevice: device }),
      clearEnvironmentData: () => set({ environmentData: [] }),
    }),
    {
      name: 'iot-storage',
      storage: createJSONStorage(() => localStorage),
      partialize: (state) => ({ devices: state.devices, selectedDevice: state.selectedDevice }),
    }
  )
);

// ========== 辅助函数 ==========

export const getDevicesByGreenhouse = (greenhouseId: string) =>
  useIotStore.getState().devices.filter(d => d.greenhouseId === greenhouseId);

export const getDevicesByType = (type: DeviceType) =>
  useIotStore.getState().devices.filter(d => d.type === type);

export const getOnlineDevices = () =>
  useIotStore.getState().devices.filter(d => d.status === 'normal');
