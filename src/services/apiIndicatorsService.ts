/**
 * 指标数据 API 服务
 * 对接后端 /api/indicators
 */

import { apiClient } from './apiClient';
import type { Indicator } from '../pages/types/indicators.types';

// 导入本地服务作为回退
import * as localService from './indicatorsService';

/**
 * 获取所有指标
 */
export async function getIndicators(): Promise<Indicator[]> {
  try {
    const response = await apiClient.get<{ data: Indicator[] }>('/indicators');
    const data = response.data || [];
    // 如果 API 返回空数据，检查 localStorage 是否有数据
    if (data.length === 0) {
      const localData = localService.getIndicators();
      if (localData.length > 0) {
        console.warn('API 返回空数据，降级到 localStorage:', localData.length, '条');
        return localData;
      }
    }
    return data;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getIndicators();
  }
}

/**
 * 根据ID获取单个指标
 */
export async function getIndicatorById(id: string): Promise<Indicator | undefined> {
  try {
    const response = await apiClient.get<{ data: Indicator }>(`/indicators/${id}`);
    return response.data;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getIndicatorById(id);
  }
}

/**
 * 根据ID数组获取多个指标
 */
export async function getIndicatorsByIds(ids: string[]): Promise<Indicator[]> {
  try {
    // API 不支持批量查询，降级到 localStorage
    return localService.getIndicatorsByIds(ids);
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.getIndicatorsByIds(ids);
  }
}

/**
 * 创建指标
 */
export async function createIndicator(
  indicatorData: Omit<Indicator, 'id' | 'code'>
): Promise<Indicator> {
  try {
    const response = await apiClient.post<{ id: string; code: string }>('/indicators', indicatorData);
    return {
      ...indicatorData,
      id: response.id,
      code: response.code,
    } as Indicator;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.createIndicator(indicatorData);
  }
}

/**
 * 更新指标
 */
export async function updateIndicator(id: string, updates: Partial<Indicator>): Promise<Indicator | null> {
  try {
    await apiClient.put(`/indicators/${id}`, updates);
    return { ...updates, id } as Indicator;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.updateIndicator(id, updates);
  }
}

/**
 * 删除指标
 */
export async function deleteIndicator(id: string): Promise<boolean> {
  try {
    await apiClient.delete(`/indicators/${id}`);
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteIndicator(id);
  }
}

/**
 * 批量删除指标
 */
export async function deleteIndicators(ids: string[]): Promise<boolean> {
  try {
    await apiClient.delete('/indicators/batch', { ids });
    return true;
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    return localService.deleteIndicators(ids);
  }
}

/**
 * 重置指标数据
 */
export async function resetIndicators(): Promise<void> {
  try {
    await apiClient.post('/indicators/reset');
  } catch (error) {
    console.warn('API 调用失败，降级到 localStorage:', error);
    localService.resetIndicators();
  }
}
