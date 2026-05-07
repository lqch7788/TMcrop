/**
 * 作物实例数据 API 服务
 * 对接后端 /api/crop-instances
 * 核心功能：管理作物实例的全生命周期
 */

import { apiClient, USE_API } from './apiClient';
import { CropInstance, CropInstanceStatus, SourceOrigin, CropTraceChain } from '../types/crop';

// 导入本地服务作为回退
import * as localService from './cropInstanceService';

/**
 * 初始化数据
 */
export async function initInstances(): Promise<CropInstance[]> {
  if (USE_API) {
    return apiClient.get<CropInstance[]>('/crop-instances/init');
  }
  return localService.initInstances();
}

/**
 * 获取所有作物实例
 */
export async function getInstances(): Promise<CropInstance[]> {
  if (USE_API) {
    return apiClient.get<CropInstance[]>('/crop-instances');
  }
  return localService.getInstances();
}

/**
 * 根据ID获取单个作物实例
 */
export async function getInstanceById(id: string): Promise<CropInstance | undefined> {
  if (USE_API) {
    return apiClient.get<CropInstance>(`/crop-instances/${id}`);
  }
  return localService.getInstanceById(id);
}

/**
 * 根据ID数组获取多个作物实例
 */
export async function getInstancesByIds(ids: string[]): Promise<CropInstance[]> {
  if (USE_API) {
    return apiClient.get<CropInstance[]>(`/crop-instances/batch?ids=${ids.join(',')}`);
  }
  return localService.getInstancesByIds(ids);
}

/**
 * 根据订单ID获取关联的作物实例
 */
export async function getInstancesByOrderId(orderId: string): Promise<CropInstance[]> {
  if (USE_API) {
    return apiClient.get<CropInstance[]>(`/crop-instances/order/${orderId}`);
  }
  return localService.getInstancesByOrderId(orderId);
}

/**
 * 创建作物实例
 */
export async function createInstance(
  cropInfo: {
    cropCategory: string;
    cropName: string;
    cropVariety: string;
  },
  sourceOrigin: SourceOrigin,
  initialQuantity: number,
  options?: {
    orderId?: string;
    orderCode?: string;
    sourceDescription?: string;
    sourceInstanceId?: string;
  }
): Promise<CropInstance> {
  if (USE_API) {
    return apiClient.post<CropInstance>('/crop-instances', {
      cropInfo,
      sourceOrigin,
      initialQuantity,
      options
    });
  }
  return localService.createInstance(cropInfo, sourceOrigin, initialQuantity, options);
}

/**
 * 更新作物实例
 */
export async function updateInstance(id: string, updates: Partial<CropInstance>): Promise<CropInstance | null> {
  if (USE_API) {
    const result = await apiClient.put<{ id: string }>(`/crop-instances/${id}`, updates);
    return result ? { ...updates, id } as CropInstance : null;
  }
  return localService.updateInstance(id, updates);
}

/**
 * 删除作物实例
 */
export async function deleteInstance(id: string): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-instances/${id}`);
    return true;
  }
  return localService.deleteInstance(id);
}

/**
 * 批量删除作物实例
 */
export async function deleteInstances(ids: string[]): Promise<boolean> {
  if (USE_API) {
    await apiClient.delete(`/crop-instances/batch?ids=${ids.join(',')}`);
    return true;
  }
  return localService.deleteInstances(ids);
}

/**
 * 更新实例数量
 * @param id 实例ID
 * @param type 操作类型：seedling-育苗，plant-定植，harvest-采收
 * @param quantity 数量变化
 */
export async function updateQuantity(id: string, type: 'seedling' | 'plant' | 'harvest', quantity: number): Promise<boolean> {
  if (USE_API) {
    await apiClient.post(`/crop-instances/${id}/update-quantity`, { type, quantity });
    return true;
  }
  return localService.updateQuantity(id, type, quantity);
}

/**
 * 更新实例状态
 */
export async function updateStatus(id: string, status: CropInstanceStatus): Promise<boolean> {
  if (USE_API) {
    await apiClient.put(`/crop-instances/${id}/status`, { status });
    return true;
  }
  return localService.updateStatus(id, status);
}

/**
 * 获取实例的完整溯源链
 */
export async function getTraceChain(id: string): Promise<CropTraceChain | null> {
  if (USE_API) {
    return apiClient.get<CropTraceChain>(`/crop-instances/${id}/trace-chain`);
  }
  return localService.getTraceChain(id);
}

/**
 * 重置数据到默认状态
 */
export async function resetInstances(): Promise<void> {
  if (USE_API) {
    await apiClient.post('/crop-instances/reset');
  }
  return localService.resetInstances();
}
