/**
 * 生产计划 API 服务
 * 对接后端 /api/production-plans
 *
 * 核心原则：服务器数据是唯一真相来源
 *
 * 数据流：API → enhancedApiClient（无缓存，仅 3 次重试）→ 组件
 *
 * 缓存策略（已确认无三级缓存）：
 * - L1：Zustand Store 内存数组
 * - L2：（未使用）无 API
 * - L3：（未使用）生产计划页面不读取 localStorage
 *
 * 网络策略：失败时 3 次指数退避重试，无离线队列
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { CropBatch } from '../types';

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
    // 2026-06-05: 读 cropCode（修复弹窗作物品种显示空）
    cropCode: raw.cropCode as string | undefined,
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
    // P0-01: 修复分支顺序 — batchStatus 优先于 status
    // API 返回 status，前端用 batchStatus；batchStatus 字段存在时优先
    batchStatus: (raw.batchStatus as CropBatch['batchStatus']) || (raw.status as CropBatch['batchStatus']) || 'draft',
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
    executionStatus: raw.executionStatus as CropBatch['executionStatus'],
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
  // 2026-06-05: 修复申请作废/编辑保存失败 — 之前直接 PUT 用 camelCase（如 batchStatus）
  //   后端 route 用 Object.keys 拼 SQL，找不到 batchStatus 列（DB 列叫 batch_status）→ 500
  //   改用映射转换，与 apiSeedSourceService.updateSeedSource 风格一致
  // M-01: 明确类型（不允许 any）；batchStatus 单独处理后其它字段以 string|number|null 透传
  const backendUpdates: Record<string, string | number | null> = { ...(updates as Record<string, string | number | null>) };
  if (updates.batchStatus !== undefined) {
    backendUpdates.batch_status = updates.batchStatus as string;
    delete (backendUpdates as Record<string, unknown>).batchStatus;
  }
  const data = await enhancedApiClient.put<Record<string, unknown>>(`/production-plans/${id}`, backendUpdates);
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
 * H-03: 调用后端生成生产计划编码（避免前端 batches.length+1 重复）
 * 后端按日期+随机生成唯一编码
 */
export async function generateProductionPlanCode(planType?: string): Promise<string> {
  const data = await enhancedApiClient.get<{ code: string }>(
    `/production-plans/generate-code${planType ? `?planType=${encodeURIComponent(planType)}` : ''}`
  );
  return (data && (data as { code?: string }).code) || '';
}

/**
 * 批量删除生产计划
 * L-01: 改用 POST + body 传 ids（避免 query string 长度限制 / URL 编码问题）
 */
export async function deleteProductionPlans(ids: string[]): Promise<boolean> {
  await enhancedApiClient.post('/production-plans/batch/delete', { ids });
  return true;
}
