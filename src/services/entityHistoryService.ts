/**
 * 实体历史服务（2026-06-27）
 * 前端服务层 — 调后端 /history 端点 + 合并 material_flow_log
 */

import { enhancedApiClient } from '@/lib/apiClient';

export interface HistoryItem {
  id: string;
  occurredAt: string;
  source: 'entity' | 'flow';
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation' | 'flow';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
  cropName?: string;
  raw?: Record<string, unknown>;
}

/** 后端实体历史数据 */
interface EntityHistoryRow {
  id: string;
  occurredAt: string;
  source: 'entity';
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
  cropName?: string;
}

/** material_flow_log 流转数据 */
interface FlowLogRow {
  id: string;
  flowType: string;
  cropName?: string;
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  targetCode?: string;
  targetQuantity?: number;
  targetUnit?: string;
  createdAt: string;
  createdBy?: string;
}

/**
 * 查询实体历史（调 /api/{entity}/:id/history）
 */
async function fetchEntityHistory(entity: string, entityId: string): Promise<HistoryItem[]> {
  const res = await enhancedApiClient.get<{ success: boolean; data: EntityHistoryRow[] }>(
    `/${entity}/${entityId}/history`
  );
  const data = Array.isArray(res) ? res : (res as Record<string, unknown>)?.data as EntityHistoryRow[] || [];
  return data.map((r: EntityHistoryRow) => ({
    ...r,
    source: 'entity' as const,
  }));
}

/** material_flow_log flowType → 中文 */
const FLOW_TYPE_CN: Record<string, string> = {
  'seed_source→seedling': '种源 → 育苗',
  'seed_source→planting': '种源 → 种植',
  'seedling→planting': '育苗 → 种植',
  'planting→harvest': '种植 → 采收',
  'seedling→harvest': '育苗 → 采收',
  'external→seedling': '外部种源 → 育苗',
  'external→planting': '外部 → 种植',
  'inventory→external': '库存 → 出库',
  'inventory→planting': '库存 → 种植',
  'inventory→seedling': '库存 → 育苗',
  'inventory→seed_source': '库存 → 种源',
  'seed_source→harvest': '种源 → 采收',
  'plan→seed_source': '计划 → 种源',
  'planting→seed_source': '种植 → 种源',
  correction: '数量修正',
};

/**
 * 查询 material_flow_log（调已有 /material-flow-log/trace 端点）
 */
async function fetchFlowLogs(code: string): Promise<HistoryItem[]> {
  if (!code) return [];
  try {
    const res = await enhancedApiClient.get<FlowLogRow[]>(
      `/material-flow-log/trace?code=${encodeURIComponent(code)}`
    );
    const rows = Array.isArray(res) ? res : (res as Record<string, unknown>)?.data as FlowLogRow[] || [];
    return rows.map((r: FlowLogRow) => ({
      id: r.id,
      occurredAt: r.createdAt,
      source: 'flow' as const,
      category: 'flow' as const,
      action: FLOW_TYPE_CN[r.flowType] || r.flowType || '流转',
      quantityDelta: r.targetQuantity || r.sourceQuantity || undefined,
      unit: r.targetUnit || r.sourceUnit,
      refCode: r.sourceCode || r.targetCode,
      refModule: undefined,
      operatorName: r.createdBy,
      remarks: r.cropName,
    }));
  } catch {
    return [];
  }
}

/**
 * 查询完整实体历史（实体级 + material_flow_log 合并，按时间倒序）
 */
export async function fetchFullHistory(
  entity: 'seed-sources' | 'seedlings' | 'plantings',
  entityId: string,
  entityCode: string,
): Promise<HistoryItem[]> {
  const [entityHistory, flowLogs] = await Promise.all([
    fetchEntityHistory(entity, entityId),
    fetchFlowLogs(entityCode),
  ]);

  // 合并 + 去重（按 id）
  const seen = new Set<string>();
  const merged: HistoryItem[] = [];
  for (const item of [...entityHistory, ...flowLogs]) {
    if (seen.has(item.id)) continue;
    seen.add(item.id);
    merged.push(item);
  }

  // 按时间倒序
  merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return merged;
}
