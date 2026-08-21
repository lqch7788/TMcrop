/**
 * 物料流转追溯 API 服务
 * 2026-06-13 新建
 */
import { enhancedApiClient } from '../lib/apiClient';

export async function getFlowLogs(params: {
  page?: number; pageSize?: number; flowType?: string;
  cropName?: string; sourceCode?: string; targetCode?: string;
  // 2026-08-21：批次号合并筛选（替代原批次追溯 tab 的 /trace 端点功能）
  batchCode?: string;
  startDate?: string; endDate?: string;
}) {
  // enhancedApiClient.get 不支持 params 参数，必须用 URLSearchParams 拼到 URL
  const qs = new URLSearchParams();
  if (params.page) qs.set('page', String(params.page));
  if (params.pageSize) qs.set('pageSize', String(params.pageSize));
  if (params.flowType) qs.set('flowType', params.flowType);
  if (params.cropName) qs.set('cropName', params.cropName);
  if (params.sourceCode) qs.set('sourceCode', params.sourceCode);
  if (params.targetCode) qs.set('targetCode', params.targetCode);
  if (params.batchCode) qs.set('batchCode', params.batchCode);
  if (params.startDate) qs.set('startDate', params.startDate);
  if (params.endDate) qs.set('endDate', params.endDate);
  const query = qs.toString();
  return enhancedApiClient.get(`/material-flow-log${query ? `?${query}` : ''}`);
}

export async function traceFlow(code: string) {
  return enhancedApiClient.get(`/material-flow-log/trace?code=${encodeURIComponent(code)}`);
}

export async function getCropStats(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/by-crop${qs}`);
}

export async function getSourceStats(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/by-source${qs}`);
}

export async function getAnnualStats(year?: number) {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/annual${qs}`);
}

export async function getInventoryTrace(instanceId: string) {
  return enhancedApiClient.get(`/material-flow-log/stats/inventory-trace?instanceId=${encodeURIComponent(instanceId)}`);
}

// 2026-06-15: 单条删除
export async function deleteFlowLog(id: string): Promise<{ deletedCount: number }> {
  return enhancedApiClient.delete(`/material-flow-log/${id}`);
}

// 2026-06-15: 批量删除
export async function batchDeleteFlowLogs(ids: string[]): Promise<{ deletedCount: number }> {
  const query = ids.map(id => `ids=${encodeURIComponent(id)}`).join('&');
  return enhancedApiClient.delete(`/material-flow-log?${query}`);
}
