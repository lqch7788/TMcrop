/**
 * 风险预警 API 服务
 * 对接后端 /api/risks
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 2026-06-27 P0：替代原 useRiskStore 的 mock 模式
 */

import { enhancedApiClient } from '../lib/apiClient';

export type AlertLevel = 'warning' | 'danger' | 'critical';

export interface RiskAlert {
  id: string;
  alertType: string;
  alertTypeName?: string;
  level: AlertLevel;
  title: string;
  content?: string;
  staffId?: string;
  staffName?: string;
  department?: string;
  status: string;
  handleTime?: string;
  handler?: string;
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

export interface CreateRiskAlertParams {
  alertType: string;
  alertTypeName?: string;
  level?: AlertLevel;
  title: string;
  content?: string;
  staffId?: string;
  staffName?: string;
  department?: string;
  status?: string;
  remarks?: string;
}

export interface UpdateRiskAlertParams {
  alertType?: string;
  alertTypeName?: string;
  level?: AlertLevel;
  title?: string;
  content?: string;
  staffId?: string;
  staffName?: string;
  department?: string;
  status?: string;
  handleTime?: string;
  handler?: string;
  remarks?: string;
}

export interface RiskListResponse {
  records: RiskAlert[];
  pagination: { page: number; limit: number; total: number };
}

export async function getRiskAlerts(
  filters?: {
    status?: string;
    level?: string;
    alertType?: string;
    department?: string;
    keyword?: string;
  },
  pagination?: { page?: number; limit?: number }
): Promise<RiskListResponse> {
  const params = new URLSearchParams();
  if (filters?.status) params.set('status', filters.status);
  if (filters?.level) params.set('level', filters.level);
  if (filters?.alertType) params.set('alertType', filters.alertType);
  if (filters?.department) params.set('department', filters.department);
  if (filters?.keyword) params.set('keyword', filters.keyword);
  if (pagination?.page) params.set('page', String(pagination.page));
  if (pagination?.limit) params.set('limit', String(pagination.limit));

  const url = `/risks${params.toString() ? '?' + params.toString() : ''}`;
  const response = await enhancedApiClient.get<any>(url);
  const data: any[] = Array.isArray(response) ? response : (response.data || []);
  const total = response.total ?? data.length;

  return {
    records: data as RiskAlert[],
    pagination: { page: pagination?.page || 1, limit: pagination?.limit || 50, total },
  };
}

export async function getRiskAlertById(id: string): Promise<RiskAlert | null> {
  const response = await enhancedApiClient.get<any>(`/risks/${id}`);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return (data as RiskAlert) || null;
}

export async function createRiskAlert(params: CreateRiskAlertParams): Promise<RiskAlert> {
  const response = await enhancedApiClient.post<any>('/risks', params);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as RiskAlert;
}

export async function updateRiskAlert(id: string, updates: UpdateRiskAlertParams): Promise<RiskAlert> {
  const response = await enhancedApiClient.put<any>(`/risks/${id}`, updates);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as RiskAlert;
}

export async function deleteRiskAlert(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/risks/${id}`);
  return true;
}

export async function deleteRiskAlerts(ids: string[]): Promise<boolean> {
  await Promise.all(ids.map((id) => enhancedApiClient.delete(`/risks/${id}`)));
  return true;
}