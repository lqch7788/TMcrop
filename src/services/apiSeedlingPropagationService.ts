/**
 * 2026-06-25 v3: 育苗繁殖记录子表 Service（1:多 模式）
 * 复用现有 propagation_records 表 / 后端 seedlingPropagationRecords 路由
 * 数据流：V2.1 铁律 — 无缓存降级
 */

import { enhancedApiClient } from '../lib/apiClient';

export type SeedlingStatus = 'healthy' | 'weak' | 'diseased';

export interface PropagationRecord {
  id: string;
  seedlingId: string;
  recordDate: string;
  temperature: number | null;
  humidity: number | null;
  motherPlantCount: number | null;
  seedlingOutput: number | null;
  seedlingStatus: SeedlingStatus | null;
  transplantPosition: string | null;
  operator: string | null;
  remarks: string | null;
  createTime: string;
}

export interface PropagationRecordInput {
  recordDate: string;
  temperature?: number | null;
  humidity?: number | null;
  motherPlantCount?: number | null;
  seedlingOutput?: number | null;
  seedlingStatus?: SeedlingStatus | null;
  transplantPosition?: string | null;
  operator?: string | null;
  remarks?: string | null;
}

export const apiSeedlingPropagationService = {
  async list(seedlingId: string): Promise<PropagationRecord[]> {
    const data = await enhancedApiClient.get<unknown>(
      `/seedlings/${seedlingId}/propagation-records`
    );
    return Array.isArray(data) ? (data as PropagationRecord[]) : [];
  },

  async create(seedlingId: string, input: PropagationRecordInput): Promise<{ id: string }> {
    return await enhancedApiClient.post<{ id: string }>(
      `/seedlings/${seedlingId}/propagation-records`, input
    );
  },

  async update(seedlingId: string, recordId: string, input: Partial<PropagationRecordInput>): Promise<void> {
    await enhancedApiClient.put<void>(
      `/seedlings/${seedlingId}/propagation-records/${recordId}`, input
    );
  },

  async delete(seedlingId: string, recordId: string): Promise<void> {
    await enhancedApiClient.delete<void>(
      `/seedlings/${seedlingId}/propagation-records/${recordId}`
    );
  },
};

export default apiSeedlingPropagationService;
