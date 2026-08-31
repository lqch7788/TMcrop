/**
 * v0.3 批次成本 API 服务
 * 注意：后端 camelCase 中间件会把 snake_case 转 camelCase，字段名都是 camelCase
 */
import { enhancedApiClient } from '@/lib/apiClient';

export interface BatchCost {
  batchCode: string;
  cropName?: string;
  cropVariety?: string;
  greenhouseName?: string;
  plantingQuantity?: number;
  expectedHarvestDate?: string;
  laborCost?: number;
  outsourceCost?: number;
  totalCost?: number;
  costPerUnit?: number;
  equipmentDepreciationCost?: number;
  operationCount?: number;
  taskCount?: number;
}

export interface CropCostSummary {
  cropName: string;
  batchCount: number;
  totalCost: number;
  avgCostPerUnit: number;
  totalOperations: number;
  totalTasks: number;
}

export async function getBatchCost(batchCode: string): Promise<BatchCost> {
  return enhancedApiClient.get<BatchCost>(`/batch-cost/${encodeURIComponent(batchCode)}`);
}

export async function listBatchCosts(params?: {
  cropName?: string;
  greenhouseName?: string;
  minTotalCost?: number;
  limit?: number;
}): Promise<BatchCost[]> {
  // 后端 query 参数是 snake_case
  const qs = new URLSearchParams();
  if (params?.cropName) qs.append('crop_name', params.cropName);
  if (params?.greenhouseName) qs.append('greenhouse_name', params.greenhouseName);
  if (params?.minTotalCost !== undefined) qs.append('min_total_cost', String(params.minTotalCost));
  if (params?.limit) qs.append('limit', String(params.limit));
  const url = `/batch-cost${qs.toString() ? `?${qs.toString()}` : ''}`;
  return enhancedApiClient.get<BatchCost[]>(url);
}

export async function getCropCostSummary(): Promise<CropCostSummary[]> {
  return enhancedApiClient.get<CropCostSummary[]>('/batch-cost/summary/crop');
}
