/**
 * v0.3 P0-1：批次时间线 API 服务
 *
 * 路径：
 *   GET /api/batch-timeline/:batchCode
 *   GET /api/batch-timeline/:batchCode/summary
 *
 * 符合 V2.1 铁律：
 *   - GET 不支持 params：用 URLSearchParams 拼到 URL
 *   - 自动解包 data：service 不再 .data 二层访问
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface TimelineEvent {
  eventType: 'farm_task' | 'operation' | 'daily_record' | 'harvest' | 'move';
  id: string;
  batchCode: string;
  eventDate: string;
  title: string;
  subtype: string;
  progress: number | null;
  status: string | null;
  operator: string | null;
  quantity: number | null;
  unit: string | null;
  detail: Record<string, unknown> | string | null;
}

export interface TimelineSummary {
  farm_task: number;
  operation: number;
  daily_record: number;
  harvest: number;
  move: number;
  [key: string]: number;
}

export interface TimelineResponse {
  batchCode: string;
  items: TimelineEvent[];
  total: number;
  page: number;
  pageSize: number;
}

export interface TimelineSummaryResponse {
  batchCode: string;
  summary: TimelineSummary;
  total: number;
}

export interface TimelineQuery {
  startDate?: string;
  endDate?: string;
  eventTypes?: string; // 逗号分隔
  page?: number;
  pageSize?: number;
}

/**
 * 获取批次时间线事件列表
 */
export async function getBatchTimeline(
  batchCode: string,
  query: TimelineQuery = {}
): Promise<TimelineResponse> {
  const params = new URLSearchParams();
  if (query.startDate) params.append('startDate', query.startDate);
  if (query.endDate) params.append('endDate', query.endDate);
  if (query.eventTypes) params.append('eventTypes', query.eventTypes);
  if (query.page) params.append('page', String(query.page));
  if (query.pageSize) params.append('pageSize', String(query.pageSize));

  const qs = params.toString();
  const url = `/batch-timeline/${encodeURIComponent(batchCode)}${qs ? `?${qs}` : ''}`;

  return enhancedApiClient.get<TimelineResponse>(url);
}

/**
 * 获取批次事件类型分布
 */
export async function getBatchTimelineSummary(
  batchCode: string
): Promise<TimelineSummaryResponse> {
  return enhancedApiClient.get<TimelineSummaryResponse>(
    `/batch-timeline/${encodeURIComponent(batchCode)}/summary`
  );
}
