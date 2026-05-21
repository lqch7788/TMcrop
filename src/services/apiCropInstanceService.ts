/**
 * 作物实例数据 API 服务
 * 对接后端 /api/crop-instances
 * 核心功能：管理作物实例的全生命周期
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropInstance, CropInstanceStatus, SourceOrigin, CropTraceChain } from '../types/crop';

/**
 * 初始化数据
 * 降级策略：API → IndexedDB 缓存
 */
export async function initInstances(): Promise<CropInstance[]> {
  return await enhancedApiClient.get<CropInstance[]>('/crop-instances/init');
}

/**
 * 获取所有作物实例
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInstances(): Promise<CropInstance[]> {
  return await enhancedApiClient.get<CropInstance[]>('/crop-instances');
}

/**
 * 根据ID获取单个作物实例
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInstanceById(id: string): Promise<CropInstance | undefined> {
  return await enhancedApiClient.get<CropInstance>(`/crop-instances/${id}`);
}

/**
 * 根据ID数组获取多个作物实例
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInstancesByIds(ids: string[]): Promise<CropInstance[]> {
  return await enhancedApiClient.get<CropInstance[]>(`/crop-instances/batch?ids=${ids.join(',')}`);
}

/**
 * 根据订单ID获取关联的作物实例
 * 降级策略：API → IndexedDB 缓存
 */
export async function getInstancesByOrderId(orderId: string): Promise<CropInstance[]> {
  return await enhancedApiClient.get<CropInstance[]>(`/crop-instances/order/${orderId}`);
}

/**
 * 创建作物实例
 * 降级策略：API → 离线队列
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
  return await enhancedApiClient.post<CropInstance>('/crop-instances', {
    cropInfo,
    sourceOrigin,
    initialQuantity,
    options
  });
}

/**
 * 更新作物实例
 * 降级策略：API → 离线队列
 */
export async function updateInstance(id: string, updates: Partial<CropInstance>): Promise<CropInstance | null> {
  const result = await enhancedApiClient.put<{ id: string }>(`/crop-instances/${id}`, updates);
  return result ? { ...updates, id } as CropInstance : null;
}

/**
 * 删除作物实例
 * 降级策略：API → 离线队列
 */
export async function deleteInstance(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/crop-instances/${id}`);
  return true;
}

/**
 * 批量删除作物实例
 * 降级策略：API → 离线队列
 */
export async function deleteInstances(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/crop-instances/batch?ids=${ids.join(',')}`);
  return true;
}

/**
 * 更新实例数量
 * 降级策略：API → 离线队列
 */
export async function updateQuantity(id: string, type: 'seedling' | 'plant' | 'harvest', quantity: number): Promise<boolean> {
  await enhancedApiClient.post(`/crop-instances/${id}/update-quantity`, { type, quantity });
  return true;
}

/**
 * 更新实例状态
 * 降级策略：API → 离线队列
 */
export async function updateStatus(id: string, status: CropInstanceStatus): Promise<boolean> {
  await enhancedApiClient.put(`/crop-instances/${id}/status`, { status });
  return true;
}

/**
 * 获取实例的完整溯源链
 * 降级策略：API → IndexedDB 缓存
 */
export async function getTraceChain(id: string): Promise<CropTraceChain | null> {
  try {
    return await enhancedApiClient.get<CropTraceChain>(`/crop-instances/${id}/trace-chain`);
  } catch {
    return null;
  }
}

/**
 * 重置数据到默认状态（仅调用后端）
 */
export async function resetInstances(): Promise<void> {
  await enhancedApiClient.post('/crop-instances/reset');
}
