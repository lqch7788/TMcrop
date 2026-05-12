/**
 * 生产计划批次 API 服务
 * 对接后端 /api/production-plans
 *
 * 数据流：API → enhancedApiClient (IndexedDB 缓存) → 组件
 *
 * 降级策略：
 * - GET 请求：API → IndexedDB 缓存（API 失败时自动降级）
 * - POST/PUT/DELETE：API → 离线队列（网络断开时加入队列，联网后自动同步）
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropBatch } from '../types/index';
import * as cropBatchService from './cropBatchService';

/**
 * 获取所有生产计划批次
 * 降级策略：API → IndexedDB 缓存
 */
export async function getCropBatches(): Promise<CropBatch[]> {
  const response = await enhancedApiClient.get<{ success: boolean; data: CropBatch[] }>('/production-plans', {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  if (response.success && response.data) {
    return response.data;
  }
  return [];
}

/**
 * 根据ID获取单个生产计划批次
 * 降级策略：API → IndexedDB 缓存
 */
export async function getCropBatchById(id: string): Promise<CropBatch | undefined> {
  const response = await enhancedApiClient.get<{ success: boolean; data: CropBatch }>(`/production-plans/${id}`, {
    useCache: true,
    cacheStrategy: 'network-first',
  });
  if (response.success && response.data) {
    return response.data;
  }
  return undefined;
}

/**
 * 根据批次号获取单个生产计划批次
 */
export async function getCropBatchByCode(batchCode: string): Promise<CropBatch | undefined> {
  // 后端没有按 batchCode 查询的接口，先获取所有再过滤
  const batches = await getCropBatches();
  return batches.find(b => b.batchCode === batchCode);
}

/**
 * 更新生产计划批次
 * 降级策略：API → 离线队列
 */
export async function updateCropBatch(id: string, updates: Partial<CropBatch>): Promise<CropBatch | null> {
  const response = await enhancedApiClient.put<{ success: boolean; message?: string }>(`/production-plans/${id}`, updates, {
    offlineQueue: true,
  });
  if (response.success) {
    // 同步更新本地缓存
    cropBatchService.updateCropBatch(id, updates);
    return cropBatchService.getCropBatchById(id) || null;
  }
  return null;
}

/**
 * 结束生产计划批次（正常结束/异常结束）
 * 降级策略：API → 离线队列
 */
export async function endCropBatch(id: string, endType: 'normal' | 'abnormal'): Promise<CropBatch | null> {
  // 构建更新数据
  const updates: Partial<CropBatch> = {
    batchStatus: 'completed',
    endType: endType,
  };

  const response = await enhancedApiClient.put<{ success: boolean; message?: string }>(`/production-plans/${id}`, updates, {
    offlineQueue: true,
  });
  if (response.success) {
    // 同步更新本地缓存
    cropBatchService.updateCropBatch(id, updates);
    return cropBatchService.getCropBatchById(id) || null;
  }
  return null;
}

/**
 * 检查生产计划是否可以进行入库操作
 */
export async function canInbound(id: string): Promise<{ allowed: boolean; reason?: string }> {
  const batch = await getCropBatchById(id);
  if (!batch) {
    return { allowed: false, reason: '生产计划不存在' };
  }

  if (batch.batchStatus === 'completed') {
    if (batch.endType === 'normal') {
      return { allowed: false, reason: '该计划已正常结束，禁止入库和补录' };
    } else if (batch.endType === 'abnormal') {
      return { allowed: true, reason: '该计划已异常结束，可以补录入库（需审核）' };
    }
  }

  return { allowed: true };
}

/**
 * 获取计划完成比例
 */
export async function getCompletionRate(batch: CropBatch, currentQuantity: number): Promise<number> {
  return cropBatchService.getCompletionRate(batch, currentQuantity);
}
