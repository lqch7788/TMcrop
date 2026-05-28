/**
 * 生产计划 API 服务
 * 对接后端 /api/production-plans
 *
 * 核心原则：服务器数据是唯一真相来源
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropBatch } from '../types';

/**
 * 获取所有生产计划
 */
export async function getProductionPlans(filters?: {
  status?: string;
  planType?: string;
  keyword?: string;
  page?: number;
  limit?: number;
}): Promise<CropBatch[]> {
  const params = new URLSearchParams();
  if (filters?.status) params.append('status', filters.status);
  if (filters?.planType) params.append('plan_type', filters.planType);
  if (filters?.keyword) params.append('keyword', filters.keyword);
  if (filters?.page) params.append('page', String(filters.page));
  if (filters?.limit) params.append('limit', String(filters.limit));

  const url = params.toString() ? `/production-plans?${params.toString()}` : '/production-plans';
  const data = await enhancedApiClient.get<CropBatch[]>(url);
  return Array.isArray(data) ? data : [];
}

/**
 * 根据ID获取单个生产计划
 */
export async function getProductionPlanById(id: string): Promise<CropBatch | undefined> {
  return await enhancedApiClient.get<CropBatch>(`/production-plans/${id}`);
}

/**
 * 创建生产计划
 */
export async function createProductionPlan(
  plan: Omit<CropBatch, 'id'>
): Promise<CropBatch> {
  return await enhancedApiClient.post<CropBatch>('/production-plans', plan);
}

/**
 * 更新生产计划
 */
export async function updateProductionPlan(
  id: string,
  updates: Partial<CropBatch>
): Promise<CropBatch | null> {
  return await enhancedApiClient.put<CropBatch>(`/production-plans/${id}`, updates);
}

/**
 * 删除生产计划
 */
export async function deleteProductionPlan(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/production-plans/${id}`);
  return true;
}

/**
 * 批量删除生产计划
 */
export async function deleteProductionPlans(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/production-plans/batch?ids=${ids.join(',')}`);
  return true;
}
