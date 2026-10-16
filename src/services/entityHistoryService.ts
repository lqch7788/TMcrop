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
  inboundSource?: string;     // 入库来源（外购/调拨/自产等）
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
  inboundSource?: string;
}

/** material_flow_log 流转数据 */
interface FlowLogRow {
  id: string;
  flowType: string;
  cropName?: string;
  cropVariety?: string;       // 2026-07-23：补全，数据库表已有此列
  sourceCode?: string;
  sourceQuantity?: number;
  sourceUnit?: string;
  targetCode?: string;
  targetQuantity?: number;
  targetUnit?: string;
  createdAt: string;
  createdBy?: string;
  operatorName?: string;      // 2026-08-16：trace 端点 JOIN users 补的操作员姓名
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
  'inventory→freeze': '库存 → 冻结',
  correction: '数量修正',
};

/**
 * 2026-07-16：flowType 第一段（来源） → 中文
 * 让 EntityHistoryTimeline 表格"来源"列能展示有意义的标签（如「种源」「库存」）
 * 之前只填到 remarks，表格列永远显示 '-'
 */
const FLOW_SOURCE_CN: Record<string, string> = {
  seed_source: '种源',
  inventory: '库存',
  external: '外部',
  planting: '种植',
  correction: '数量修正',
  plan: '计划',
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
    return rows.map((r: FlowLogRow) => {
      // 2026-07-16 修复：flowType 第一段即"来源"（如 seed_source→seedling → 'seed_source' → '种源'）
      const sourceKey = r.flowType ? r.flowType.split('→')[0] : '';
      // 2026-08-16 修复：与后端 history 各数据源统一为「品种名优先」
      // （原"作物-品种"拼接与其他行"品种名"格式不一致，且 correction 行缺品种时只剩光杆作物名）
      const fullCropName = r.cropVariety || r.cropName || '';
      // 2026-07-23 修复：refCode 优先用 targetCode（用户视角"这条记录关联的本订单"）
      // 之前 sourceCode || targetCode 对种植实体显示的是种源单号（如 ZZ20260723-002），
      // 用户期望的是种植单 ZZ20260723-003 自身
      // 2026-10-16：quantityDelta 符号按实体在流转中的角色 —— 实体为 source（流出方）→ -|N|；
      //   实体为 target（流入方）→ 保留原值（通常为正；correction 等已带负号）。
      //   修复用户报告："种源 → 种植 +9" 在种源时间线应显示 -9（被使用是减少）。
      const rawQty = r.targetQuantity ?? r.sourceQuantity ?? undefined;
      const isSourceEntity = !!code && r.sourceCode === code;
      const qtyDelta = rawQty == null ? undefined : (isSourceEntity ? -Math.abs(rawQty) : rawQty);
      return {
        id: r.id,
        occurredAt: r.createdAt,
        source: 'flow' as const,
        category: 'flow' as const,
        action: FLOW_TYPE_CN[r.flowType] || r.flowType || '流转',
        quantityDelta: qtyDelta,
        unit: r.targetUnit || r.sourceUnit,
        refCode: r.targetCode || r.sourceCode,
        refModule: undefined,
        // 2026-08-16：优先用 trace 端点 JOIN users 补的姓名（原来直出 createdBy 用户 ID 如 USER_ADMIN_001）
        operatorName: r.operatorName || r.createdBy,
        // 2026-07-23：完整作物+品种名
        cropName: fullCropName,
        // 2026-07-16 修复：从 flowType 推断入库来源，让表格"来源"列展示有意义的标签
        inboundSource: FLOW_SOURCE_CN[sourceKey] || sourceKey || undefined,
        // 保留原行为：作物名也写到备注（不破坏既有 UI 习惯）
        remarks: fullCropName || r.cropName,
      };
    });
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

  // 2026-10-16 v3：同事件合并由调用方（EntityHistoryTimeline）仅在「全部」视图触发
  //   （合并函数 mergeTimelineEventPairs 见本文件下方）；「流转」等分类视图保留完整台账。
  // 按时间倒序
  merged.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return merged;
}

