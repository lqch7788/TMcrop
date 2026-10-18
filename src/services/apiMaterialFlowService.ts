/**
 * 物料流转追溯 API 服务
 * 2026-06-13 新建
 */
import { enhancedApiClient } from '../lib/apiClient';

/** 流转记录/统计行（后端原始行，字段动态，由调用方按需读取） */
type FlowRow = Record<string, unknown>;

export async function getFlowLogs(params: {
  page?: number; pageSize?: number; flowType?: string;
  cropName?: string; sourceCode?: string; targetCode?: string;
  // 2026-08-21：批次号合并筛选（替代原批次追溯 tab 的 /trace 端点功能）
  batchCode?: string;
  startDate?: string; endDate?: string;
}): Promise<{ list: FlowRow[]; total: number; page?: number; pageSize?: number }> {
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

/**
 * 2026-10-18 P1 修复：按当前筛选拉取全部流转记录（用于"导出全部"）。
 * 后端 pageSize 上限 100，这里循环分页；超过 MAX_EXPORT_ROWS 时截断并显式返回 truncated。
 */
export async function getAllFlowLogs(params: {
  flowType?: string; cropName?: string; batchCode?: string;
  startDate?: string; endDate?: string;
}): Promise<{ list: FlowRow[]; total: number; truncated: boolean }> {
  const PAGE_SIZE = 100;
  const MAX_EXPORT_ROWS = 5000;
  const all: FlowRow[] = [];
  let total = 0;
  for (let page = 1; page <= Math.ceil(MAX_EXPORT_ROWS / PAGE_SIZE); page++) {
    const res = await getFlowLogs({ ...params, page, pageSize: PAGE_SIZE });
    const list = res.list || [];
    total = res.total || all.length + list.length;
    all.push(...list);
    if (list.length < PAGE_SIZE || all.length >= total) break;
  }
  const truncated = all.length > MAX_EXPORT_ROWS;
  return { list: truncated ? all.slice(0, MAX_EXPORT_ROWS) : all, total, truncated };
}

export async function traceFlow(code: string): Promise<FlowRow[]> {
  return enhancedApiClient.get(`/material-flow-log/trace?code=${encodeURIComponent(code)}`);
}

export async function getCropStats(year?: number): Promise<FlowRow[]> {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/by-crop${qs}`);
}

export async function getSourceStats(year?: number): Promise<FlowRow[]> {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/by-source${qs}`);
}

export async function getAnnualStats(year?: number): Promise<FlowRow[]> {
  const qs = year ? `?year=${year}` : '';
  return enhancedApiClient.get(`/material-flow-log/stats/annual${qs}`);
}

export async function getInventoryTrace(instanceId: string): Promise<FlowRow[]> {
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
