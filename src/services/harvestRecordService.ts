/**
 * 采收记录只读 Service
 *
 * 2026-06-29 Phase 1 拆分：从 apiHarvestService 抽出只读接口
 * 供以下模块使用，不再依赖完整的 useHarvestStore：
 * - useProductionChainStats：生产链产量统计
 * - productionPlanService：生产计划关联查询
 * - useApprovalBusinessDetail：审批详情展示
 *
 * 注意：本服务调用后端 /api/harvest 路由，Phase 3 将迁移到 inventory 接口
 */

import { enhancedApiClient } from '../lib/apiClient';
import { HarvestRecord } from '../types/index';

/**
 * 获取所有采收记录（供生产链统计/生产计划关联查询）
 */
export async function listHarvestRecords(): Promise<HarvestRecord[]> {
  return await enhancedApiClient.get<HarvestRecord[]>('/harvest');
}

/**
 * 根据 ID 获取单条采收记录（供审批详情展示）
 */
export async function getHarvestRecordById(id: string): Promise<HarvestRecord | undefined> {
  if (!id || id === 'undefined' || id === 'null' || String(id).trim() === '') {
    console.warn('[harvestRecordService] getHarvestRecordById 收到空 id，已跳过');
    return undefined;
  }
  return await enhancedApiClient.get<HarvestRecord>(`/harvest/${id}`);
}
