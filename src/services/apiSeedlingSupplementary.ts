/**
 * 育苗补录申请单 Service（2026-10-09）
 *
 * HarvestRecordModal 的 planting_self_kept 模式走这个端点
 * 审批通过后由 approvalLinkage case 'seedling' 真正回流到 seed_sources
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface SeedlingSupplementaryPayload {
  // 来源（种植行）
  sourceId: string;
  sourceModule?: string;
  sourceCode?: string;
  // 作物
  cropId?: string;
  cropCode?: string;
  cropName: string;
  varietyName?: string;
  // 形态 + 合并键
  seedForm: string;
  generation?: string;
  forceNew?: number;
  // 数量
  quantity: number;
  unit: string;
  // 业务字段
  supplementaryReason: string;
  notes?: string;
  // 申请人
  applicantId?: string;
  applicantName: string;
  applicantDepartment?: string;
  operatorName?: string;
}

export async function submitSeedlingSupplementaryApplication(
  payload: SeedlingSupplementaryPayload,
): Promise<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }> {
  return await enhancedApiClient.post<{ id: string; applicationCode: string; approvalId: string; approvalCode: string; status: string }>(
    '/seedling-supplementary-applications',
    payload,
  );
}