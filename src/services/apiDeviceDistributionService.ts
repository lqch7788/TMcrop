/**
 * 设备分配 API 服务
 * 对接后端 /api/device-distributions
 * iAGS DeviceDistribution 集成 — 预留端口
 */
import { enhancedApiClient } from '../lib/apiClient';

export interface DeviceDistribution {
  id: number;
  oid: string;
  deviceName: string;
  deviceCode: string | null;
  siteName: string | null;
  areaName: string | null;
  deviceType: string | null;
  motorName: string | null;
  sortOrder: number;
  allowRuntime: string | null;
  restTime: string | null;
  initialStatus: string | null;
  circuit: string | null;
  slaveDevices: string | null;
  startTime: string | null;
  showCurve: number;
  specs: string | null;
  remarks: string | null;
  status: string;
  createdAt: string | null;
  updatedAt: string | null;
}

export const apiDeviceDistributionService = {
  /** 获取设备分配列表 */
  getList: async (filters?: Record<string, string>) => {
    if (!enhancedApiClient) return { success: true, data: [] };
    const query = filters ? '?' + new URLSearchParams(filters).toString() : '';
    const response = await enhancedApiClient.get(`/api/device-distributions${query}`);
    return response as unknown as { success: boolean; data: any[] };
  },

  /** 创建分配记录 */
  create: async (data: Record<string, unknown>) => {
    const response = await enhancedApiClient.post('/api/device-distributions', data);
    return response as unknown as { success: boolean; data: any };
  },

  /** 更新分配记录 */
  update: async (oid: string, data: Record<string, unknown>) => {
    const response = await enhancedApiClient.put(`/api/device-distributions/${oid}`, data);
    return response as unknown as { success: boolean; data: any };
  },

  /** 删除分配记录 */
  delete: async (oid: string) => {
    const response = await enhancedApiClient.delete(`/api/device-distributions/${oid}`);
    return response as unknown as { success: boolean };
  },
};
