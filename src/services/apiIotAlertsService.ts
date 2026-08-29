/**
 * IoT 预警信息 API Service（2026-08-29）
 * 对接后端 /api/iot-alerts
 * 数据流：组件 → Store → Service → enhancedApiClient → 后端
 * V2.1 铁律：禁用 IndexedDB / localStorage / persist 兜底
 */

import { enhancedApiClient } from '../lib/apiClient';

/** 预警状态枚举 */
export type AlertStatus = 'pending' | 'processing' | 'processed';

/** 预警级别枚举 */
export type AlertLevel = 'info' | 'warning' | 'error' | 'critical';

/** 状态中文标签 */
export const STATUS_LABEL: Record<AlertStatus, string> = {
  pending: '待处理',
  processing: '处理中',
  processed: '已处理',
};

/** 级别中文标签 */
export const LEVEL_LABEL: Record<AlertLevel, string> = {
  info: '提示',
  warning: '警告',
  error: '紧急',
  critical: '严重',
};

/** 预警原始数据（后端返回 camelCase） */
export interface IotAlertRaw {
  id: string;
  alertCode: string;
  alertType: string;
  alertTypeName?: string | null;
  level: AlertLevel;
  title: string;
  message?: string | null;
  status: AlertStatus;
  createTime: string;
  updateTime?: string | null;
  createdAt?: string;
}

/** 预警前端展示数据 */
export interface IotAlert {
  id: string;
  alertCode: string;
  type: string;
  typeName: string;
  level: AlertLevel;
  levelLabel: string;
  title: string;
  message: string;
  status: AlertStatus;
  statusLabel: string;
  time: string;
}

/** 透传（API 已返回 camelCase）+ 补 levelLabel/status  标签 */
function normalize(raw: IotAlertRaw): IotAlert {
  return {
    id: raw.id,
    alertCode: raw.alertCode,
    type: raw.alertType,
    typeName: raw.alertTypeName ?? raw.alertType,
    level: raw.level,
    levelLabel: LEVEL_LABEL[raw.level] ?? '其他',
    title: raw.title,
    message: raw.message ?? '',
    status: raw.status,
    statusLabel: STATUS_LABEL[raw.status] ?? raw.status,
    time: raw.createTime,
  };
}

/**
 * 获取 IoT 预警列表
 * @param status 状态筛选（可选）
 */
export async function getIotAlerts(status?: AlertStatus): Promise<IotAlert[]> {
  const qs = status ? `?status=${encodeURIComponent(status)}` : '';
  const raws = await enhancedApiClient.get<IotAlertRaw[]>(`/iot-alerts${qs}`);
  return raws.map(normalize);
}