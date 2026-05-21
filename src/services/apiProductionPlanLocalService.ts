/**
 * 生产计划数据 API 服务
 * 对接后端 /api/production-plans
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { ProductionPlan } from './productionPlanLocalService';

// 后端返回的数据字段类型
interface BackendProductionPlan {
  id: string;
  batchCode: string;
  batchName: string;
  planType: string;
  cropName: string;
  variety: string;
  greenhouseName: string;
  areaName: string;
  targetQuantity: number;
  actualYield: number;
  startDate: string;
  expectedHarvestDate: string;
  actualHarvestDate: string;
  status: string;
  priority: string;
  remarks: string;
  publisher: string;
  createTime: string;
  updateTime: string;
  responsiblePerson: string;
  unit: string;
  publishDate: string;
  batchStatus: string;
  planDetail: string;
  planDetailFileName: string;
  plantingArea: number;
  plantingMode: string;
  supplierName: string;
  seedlingSiteName: string;
  seedQuantity: number;
  targetSeedlingCount: number;
  [key: string]: unknown;
}

/**
 * 将后端返回的数据转换为前端格式
 */
function transformProductionPlan(data: BackendProductionPlan | BackendProductionPlan[]): ProductionPlan | ProductionPlan[] {
  if (Array.isArray(data)) {
    return data.map(item => transformSingle(item));
  }
  return transformSingle(data);
}

function transformSingle(item: BackendProductionPlan): ProductionPlan {
  return {
    id: item.id,
    batchCode: item.batchCode || '',
    batchName: item.batchName || '',
    planType: item.planType || '',
    cropName: item.cropName || '',
    variety: item.variety || '',
    greenhouseName: item.greenhouseName || '',
    areaName: item.areaName || '',
    targetQuantity: item.targetQuantity || 0,
    actualYield: item.actualYield || 0,
    startDate: item.startDate ? item.startDate.split('T')[0] : '',
    expectedHarvestDate: item.expectedHarvestDate ? item.expectedHarvestDate.split('T')[0] : '',
    actualHarvestDate: item.actualHarvestDate ? item.actualHarvestDate.split('T')[0] : '',
    status: item.status || 'planning',
    priority: item.priority || 'normal',
    remarks: item.remarks || '',
    publisher: item.publisher || '',
    createTime: item.createTime || '',
    updateTime: item.updateTime || '',
    responsiblePerson: item.responsiblePerson || '',
    unit: item.unit || '',
    publishDate: item.publishDate ? item.publishDate.split('T')[0] : '',
    batchStatus: item.batchStatus || 'draft',
    planDetail: item.planDetail || '',
    planDetailFileName: item.planDetailFileName || '',
    plantingArea: item.plantingArea || 0,
    plantingMode: item.plantingMode || '',
    supplierName: item.supplierName || '',
    seedlingSiteName: item.seedlingSiteName || '',
    seedQuantity: item.seedQuantity || 0,
    targetSeedlingCount: item.targetSeedlingCount || 0,
  };
}

/**
 * 获取所有生产计划
 * 降级策略：API → IndexedDB 缓存
 */
export async function getProductionPlans(): Promise<ProductionPlan[]> {
  const data = await enhancedApiClient.get<BackendProductionPlan[]>('/production-plans');
  return transformProductionPlan(data) as ProductionPlan[];
}

/**
 * 根据ID获取单个生产计划
 * 降级策略：API → IndexedDB 缓存
 */
export async function getProductionPlanById(id: string): Promise<ProductionPlan | undefined> {
  const data = await enhancedApiClient.get<BackendProductionPlan>(`/production-plans/${id}`);
  return transformProductionPlan(data) as ProductionPlan;
}

/**
 * 根据批次编号获取生产计划
 * 降级策略：API → IndexedDB 缓存
 */
export async function getProductionPlanByCode(batchCode: string): Promise<ProductionPlan | undefined> {
  const data = await enhancedApiClient.get<BackendProductionPlan>(`/production-plans/code/${batchCode}`);
  return transformProductionPlan(data) as ProductionPlan;
}

/**
 * 创建生产计划
 * 降级策略：API → 离线队列
 */
export async function addProductionPlan(plan: Omit<ProductionPlan, 'id'>): Promise<ProductionPlan> {
  const result = await enhancedApiClient.post<ProductionPlan>('/production-plans', plan);
  // POST 响应现在返回经过 mapFieldsToFrontend 的完整数据
  return transformProductionPlan(result) as ProductionPlan;
}

/**
 * 更新生产计划
 * 降级策略：API → 离线队列
 */
export async function updateProductionPlan(id: string, updates: Partial<ProductionPlan>): Promise<ProductionPlan | null> {
  const result = await enhancedApiClient.put<{ data: ProductionPlan }>(`/production-plans/${id}`, updates);
  // PUT 响应现在返回经过 mapFieldsToFrontend 的完整更新数据
  return result?.data ? transformProductionPlan(result.data) as ProductionPlan : null;
}

/**
 * 删除生产计划
 * 降级策略：API → 离线队列
 */
export async function deleteProductionPlan(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/production-plans/${id}`);
  return true;
}

/**
 * 批量删除生产计划
 * 降级策略：API → 离线队列
 */
export async function deleteProductionPlans(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/production-plans/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 重置生产计划（仅调用后端，不做降级）
 */
export async function resetProductionPlans(): Promise<void> {
  await enhancedApiClient.post('/production-plans/reset');
}
