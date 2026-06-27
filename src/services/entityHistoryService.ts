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
      action: r.flowType || '流转',
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
