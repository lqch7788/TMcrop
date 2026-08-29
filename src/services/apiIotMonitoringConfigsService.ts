/**
 * IoT 监测配置 API Service（2026-08-29）
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 监测配置原始（后端 camelCase） */
export interface IotMonitoringConfigRaw {
  id: string;
  configCode: string;
  configName: string;
  configType: string;
  sensors: string;            // JSON 字符串数组
  intervalSeconds: number;
  enabled: number;            // 0/1
  alertEnabled: number;       // 0/1
  updateTime: string;
  createdAt?: string;
}

/** 监测配置前端展示数据 */
export interface IotMonitoringConfig {
  id: string;
  configCode: string;
  configName: string;
  configType: string;
  sensors: string[];
  intervalSeconds: number;
  enabled: boolean;
  alertEnabled: boolean;
  updateTime: string;
}

function normalize(raw: IotMonitoringConfigRaw): IotMonitoringConfig {
  let sensors: string[] = [];
  try {
    const parsed = JSON.parse(raw.sensors || '[]');
    if (Array.isArray(parsed)) sensors = parsed.map(String);
  } catch {
    sensors = [];
  }
  return {
    id: raw.id,
    configCode: raw.configCode,
    configName: raw.configName,
    configType: raw.configType,
    sensors,
    intervalSeconds: raw.intervalSeconds,
    enabled: raw.enabled === 1,
    alertEnabled: raw.alertEnabled === 1,
    updateTime: raw.updateTime,
  };
}

export async function getIotMonitoringConfigs(): Promise<IotMonitoringConfig[]> {
  const raws = await enhancedApiClient.get<IotMonitoringConfigRaw[]>('/iot-monitoring-configs');
  return raws.map(normalize);
}