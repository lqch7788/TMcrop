/**
 * 物料流转追溯 API 服务
 * 2026-06-13 新建
 */
import { enhancedApiClient } from '../lib/apiClient';

export async function getFlowLogs(params: {
  page?: number; pageSize?: number; flowType?: string;
  cropName?: string; sourceCode?: string; targetCode?: string;
  startDate?: string; endDate?: string;
}) {
  return enhancedApiClient.get('/material-flow-log', params);
}

export async function traceFlow(code: string) {
  return enhancedApiClient.get(`/material-flow-log/trace?code=${encodeURIComponent(code)}`);
}

export async function getCropStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/by-crop', { year });
}

export async function getSourceStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/by-source', { year });
}

export async function getAnnualStats(year?: number) {
  return enhancedApiClient.get('/material-flow-log/stats/annual', { year });
}

export async function getInventoryTrace(instanceId: string) {
  return enhancedApiClient.get('/material-flow-log/stats/inventory-trace', { instanceId });
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
