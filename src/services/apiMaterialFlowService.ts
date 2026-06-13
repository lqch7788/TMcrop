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
  return enhancedApiClient.get('/material-flow-log/trace', { code });
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
