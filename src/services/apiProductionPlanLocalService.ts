/**
 * 生产计划数据 API 服务
 * 对接后端 /api/production-plans
 * API失败时降级到 localStorage (productionPlanLocalService)
 */

import { apiClient } from './apiClient';
import { ProductionPlan } from './productionPlanLocalService';
import * as productionPlanLocalService from './productionPlanLocalService';

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

// ==================== API 函数（降级到localStorage）====================

export async function getProductionPlans(): Promise<ProductionPlan[]> {
  try {
    const data = await apiClient.get<BackendProductionPlan[]>('/production-plans');
    return transformProductionPlan(data) as ProductionPlan[];
  } catch (error) {
    console.warn('[生产计划API] 获取失败，降级到localStorage:', error);
    return productionPlanLocalService.getProductionPlans();
  }
}

export async function getProductionPlanById(id: string): Promise<ProductionPlan | undefined> {
  try {
    const data = await apiClient.get<BackendProductionPlan>(`/production-plans/${id}`);
    return transformProductionPlan(data) as ProductionPlan;
  } catch (error) {
    console.warn('[生产计划API] 获取单个失败，降级到localStorage:', error);
    return productionPlanLocalService.getProductionPlanById(id);
  }
}

export async function getProductionPlanByCode(batchCode: string): Promise<ProductionPlan | undefined> {
  try {
    const data = await apiClient.get<BackendProductionPlan>(`/production-plans/code/${batchCode}`);
    return transformProductionPlan(data) as ProductionPlan;
  } catch (error) {
    console.warn('[生产计划API] 获取单个失败，降级到localStorage:', error);
    return productionPlanLocalService.getProductionPlanByCode(batchCode);
  }
}

export async function addProductionPlan(plan: Omit<ProductionPlan, 'id'>): Promise<ProductionPlan> {
  try {
    const result = await apiClient.post<{ id: string }>('/production-plans', plan);
    return { ...plan, id: result.id } as ProductionPlan;
  } catch (error) {
    console.warn('[生产计划API] 创建失败，降级到localStorage:', error);
    return productionPlanLocalService.addProductionPlan(plan);
  }
}

export async function updateProductionPlan(id: string, updates: Partial<ProductionPlan>): Promise<ProductionPlan | null> {
  try {
    const result = await apiClient.put<{ id: string }>(`/production-plans/${id}`, updates);
    return result ? { ...updates, id } as ProductionPlan : null;
  } catch (error) {
    console.warn('[生产计划API] 更新失败，降级到localStorage:', error);
    return productionPlanLocalService.updateProductionPlan(id, updates);
  }
}

export async function deleteProductionPlan(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/production-plans/${id}`);
    return true;
  } catch (error) {
    console.warn('[生产计划API] 删除失败，降级到localStorage:', error);
    return productionPlanLocalService.deleteProductionPlan(id);
  }
}

export async function deleteProductionPlans(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete(`/production-plans/batch?ids=${ids.join(',')}`);
    return true;
  } catch (error) {
    console.warn('[生产计划API] 批量删除失败，降级到localStorage:', error);
    return productionPlanLocalService.deleteProductionPlans(ids);
  }
}

export async function resetProductionPlans(): Promise<void> {
  try {
    await apiClient.post('/production-plans/reset');
  } catch (error) {
    console.warn('[生产计划API] 重置失败，降级到localStorage:', error);
  }
  productionPlanLocalService.resetProductionPlans();
}
