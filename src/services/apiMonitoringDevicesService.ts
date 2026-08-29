/**
 * 设备监控中心 API Service（2026-08-29）
 * 对接后端 /api/monitoring/devices
 * 数据流：组件 → Store → Service → enhancedApiClient → 后端
 * V2.1 铁律：禁用 IndexedDB / localStorage / persist 兜底
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 监控设备状态枚举 */
export type MonitoringDeviceStatus = 'running' | 'idle' | 'offline';

/** 监控设备原始数据（后端返回 camelCase — 中间件自动 snake→camel） */
export interface MonitoringDeviceRaw {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  location: string | null;
  status: MonitoringDeviceStatus;
  isOnline: number;          // 0 / 1
  lastUpdate: string | null;
  createdAt?: string;
  updatedAt?: string;
}

/** 监控设备前端展示数据（camelCase） */
export interface MonitoringDevice {
  id: string;
  deviceCode: string;
  deviceName: string;
  deviceType: string;
  location: string;
  status: MonitoringDeviceStatus;
  statusLabel: string;        // '运行中' / '待机' / '离线'
  online: boolean;
  lastUpdate: string;
}

const STATUS_LABEL: Record<MonitoringDeviceStatus, string> = {
  running: '运行中',
  idle: '待机',
  offline: '离线',
};

/** 透传：API 已返回 camelCase 字段（中间件自动转换），只需补 statusLabel */
function normalize(raw: MonitoringDeviceRaw): MonitoringDevice {
  return {
    id: raw.id,
    deviceCode: raw.deviceCode,
    deviceName: raw.deviceName,
    deviceType: raw.deviceType,
    location: raw.location ?? '',
    status: raw.status,
    statusLabel: STATUS_LABEL[raw.status] ?? '未知',
    online: raw.isOnline === 1,
    lastUpdate: raw.lastUpdate ?? '',
  };
}

/**
 * 获取监控设备列表
 * @param status 状态筛选（可选）
 */
export async function getMonitoringDevices(
  status?: MonitoringDeviceStatus
): Promise<MonitoringDevice[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const raws = await enhancedApiClient.get<MonitoringDeviceRaw[]>(`/monitoring/devices${qs}`);
  return raws.map(normalize);
}