/** 同事件配对时间窗口（毫秒）：一次业务操作的多视角记录写入间隔通常在毫秒级 */
const PAIR_WINDOW_MS = 2000;

/** 同事件判据：|数量| 相同（允许镜像符号，如「种源→育苗 +11」vs「育苗使用 -11」）+ 时间差 ≤ 窗口 */
function isSameEvent(a: HistoryItem, b: HistoryItem): boolean {
  if (a.quantityDelta == null || b.quantityDelta == null) return false;
  if (Math.abs(Math.abs(a.quantityDelta) - Math.abs(b.quantityDelta)) > 1e-9) return false;
  const ta = Date.parse(a.occurredAt);
  const tb = Date.parse(b.occurredAt);
  return !Number.isNaN(ta) && !Number.isNaN(tb) && Math.abs(ta - tb) <= PAIR_WINDOW_MS;
}

/**
 * 「全部」视图同事件合并（2026-10-16 v3；由 EntityHistoryTimeline 仅在「全部」视图调用，
 * 分类视图保留完整台账）：
 * 1. flow 行若存在同事件的 transaction/inbound 行（账务视角）→ 隐藏 flow 行；
 * 2. circulation 行若存在同事件的 flow 行 → 合并为一条并保留两边全部字段。
 *    数据实况（用户报告场景）：种植留种回流同时写 material_flow_log（「种植 → 种源」）
 *    与 crop_circulation_records（「繁殖回流」），并列显示 +22 两条会让用户误以为回流了两次。
 *    合并规则：flow 的方向文案并入类型徽章、备注拼接去重、关联单号/操作员/作物品种/单位缺失时互相兜底。
 *    例：繁殖回流（种植 → 种源） +22 千克 关联单号 ZZ20261016-001 备注「红颜 ｜ 测试」
 *    注：flow 行的 refCode 是 targetCode（= 当前实体自身编码，自指无信息量），
 *    合并后以 circulation 行的关联单号（种植/育苗批号）为准，不重复自指编码。
 */
export function mergeTimelineEventPairs(items: HistoryItem[]): HistoryItem[] {
  const flowRows = items.filter((i) => i.category === 'flow');
  const accountRows = items.filter((i) => i.category === 'transaction' || i.category === 'inbound');
  const circulationRows = items.filter((i) => i.category === 'circulation');

  // 回流合并：circulation 行吸收同事件 flow 行（每条 flow 行最多被消费一次）
  const consumedFlowIds = new Set<string>();
  const mergedById = new Map<string, HistoryItem>();
  for (const c of circulationRows) {
    const f = flowRows.find((row) => !consumedFlowIds.has(row.id) && isSameEvent(row, c));
    if (!f) continue;
    consumedFlowIds.add(f.id);
    const remarks = Array.from(new Set([f.remarks, c.remarks].filter((t): t is string => !!t)));
    mergedById.set(c.id, {
      ...c,
      // 方向文案并入类型徽章：繁殖回流（种植 → 种源）
      action: f.action && f.action !== c.action ? `${c.action}（${f.action}）` : c.action,
      remarks: remarks.join(' ｜ ') || undefined,
      refCode: c.refCode || f.refCode,
      operatorName: c.operatorName || f.operatorName,
      cropName: c.cropName || f.cropName,
      unit: c.unit || f.unit,
      inboundSource: c.inboundSource || f.inboundSource,
    });
  }

  return items
    .map((i) => mergedById.get(i.id) ?? i)
    .filter((i) => {
      if (i.category !== 'flow') return true;
      if (consumedFlowIds.has(i.id)) return false;                 // 已并入 circulation 行
      return !accountRows.some((t) => isSameEvent(i, t));          // 与账务行配对 → 隐藏
    });
}
