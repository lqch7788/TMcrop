/**
 * 指标数据 API 服务
 * 对接后端 /api/indicators
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import type { Indicator } from '../pages/types/indicators.types';

/**
 * 获取所有指标
 * 降级策略：API → IndexedDB 缓存
 */
export async function getIndicators(): Promise<Indicator[]> {
  return await enhancedApiClient.get<Indicator[]>('/indicators', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 根据ID获取单个指标
 * 降级策略：API → IndexedDB 缓存
 */
export async function getIndicatorById(id: string): Promise<Indicator | undefined> {
  return await enhancedApiClient.get<Indicator>(`/indicators/${id}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
}

/**
 * 根据ID数组获取多个指标
 * 降级策略：API → IndexedDB 缓存
 */
export async function getIndicatorsByIds(ids: string[]): Promise<Indicator[]> {
  const allIndicators = await getIndicators();
  return allIndicators.filter(indicator => ids.includes(indicator.id));
}

/**
 * 创建指标
 * 降级策略：API → 离线队列
 */
export async function createIndicator(
  indicatorData: Omit<Indicator, 'id' | 'code'>
): Promise<Indicator> {
  return await enhancedApiClient.post<Indicator>('/indicators', indicatorData, {
    offlineQueue: true,
    useCache: true,
  });
}

/**
 * 更新指标
 * 降级策略：API → 离线队列
 */
export async function updateIndicator(id: string, updates: Partial<Indicator>): Promise<Indicator | null> {
  const result = await enhancedApiClient.put<Indicator>(`/indicators/${id}`, updates, {
    offlineQueue: true,
  });
  return result;
}

/**
 * 删除指标
 * 降级策略：API → 离线队列
 */
export async function deleteIndicator(id: string): Promise<boolean> {
  await enhancedApiClient.delete(`/indicators/${id}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 批量删除指标
 * 降级策略：API → 离线队列
 */
export async function deleteIndicators(ids: string[]): Promise<boolean> {
  await enhancedApiClient.delete(`/indicators/batch?ids=${ids.join(',')}`, {
    offlineQueue: true,
  });
  return true;
}

/**
 * 重置指标数据
 * 降级策略：API → 离线队列
 */
export async function resetIndicators(): Promise<void> {
  await enhancedApiClient.post('/indicators/reset', undefined, {
    offlineQueue: true,
  });
}
