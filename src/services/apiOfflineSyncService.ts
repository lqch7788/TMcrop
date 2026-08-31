/**
 * v0.3 P0-3：离线队列同步 API 服务
 *
 * 路径：
 *   POST /api/offline-sync          - 批量同步
 *   GET  /api/offline-sync/stats    - 统计
 *
 * V0.3 设计：
 *   - 移动端 IndexedDB 队列（已在 src/hooks/useOfflineQueue.ts 占位）
 *   - 联网时自动调用本服务批量同步
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface OfflineItem {
  clientId: string;
  payload: Record<string, unknown>;
  clientCreatedAt: string;
}

export interface SyncResultItem {
  clientId: string;
  status: 'created' | 'duplicate' | 'updated' | 'failed';
  serverRecordId?: string;
  error?: string;
}

export interface SyncResponse {
  results: SyncResultItem[];
  totalProcessed: number;
  totalCreated: number;
  totalDuplicate: number;
  totalFailed: number;
}

export interface OfflineStats {
  totalPending: number;
  totalSynced: number;
  totalFailed: number;
  total: number;
}

/**
 * 批量同步离线队列
 */
export async function syncOfflineQueue(items: OfflineItem[]): Promise<SyncResponse> {
  return enhancedApiClient.post<SyncResponse>('/offline-sync', { items });
}

/**
 * 获取离线队列统计
 */
export async function getOfflineStats(): Promise<OfflineStats> {
  return enhancedApiClient.get<OfflineStats>('/offline-sync/stats');
}
