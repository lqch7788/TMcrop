/**
 * IoT 能耗读数 API Service（2026-08-29）
 * 对接后端 /api/iot-energy-readings
 * 数据流：组件 → Store → Service → enhancedApiClient → 后端
 * V2.1 铁律：禁用 IndexedDB / localStorage / persist 兜底
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 能耗设备状态 */
export type EnergyStatus = 'running' | 'idle' | 'fault';

/** 状态中文标签 */
export const STATUS_LABEL: Record<EnergyStatus, string> = {
  running: '运行中',
  idle: '待机',
  fault: '故障',
};

/** 能耗读数原始数据（后端返回 camelCase） */
export interface IotEnergyReadingRaw {
  id: string;
  deviceCode: string;
  deviceName: string;
  power: number;
  voltage: number;
  currentValue: number;
  powerFactor: number;
  todayUsage: number;
  status: EnergyStatus;
  updateTime: string;
  createdAt?: string;
}

/** 能耗读数前端展示数据 */
export interface IotEnergyReading {
  id: string;
  deviceCode: string;
  deviceName: string;
  power: number;
  voltage: number;
  currentValue: number;
  powerFactor: number;
  todayUsage: number;
  status: EnergyStatus;
  statusLabel: string;
  updateTime: string;
}

/** 透传 + 补 statusLabel */
function normalize(raw: IotEnergyReadingRaw): IotEnergyReading {
  return {
    id: raw.id,
    deviceCode: raw.deviceCode,
    deviceName: raw.deviceName,
    power: raw.power,
    voltage: raw.voltage,
    currentValue: raw.currentValue,
    powerFactor: raw.powerFactor,
    todayUsage: raw.todayUsage,
    status: raw.status,
    statusLabel: STATUS_LABEL[raw.status] ?? raw.status,
    updateTime: raw.updateTime,
  };
}

/** 获取能耗读数列表 */
export async function getIotEnergyReadings(): Promise<IotEnergyReading[]> {
  const raws = await enhancedApiClient.get<IotEnergyReadingRaw[]>('/iot-energy-readings');
  return raws.map(normalize);
}