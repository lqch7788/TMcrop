/**
 * 生产计划批次 API 服务
 * 对接后端 /api/production-plans
 *
 * 数据流：API → enhancedApiClient → 组件
 */

import { enhancedApiClient } from '../lib/apiClient';
import { CropBatch } from '../types/index';

/**
 * 获取所有生产计划批次
 */
export async function getCropBatches(): Promise<CropBatch[]> {
  const response = await enhancedApiClient.get<{ success: boolean; data: CropBatch[] }>('/production-plans');
  if (response.success && response.data) {
    return response.data;
  }
  return [];
}

/**
 * 根据ID获取单个生产计划批次
 */
export async function getCropBatchById(id: string): Promise<CropBatch | undefined> {
  const response = await enhancedApiClient.get<{ success: boolean; data: CropBatch }>(`/production-plans/${id}`);
  if (response.success && response.data) {
    return response.data;
  }
  return undefined;
}

/**
 * 根据批次号获取单个生产计划批次
 */
export async function getCropBatchByCode(batchCode: string): Promise<CropBatch | undefined> {
  const batches = await getCropBatches();
  return batches.find(b => b.batchCode === batchCode);
}

/**
 * 更新生产计划批次
 */
export async function updateCropBatch(id: string, updates: Partial<CropBatch>): Promise<CropBatch | null> {
  const response = await enhancedApiClient.put<{ success: boolean; data: CropBatch }>(`/production-plans/${id}`, updates);
  if (response.success && response.data) {
    return response.data;
  }
  return null;
}

/**
 * 结束生产计划批次（正常结束/异常结束）
 */
export async function endCropBatch(id: string, endType: 'normal' | 'abnormal'): Promise<CropBatch | null> {
  const updates: Partial<CropBatch> = {
    batchStatus: 'completed',
    endType: endType,
  };
  return updateCropBatch(id, updates);
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
export function getCompletionRate(batch: CropBatch, currentQuantity: number): number {
  if (!batch.targetQuantity || batch.targetQuantity === 0) {
    return 0;
  }
  return Math.min(currentQuantity / batch.targetQuantity, 1);
}
