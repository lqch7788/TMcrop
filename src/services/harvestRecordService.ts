/**
 * 采收记录只读 Service
 *
 * 2026-06-29 Phase 1 拆分：从 apiHarvestService 抽出只读接口
 * 供以下模块使用，不再依赖完整的 useHarvestStore：
 * - useProductionChainStats：生产链产量统计
 * - productionPlanService：生产计划关联查询
 * - useApprovalBusinessDetail：审批详情展示
 *
 * 2026-07-01：新增 listHarvestRecordsBySource — 给行级采收入库弹窗
 *   UnifiedRowHarvestInboundModal 底部"采收记录"历史表用。
 *   按 (sourceModule, sourceId) 过滤，3 页面（种源/育苗/种植）共用。
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

/**
 * 2026-07-01：按来源模块+来源 ID 过滤采收记录（弹窗历史表用）
 * - 走 GET /api/harvest?sourceModule=xxx&sourceId=xxx
 * - 返回按 create_time DESC 排序
 * - enhancedApiClient.get 不支持 params（只支持 retryCount），必须手动 URLSearchParams 拼 URL
 */
export async function listHarvestRecordsBySource(
  sourceModule: 'seed_source' | 'seedling' | 'planting',
  sourceId: string,
): Promise<HarvestRecord[]> {
  if (!sourceId) return []
  const params = new URLSearchParams()
  params.set('sourceModule', sourceModule)
  params.set('sourceId', sourceId)
  return await enhancedApiClient.get<HarvestRecord[]>(`/harvest?${params.toString()}`)
}

/**
 * 2026-07-01：删除 1 条采收记录（弹窗删除按钮用）
 * - 走 DELETE /api/harvest/:id
 * - 后端级联清理 harvest_records + inventory_inbound_records + inventory_stock + inventory_transaction 4 张表
 */
export async function deleteHarvestRecord(id: string): Promise<void> {
  if (!id) throw new Error('id 必填')
  await enhancedApiClient.delete(`/harvest/${id}`)
}
