/**
 * 绩效考核 API 服务
 * 对接后端 /api/performance
 *
 * 数据流：API → enhancedApiClient → 组件（无缓存层，V2.1 铁律）
 *
 * 2026-06-27 P0：替代原 usePerformanceStore 的 mock 模式
 */

import { enhancedApiClient } from '../lib/apiClient';

export interface PerformanceRecord {
  id: string;
  staffId: string;
  staffName: string;
  department?: string;
  month: string;
  taskCompletionRate: number;
  attendanceRate: number;
  workQuality: number;
  safetyCompliance: number;
  teamworkAttitude: number;
  totalScore: number;
  rank?: string;
  status: string;
  remarks?: string;
  createTime: string;
  updateTime?: string;
}

export interface CreatePerformanceParams {
  staffId: string;
  staffName: string;
  department?: string;
  month: string;
  taskCompletionRate?: number;
  attendanceRate?: number;
  workQuality?: number;
  safetyCompliance?: number;
  teamworkAttitude?: number;
  totalScore?: number;
  rank?: string;
  status?: string;
  remarks?: string;
}

export interface UpdatePerformanceParams {
  staffId?: string;
  staffName?: string;
  department?: string;
  month?: string;
  taskCompletionRate?: number;
  attendanceRate?: number;
  workQuality?: number;
  safetyCompliance?: number;
  teamworkAttitude?: number;
  totalScore?: number;
  rank?: string;
  status?: string;
  remarks?: string;
}

export interface PerformanceListResponse {
  records: PerformanceRecord[];
  pagination: { page: number; limit: number; total: number };
}

export async function getPerformanceRecords(
  filters?: { month?: string; department?: string; keyword?: string },
  pagination?: { page?: number; limit?: number }
): Promise<PerformanceListResponse> {
  const params = new URLSearchParams();
  if (filters?.month) params.set('month', filters.month);
  if (filters?.department) params.set('department', filters.department);
  if (filters?.keyword) params.set('keyword', filters.keyword);
  if (pagination?.page) params.set('page', String(pagination.page));
  if (pagination?.limit) params.set('limit', String(pagination.limit));

  const url = `/performance${params.toString() ? '?' + params.toString() : ''}`;
  const response = await enhancedApiClient.get<any>(url);
  const data: any[] = Array.isArray(response) ? response : (response.data || []);
  const total = response.total ?? data.length;

  return {
    records: data as PerformanceRecord[],
    pagination: { page: pagination?.page || 1, limit: pagination?.limit || 50, total },
  };
}

export async function getPerformanceById(id: string): Promise<PerformanceRecord | null> {
  const response = await enhancedApiClient.get<any>(`/performance/${id}`);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return (data as PerformanceRecord) || null;
}

export async function createPerformance(params: CreatePerformanceParams): Promise<PerformanceRecord> {
  const response = await enhancedApiClient.post<any>('/performance', params);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as PerformanceRecord;
}

export async function updatePerformance(id: string, updates: UpdatePerformanceParams): Promise<PerformanceRecord> {
  const response = await enhancedApiClient.put<any>(`/performance/${id}`, updates);
  const data = Array.isArray(response) ? response[0] : response.data || response;
  return data as PerformanceRecord;
}

export async function deletePerformance(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/performance/${id}`);
  return true;
}

export async function deletePerformances(ids: string[]): Promise<boolean> {
  await Promise.all(ids.map((id) => enhancedApiClient.delete(`/performance/${id}`)));
  return true;
}