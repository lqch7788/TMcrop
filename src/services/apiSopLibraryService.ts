/**
 * v0.3 SOP 库 API 服务
 */
import { enhancedApiClient } from '@/lib/apiClient';

export interface SopStep {
  id?: string;
  stepOrder: number;
  stepTitle: string;
  stepContent?: string;
  stepImages?: string[];
  stepVideoUrl?: string;
  pesticideCode?: string;
  dosage?: string;
  dilutionRatio?: string;
  estimatedMinutes?: number;
  safetyNotes?: string;
}

export interface Sop {
  id: string;
  sopCode: string;
  sopName: string;
  cropCode?: string;
  cropVariety?: string;
  growthStage?: string;
  taskType: string;
  version?: number;
  effectiveDate?: string;
  expiryDate?: string;
  status?: string;
  description?: string;
  warningNotes?: string;
  creatorId?: string;
  creatorName?: string;
  steps?: SopStep[];
}

export interface SopCreateRequest {
  sopCode: string;
  sopName: string;
  cropCode?: string;
  growthStage?: string;
  taskType: string;
  description?: string;
  steps?: SopStep[];
}

export async function listSop(params?: { cropCode?: string; taskType?: string }): Promise<Sop[]> {
  // 注意：enhancedApiClient GET 不支持 params，必须 URLSearchParams 拼 URL
  // 后端 query 参数是 snake_case（crop_code / task_type），不会被 camelCase 中间件转换
  const qs = new URLSearchParams();
  if (params?.cropCode) qs.append('crop_code', params.cropCode);
  if (params?.taskType) qs.append('task_type', params.taskType);
  const url = `/sop${qs.toString() ? `?${qs.toString()}` : ''}`;
  return enhancedApiClient.get<Sop[]>(url);
}

export async function getSop(id: string): Promise<Sop> {
  return enhancedApiClient.get<Sop>(`/sop/${encodeURIComponent(id)}`);
}

export async function createSop(data: SopCreateRequest): Promise<{ id: string; sopCode: string }> {
  return enhancedApiClient.post<{ id: string; sopCode: string }>('/sop', data);
}

export async function updateSop(id: string, data: Partial<Sop>): Promise<void> {
  await enhancedApiClient.put<void>(`/sop/${encodeURIComponent(id)}`, data);
}

export async function deleteSop(id: string): Promise<void> {
  await enhancedApiClient.delete<void>(`/sop/${encodeURIComponent(id)}`);
}

export async function recommendSop(cropCode: string, taskType?: string): Promise<Sop[]> {
  const qs = new URLSearchParams();
  qs.append('crop_code', cropCode);
  if (taskType) qs.append('task_type', taskType);
  return enhancedApiClient.get<Sop[]>(`/sop/recommend/list?${qs.toString()}`);
}
