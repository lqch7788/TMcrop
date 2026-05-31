/**
 * 生产计划 API 服务
 * 对接后端 /api/production-plans
 *
 * 核心原则：服务器数据是唯一真相来源
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropBatch } from '../types';

/**
 * 标准化 API 返回数据到 CropBatch 接口
 * 处理后端字段名与前端接口名不一致的问题
 */
function normalizeBatch(raw: Record<string, unknown>): CropBatch {
  return {
    id: raw.id as string,
    batchCode: raw.batchCode as string,
    cropName: (raw.cropName as string) || '',
    cropType: (raw.cropType as string) || '',
    variety: (raw.variety as string) || '',
    greenhouseId: (raw.greenhouseId as string) || (raw.greenhouseName as string) || '',
    greenhouseName: (raw.greenhouseName as string) || '',
    plantingArea: (raw.plantingArea as number) || 0,
    plantingAreaUnit: raw.plantingAreaUnit as string | undefined,
    stage: (raw.stage as CropBatch['stage']) || 'seedling',
    stageName: (raw.stageName as string) || '',
    startDate: (raw.startDate as string) || '',
    expectedHarvestDate: (raw.expectedHarvestDate as string) || '',
    // API 返回 targetQuantity，映射到 targetYield
    targetYield: (raw.targetQuantity as number) || (raw.targetYield as number) || 0,
    actualYield: (raw.actualYield as number) || 0,
    // API 返回 status，前端用 batchStatus
    batchStatus: (raw.status as CropBatch['batchStatus']) || (raw.batchStatus as CropBatch['batchStatus']) || 'draft',
    plantingMode: (raw.plantingMode as string) || '',
    responsiblePerson: (raw.responsiblePerson as string) || '',
    publisher: raw.publisher as string | undefined,
    publishDate: raw.publishDate as string | undefined,
    lastModifyDate: raw.lastModifyDate as string | undefined,
    planDetailFileName: raw.planDetailFileName as string | undefined,
    planDetail: raw.planDetail as string | undefined,
    planType: raw.planType as CropBatch['planType'],
    planTypeName: raw.planTypeName as string | undefined,
    locationName: raw.locationName as string | undefined,
    targetQuantity: raw.targetQuantity as number | undefined,
    unit: raw.unit as string | undefined,
    supplierName: raw.supplierName as string | undefined,
    seedQuantity: raw.seedQuantity as number | undefined,
    seedlingSiteName: raw.seedlingSiteName as string | undefined,
    targetSeedlingCount: raw.targetSeedlingCount as number | undefined,
    orderId: raw.orderId as string | undefined,
    orderCode: raw.orderCode as string | undefined,
    remarks: raw.remarks as string | undefined,
    areaName: raw.areaName as string | undefined,
  };
}

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
  const data = await enhancedApiClient.get<Record<string, unknown>[]>(url);
  if (!Array.isArray(data)) return [];
  return data.map(normalizeBatch);
}

/**
 * 根据ID获取单个生产计划
 */
export async function getProductionPlanById(id: string): Promise<CropBatch | undefined> {
  const data = await enhancedApiClient.get<Record<string, unknown>>(`/production-plans/${id}`);
  if (!data) return undefined;
  return normalizeBatch(data);
}

/**
 * 创建生产计划
 */
export async function createProductionPlan(
  plan: Omit<CropBatch, 'id'>
): Promise<CropBatch> {
  const data = await enhancedApiClient.post<Record<string, unknown>>('/production-plans', plan);
  return normalizeBatch(data);
}

/**
 * 更新生产计划
 */
export async function updateProductionPlan(
  id: string,
  updates: Partial<CropBatch>
): Promise<CropBatch | null> {
  const data = await enhancedApiClient.put<Record<string, unknown>>(`/production-plans/${id}`, updates);
  if (!data) return null;
  return normalizeBatch(data);
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
