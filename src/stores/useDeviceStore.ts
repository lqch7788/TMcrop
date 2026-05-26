/**
 * 设备 Store - Zustand 状态管理
 * 迁移自 SettingsDataProvider
 */
import { create } from 'zustand';import { getDevices, createDevice, updateDevice, deleteDevice, type Device } from '../services/apiBasicDataService';

interface DeviceStore {
  devices: Device[];
  loading: boolean;
  error: string | null;
  lastFetch: number | null;

  // 加载
  loadDevices: () => Promise<void>;

  // CRUD
  addDevice: (device: Partial<Device>) => Promise<Device>;
  editDevice: (id: string, device: Partial<Device>) => Promise<void>;
  removeDevice: (id: string) => Promise<void>;

  // 刷新
  refreshDevices: () => Promise<void>;
}

export const useDeviceStore = create<DeviceStore>()(
  (set, get)=> ({
      devices: [],
      loading: false,
      error: null,
      lastFetch: null,

      loadDevices: async () => {
        const now = Date.now();
        const lastFetch = get().lastFetch;
        if (lastFetch && now - lastFetch < 5 * 60 * 1000 && get().devices.length > 0) {
          return;
        }

        set({ loading: true, error: null });
        try {
          const data = await getDevices();
          set({ devices: data, loading: false, lastFetch: now });
        } catch (error) {
          set({ error: error instanceof Error ? error.message : '加载设备失败', loading: false });
        }
      },

      addDevice: async (device) => {
        const result = await createDevice(device);
        set(state => ({ devices: [...state.devices, result] }));
        return result;
      },

      editDevice: async (id, device) => {
        await updateDevice(id, device);
        set(state => ({
          devices: state.devices.map(d => d.id === id ? { ...d, ...device } : d)
        }));
      },

      removeDevice: async (id) => {
        await deleteDevice(id);
        set(state => ({ devices: state.devices.filter(d => d.id !== id) }));
      },

      refreshDevices: async () => {
        set({ lastFetch: null });
        await get().loadDevices();
      },
    })
);

// 辅助函数
export const getDeviceByOid = (oid: string): Device | undefined => {
  return useDeviceStore.getState().devices.find(d => d.oid === oid);
};

export const getDevicesByGreenhouseOid = (greenhouseOid: string): Device[] => {
  return useDeviceStore.getState().devices.filter(d => d.greenhouseOid === greenhouseOid);
};

export const getActiveDevices = (): Device[] => {
  return useDeviceStore.getState().devices.filter(d => d.status === 'active');
};
