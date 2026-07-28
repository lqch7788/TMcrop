/**
 * 上游溯源服务（2026-07-22 新增）
 *
 * 递归追溯种源的"最初来源"链路：
 * - 链路 1：库存调拨入库 — 种源 ← inventory_stock ← inventory_inbound_records ← ...
 * - 链路 2：种植采收回流 — 种源 ← crop_circulation_records ← plantings/harvest_records ← ...
 *
 * 算法：逐跳递归查询（非 SQL JOIN），visited Set 循环检测
 * 性能：最大 10 跳 × 2-4 查询/跳 = ≤40 次 DB 查询
 */

import { getDatabase } from '../db';

/** 安全取值（string） */
function s(v: unknown): string { return String(v || ''); }
/** 安全取值（number） */
function n(v: unknown): number { return Number(v || 0); }

/** 构造节点显示名（crop_name + crop_variety/variety_name 拼接最细粒度品种） */
function buildLabel(row: Record<string, unknown>): string {
  const cn = s(row.crop_name);
  const cv = s(row.crop_variety) || s(row.variety_name); // inventory_inbound_records 用 variety_name
  if (cv && cn && cv !== cn) return `${cn}（${cv}）`;
  return cn || cv || s(row.source_name) || s(row.label) || '';
}

// ========== 类型定义 ==========

export type UpstreamNodeType =
  | 'seed_source'
  | 'inventory_stock'
  | 'inventory_inbound'
  | 'planting'
  | 'seedling'
  | 'harvest_record'
  | 'crop_circulation'
  | 'supplier'
  | 'unknown';

export type UpstreamRelation =
  | 'self'
  | 'transfer_to_source'
  | 'propagation_reflow'
  | 'harvest_inbound'
  | 'planting_source'
  | 'seedling_source'
  | 'external_purchase';

export interface UpstreamNode {
  id: string;
  type: UpstreamNodeType;
  code: string;
  label: string;
  relation: UpstreamRelation;
  relationLabel: string;
  occurredAt: string;
  operatorName?: string;
  quantity?: number;
  unit?: string;
  cropName?: string;
  cropVariety?: string;
  seedForm?: string;
  supplierName?: string;
  supplierId?: string;
  sourceModule?: string;
  children: UpstreamNode[];
  isOrphan?: boolean;
  isCycle?: boolean;
  isTruncated?: boolean;
  depth: number;
}

/** 来源模块中文映射 */
const SOURCE_MODULE_LABELS: Record<string, string> = {
  inventory: '库存调拨',
  manual: '手动入库',
  seed_source: '种源入库',
  external_purchased: '外购入库',
  harvest: '采收入库',
  planting: '种植入库',
  seedling: '育苗入库',
  self_produced: '自产入库',
  purchase: '采购入库',
  external_purchase: '外部采购',
  inventory_transfer: '库存调拨',
  transfer_inbound: '调拨入库',
};

/** source_type → 入库方式标签（6 种入库方式对应） */
const SOURCE_TYPE_LABELS: Record<string, string> = {
  external_purchased: '外购入库',
  external_purchase: '外购入库',
  gift: '赠品入库',
  commissioned: '委托入库',
  transfer: '调拨入库',
  transfer_inbound: '调拨入库',
  manual: '手动入库',
  self_produced: '自产入库',
  planting: '采收入库',
  harvest: '采收入库',
  purchase: '采购入库',
  other: '其他',
};

export interface UpstreamTraceResult {
  root: UpstreamNode;
  depth: number;
  totalNodes: number;
  truncated: boolean;
  hasCycle: boolean;
  traceTime: number;
}

// ========== 核心函数 ==========

export function traceUpstream(sourceId: string, maxDepth = 10): UpstreamTraceResult {
  const startTime = Date.now();
  const db = getDatabase();
  let visited = new Set<string>();

  /** 防循环 key */
  function visitKey(id: string, type: string): string {
    return `${id}:${type}`;
  }

  /** 构造孤儿节点 */
  function orphanNode(id: string, type: UpstreamNodeType, label: string): UpstreamNode {
    return {
      id, type, code: '', label,
      relation: 'external_purchase',
      relationLabel: '上游数据已删除',
      occurredAt: '',
      isOrphan: true,
      children: [],
      depth: 1,
    };
  }

  /**
   * 递归构建节点
   * @returns UpstreamNode 或 null（查不到数据时返回 null）
   */
  function buildNode(
    type: UpstreamNodeType,
    row: Record<string, unknown> | null,
    relation: UpstreamRelation,
    relationLabel: string,
    depth: number,
  ): UpstreamNode | null {
    if (!row) return null;

    const id = String(row.id || '');
    const vk = visitKey(id, type);

    // 循环检测 — 已访问过，不再重复展开
    if (visited.has(vk)) {
      return {
        id, type, code: '', label: '溯源起点（已到达链路顶端）',
        relation, relationLabel,
        occurredAt: '',
        isCycle: true,
        children: [],
        depth,
      };
    }

    // 深度截断
    if (depth > maxDepth) {
      return {
        id, type, code: '', label: '已达到最大深度',
        relation, relationLabel,
        occurredAt: '',
        isTruncated: true,
        children: [],
        depth,
      };
    }

    visited.add(vk);
    const children: UpstreamNode[] = [];

    // --- 按 type 查上游 ---
    try {
      switch (type) {
        case 'seed_source': {
          // 分支 1：调拨入库 — 每条路径独立 visited set（防止不同入库路径互相干扰）
          const ibStmt = db.prepare(`
            SELECT * FROM inventory_inbound_records WHERE business_id = ? LIMIT 3
          `);
          ibStmt.bind([id]);
          while (ibStmt.step()) {
            const ib = ibStmt.getAsObject() as Record<string, unknown>;
            const st = String(ib.source_type || '');
            const sm = String(ib.source_module || '');
            const srcId = String(ib.source_id || '');

            // 穿透策略：source_id 可能是中间库存（如 INS-20260722-0004），
            // 从 notes 提取真正的原库存 ID（如 IPR-20260722-0002）
            let realSrcId = srcId;
            const notes = s(ib.notes);
            const realMatch = notes.match(/从库存\s*(I[NPS][NRS]E?-\d{8}-\d{4})/);
            if (realMatch) realSrcId = realMatch[1];

            const stkStmt = db.prepare(`SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ?`);
            stkStmt.bind([realSrcId, realSrcId]);
            if (stkStmt.step()) {
              const stk = stkStmt.getAsObject() as Record<string, unknown>;
              // 用 inbound 的 quantity（调拨数量）覆盖 stock 的总量
              const transferQty = Number(ib.quantity || 0);
              if (transferQty > 0) {
                stk.quantity = transferQty;
                stk.unit = s(ib.unit) || s(stk.unit);
              }
              const label = `调拨入库（来源: ${SOURCE_TYPE_LABELS[st] || st || sm}）`;
              // 每条入库路径用独立的 visited set
              const savedVisited = new Set(visited);
              visited.clear();
              const child = buildNode('inventory_stock', stk, 'transfer_to_source', label, depth + 1);
              for (const vk of visited) savedVisited.add(vk);
              visited = savedVisited;
              if (child) children.push(child);
            }
            stkStmt.free();
          }
          ibStmt.free();

          // 分支 2：回流路径（PROPAGATION 种植留种）
          const circStmt = db.prepare(`
            SELECT * FROM crop_circulation_records
            WHERE new_source_id = ? AND circulation_type = 'PROPAGATION' AND is_revoked = 0
            ORDER BY created_at DESC LIMIT 3
          `);
          circStmt.bind([id]);
          while (circStmt.step()) {
            const cr = circStmt.getAsObject() as Record<string, unknown>;
            const crType = String(cr.source_module || 'unknown');
            if (crType === 'planting') {
              const plStmt = db.prepare(`SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL`);
              plStmt.bind([s(cr.source_id)]);
              let plNode: UpstreamNode | null = null;
              if (plStmt.step()) {
                const pl = plStmt.getAsObject() as Record<string, unknown>;
                plNode = buildNode('planting', pl, 'propagation_reflow', '种植采收回流', depth + 1);
              } else {
                plNode = orphanNode(String(cr.source_id || ''), 'planting', '种植批次（已删除）');
              }
              plStmt.free();
              if (plNode) children.push(plNode);
            } else if (crType === 'harvest') {
              const hvStmt = db.prepare(`SELECT * FROM harvest_records WHERE id = ?`);
              hvStmt.bind([s(cr.source_id)]);
              let hvNode: UpstreamNode | null = null;
              if (hvStmt.step()) {
                const hv = hvStmt.getAsObject() as Record<string, unknown>;
                hvNode = buildNode('harvest_record', hv, 'propagation_reflow', '采收回流', depth + 1);
              } else {
                hvNode = orphanNode(String(cr.source_id || ''), 'harvest_record', '采收记录（已删除）');
              }
              hvStmt.free();
              if (hvNode) children.push(hvNode);
            }
          }
          circStmt.free();

          // 分支 3：外购（示 supplier 子节点，如果无调拨/回流上游）
          if (row.supplier_name && children.length === 0) {
            children.push({
              id: String(row.supplier_id || `supplier-${id}`),
              type: 'supplier',
              code: '',
              label: `外购供应商: ${row.supplier_name}`,
              relation: 'external_purchase',
              relationLabel: '外购入库',
              occurredAt: String(row.purchase_date || ''),
              supplierName: String(row.supplier_name || ''),
              supplierId: String(row.supplier_id || ''),
              children: [],
              depth: depth + 1,
            });
          }
          break;
        }

        case 'inventory_inbound': {
          // 根据 source_module + source_type 查上游
          const sm = String(row.source_module || '');
          const sourceType = String(row.source_type || '');
          const sourceId = String(row.source_id || '');

          // 入库方式中文标签（6 种入库方式显示在 relationLabel）
          const sourceTypeLabel = SOURCE_TYPE_LABELS[sourceType] || sourceType || '';

          // 按 source_type 查上游（6 种入库方式）
          // 注意：sourceType 是 "谁创造了这个库存的物资"（planting/harvest/external_purchased 等），
          //       但 source_id 可能指向中间体（如 inventory_stock），不一定是最终上游。
          //       所以先判断 source_id 的实际类型，如果不是预期实体就追到 stock 再递归。
          if ((sourceType === 'planting' || sm === 'planting') && sourceId) {
            // 先查是否直接指向 plantings
            let matched = false;
            const pStmt = db.prepare(`SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL`);
            pStmt.bind([sourceId]);
            if (pStmt.step()) {
              matched = true;
              const pl = pStmt.getAsObject() as Record<string, unknown>;
              const child = buildNode('planting', pl, 'harvest_inbound', `种植入库${sourceTypeLabel ? '（' + sourceTypeLabel + '）' : ''}`, depth + 1);
              if (child) children.push(child);
            }
            pStmt.free();
            // 不是直接指向 plantings → 查库存 → 让库存的 business_type 决定下一步
            if (!matched) {
              const stkFallback = db.prepare(`SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ?`);
              stkFallback.bind([sourceId, sourceId]);
              if (stkFallback.step()) {
                const stk = stkFallback.getAsObject() as Record<string, unknown>;
                const child = buildNode('inventory_stock', stk, 'transfer_to_source', `库存来源（${sourceTypeLabel || '种植'}）`, depth + 1);
                if (child) children.push(child);
              }
              stkFallback.free();
            }
          } else if ((sourceType === 'harvest' || sm === 'harvest') && sourceId) {
            let matched2 = false;
            const hStmt = db.prepare(`SELECT * FROM harvest_records WHERE id = ?`);
            hStmt.bind([sourceId]);
            if (hStmt.step()) {
              matched2 = true;
              const hv = hStmt.getAsObject() as Record<string, unknown>;
              const child = buildNode('harvest_record', hv, 'harvest_inbound', `采收入库${sourceTypeLabel ? '（' + sourceTypeLabel + '）' : ''}`, depth + 1);
              if (child) children.push(child);
            }
            hStmt.free();
            if (!matched2) {
              const stkFallback2 = db.prepare(`SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ?`);
              stkFallback2.bind([sourceId, sourceId]);
              if (stkFallback2.step()) {
                const stk2 = stkFallback2.getAsObject() as Record<string, unknown>;
                const child = buildNode('inventory_stock', stk2, 'transfer_to_source', `库存来源（${sourceTypeLabel || '采收'}）`, depth + 1);
                if (child) children.push(child);
              }
              stkFallback2.free();
            }
          } else if ((sourceType === 'seed_source' || sm === 'seed_source') && sourceId) {
            const ssStmt = db.prepare(`SELECT * FROM seed_sources WHERE id = ? AND deleted_at IS NULL`);
            ssStmt.bind([sourceId]);
            let child: UpstreamNode | null = null;
            if (ssStmt.step()) {
              const ss = ssStmt.getAsObject() as Record<string, unknown>;
              child = buildNode('seed_source', ss, 'transfer_to_source', '种源入库', depth + 1);
            }
            ssStmt.free();
            if (child) children.push(child);
          } else if ((sourceType === 'external_purchased' || sourceType === 'external_purchase' || sourceType === 'purchase') && row.supplier_name) {
            children.push({
              id: String(row.supplier_id || `supplier-${row.id}`),
              type: 'supplier',
              code: '',
              label: `外购供应商: ${row.supplier_name}`,
              relation: 'external_purchase',
              relationLabel: '外购入库',
              occurredAt: String(row.record_date || ''),
              supplierName: String(row.supplier_name || ''),
              children: [],
              depth: depth + 1,
            });
          } else if (sourceType === 'gift' || sourceType === 'gift_sample') {
            children.push({
              id: String(row.id || '') + '-gift',
              type: 'unknown',
              code: '',
              label: `赠送来源: ${row.gift_from || '未知'}`,
              relation: 'external_purchase',
              relationLabel: '赠品入库',
              occurredAt: String(row.record_date || ''),
              children: [],
              depth: depth + 1,
            });
          } else if (sourceType === 'commissioned' || sourceType === 'consignor') {
            children.push({
              id: String(row.id || '') + '-consign',
              type: 'unknown',
              code: '',
              label: `委托加工来源: ${row.consignor || '未知'}`,
              relation: 'external_purchase',
              relationLabel: '委托入库',
              occurredAt: String(row.record_date || ''),
              children: [],
              depth: depth + 1,
            });
          } else if (sourceType === 'self_produced' || sourceType === 'manual') {
            children.push({
              id: String(row.id || '') + '-self',
              type: 'unknown',
              code: '',
              label: `自产入库${row.production_plan_code ? '（计划: ' + row.production_plan_code + '）' : ''}`,
              relation: 'external_purchase',
              relationLabel: '自产入库',
              occurredAt: String(row.record_date || ''),
              children: [],
              depth: depth + 1,
            });
          } else if (sm === 'inventory' && sourceId) {
            // 库存调拨 → 查源库存
            const stkStmt = db.prepare(`SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ?`);
            stkStmt.bind([sourceId, sourceId]);
            let child: UpstreamNode | null = null;
            if (stkStmt.step()) {
              const stk = stkStmt.getAsObject() as Record<string, unknown>;
              child = buildNode('inventory_stock', stk, 'transfer_to_source', '库存来源', depth + 1);
            }
            stkStmt.free();
            if (child) children.push(child);
          } else if (sourceId && sm) {
            // 兜底：尝试按 source_id 查库存
            const stkStmt2 = db.prepare(`SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ?`);
            stkStmt2.bind([sourceId, sourceId]);
            if (stkStmt2.step()) {
              const stk2 = stkStmt2.getAsObject() as Record<string, unknown>;
              const child2 = buildNode('inventory_stock', stk2, 'transfer_to_source', `入库来源（${sourceTypeLabel || sm}）`, depth + 1);
              if (child2) children.push(child2);
            }
            stkStmt2.free();
          }

          // 外购兜底（无 supplier_name 时才显）
          if (row.supplier_name && children.length === 0) {
            children.push({
              id: String(row.supplier_id || `supplier-${row.id}`),
              type: 'supplier',
              code: '',
              label: `外购供应商: ${row.supplier_name}`,
              relation: 'external_purchase',
              relationLabel: '外购入库',
              occurredAt: String(row.record_date || ''),
              supplierName: String(row.supplier_name || ''),
              children: [],
              depth: depth + 1,
            });
          }
          break;
        }

        case 'inventory_stock': {
          const bt = String(row.business_type || '');
          const bizId = String(row.business_id || '');
          const sourceType = String(row.source_type || '');

          // 按 business_type 追溯到创建这个库存的上游
          if (bt === 'harvest' && bizId) {
            const hvStmt = db.prepare(`SELECT * FROM harvest_records WHERE id = ?`);
            hvStmt.bind([bizId]);
            if (hvStmt.step()) {
              const hv = hvStmt.getAsObject() as Record<string, unknown>;
              const child = buildNode('harvest_record', hv, 'harvest_inbound', '采收入库', depth + 1);
              if (child) children.push(child);
            }
            hvStmt.free();
          } else if (bt === 'inbound' && bizId) {
            const ibStmt2 = db.prepare(`SELECT * FROM inventory_inbound_records WHERE id = ?`);
            ibStmt2.bind([bizId]);
            if (ibStmt2.step()) {
              const ib2 = ibStmt2.getAsObject() as Record<string, unknown>;
              const child = buildNode('inventory_inbound', ib2, 'transfer_to_source', '入库来源', depth + 1);
              if (child) children.push(child);
            }
            ibStmt2.free();
          } else if (bt === 'inventory_transfer' && bizId) {
            // 调拨创建的库存 → 不追（会回环到同一个 inbound），靠 source_type 标签展示来源
            // 无 children
          } else if (sourceType === 'planting' || sourceType === 'harvest') {
            // source_type 有值 → 通过 inventory_inbound_records.source_id 追上游
            const ibStmt4 = db.prepare(`SELECT * FROM inventory_inbound_records WHERE source_id = ? OR business_id = ?`);
            const instId = String(row.instance_id || row.id || '');
            ibStmt4.bind([instId, instId]);
            let found = false;
            while (ibStmt4.step()) {
              found = true;
              const ib4 = ibStmt4.getAsObject() as Record<string, unknown>;
              const child = buildNode('inventory_inbound', ib4, 'transfer_to_source', `${sourceType}入库`, depth + 1);
              if (child) children.push(child);
            }
            ibStmt4.free();
            if (!found) {
              // 兜底：查该库存自己的 inventory_inbound_records
              const stkId = String(row.id || row.instance_id || '');
              const ibStmt5 = db.prepare(`SELECT * FROM inventory_inbound_records WHERE business_id = ?`);
              ibStmt5.bind([stkId]);
              while (ibStmt5.step()) {
                const ib5 = ibStmt5.getAsObject() as Record<string, unknown>;
                const child = buildNode('inventory_inbound', ib5, 'transfer_to_source', '库存入库', depth + 1);
                if (child) children.push(child);
              }
              ibStmt5.free();
            }
          } else {
            // 通用兜底：查关联 inventory_inbound_records
            const stkId2 = String(row.id || row.instance_id || '');
            const ibStmt6 = db.prepare(`SELECT * FROM inventory_inbound_records WHERE business_id = ? OR source_id = ?`);
            ibStmt6.bind([stkId2, stkId2]);
            while (ibStmt6.step()) {
              const ib6 = ibStmt6.getAsObject() as Record<string, unknown>;
              const child = buildNode('inventory_inbound', ib6, 'transfer_to_source', '入库来源', depth + 1);
              if (child) children.push(child);
            }
            ibStmt6.free();
          }
          break;
        }

        case 'planting': {
          const sourceType = String(row.source_type || '').toLowerCase();
          const srcId = String(row.source_id || '');
          if ((sourceType === 'seed' || sourceType === 'seed_source') && srcId) {
            const ssStmt2 = db.prepare(`SELECT * FROM seed_sources WHERE id = ? AND deleted_at IS NULL`);
            ssStmt2.bind([srcId]);
            let child: UpstreamNode | null = null;
            if (ssStmt2.step()) {
              const ss2 = ssStmt2.getAsObject() as Record<string, unknown>;
              child = buildNode('seed_source', ss2, 'planting_source', '种植来源（种源）', depth + 1);
            }
            ssStmt2.free();
            if (child) children.push(child);
          } else if (sourceType === 'seedling' && srcId) {
            const sdStmt = db.prepare(`SELECT * FROM seedlings WHERE id = ? AND deleted_at IS NULL`);
            sdStmt.bind([srcId]);
            let sdNode: UpstreamNode | null = null;
            if (sdStmt.step()) {
              const sd = sdStmt.getAsObject() as Record<string, unknown>;
              sdNode = buildNode('seedling', sd, 'planting_source', '种植来源（育苗）', depth + 1);
            }
            sdStmt.free();
            if (sdNode) children.push(sdNode);
          }
          break;
        }

        case 'harvest_record': {
          const hrSourceModule = String(row.source_module || '');
          const hrSourceId = String(row.source_id || '');
          if ((hrSourceModule === 'planting' || hrSourceModule === 'seedling') && hrSourceId) {
            const plStmt2 = db.prepare(`SELECT * FROM plantings WHERE id = ? AND deleted_at IS NULL`);
            plStmt2.bind([hrSourceId]);
            let child: UpstreamNode | null = null;
            if (plStmt2.step()) {
              const pl2 = plStmt2.getAsObject() as Record<string, unknown>;
              child = buildNode('planting', pl2, 'harvest_inbound', '采收来源', depth + 1);
            }
            plStmt2.free();
            if (child) children.push(child);
          }
          break;
        }

        case 'seedling': {
          const sdSourceId = String(row.source_id || '');
          if (sdSourceId) {
            const ssStmt3 = db.prepare(`SELECT * FROM seed_sources WHERE id = ? AND deleted_at IS NULL`);
            ssStmt3.bind([sdSourceId]);
            let child: UpstreamNode | null = null;
            if (ssStmt3.step()) {
              const ss3 = ssStmt3.getAsObject() as Record<string, unknown>;
              child = buildNode('seed_source', ss3, 'seedling_source', '育苗来源（种源）', depth + 1);
            }
            ssStmt3.free();
            if (child) children.push(child);
          }
          if (!row.source_id) {
            // 外部种源 → 显示外购
            children.push({
              id: String(row.id || '') + '-ext',
              type: 'supplier',
              code: '',
              label: '外部来源种源',
              relation: 'external_purchase',
              relationLabel: '外购育苗',
              occurredAt: String(row.seedling_date || ''),
              children: [],
              depth: depth + 1,
            });
          }
          break;
        }
      }
    } catch (e) {
      // 2026-07-28 审核 LOW：构建节点失败时在节点上记录错误信息，前端可据此提示"部分追溯失败"
      console.warn(`[upstreamTrace] buildNode failed for type=${type} id=${id}:`, (e as Error).message);
    }

    // 构造当前节点
    return {
      id,
      type,
      code: String(row.code || row.source_code || row.instance_id || row.planting_code || row.harvest_code || row.seedling_code || row.crop_code || ''),
      label: buildLabel(row),
      relation,
      relationLabel,
      occurredAt: String(row.create_time || row.record_date || row.purchase_date || row.harvest_date || row.planting_date || row.seedling_date || ''),
      operatorName: String(row.operator_name || row.create_by || row.operater || ''),
      quantity: Number(row.quantity || row.current_quantity || row.harvest_quantity || row.seedling_quantity || 0),
      unit: String(row.unit || ''),
      cropName: String(row.crop_name || ''),
      cropVariety: String(row.crop_variety || ''),
      seedForm: String(row.seed_form || ''),
      supplierName: String(row.supplier_name || ''),
      supplierId: String(row.supplier_id || ''),
      sourceModule: SOURCE_MODULE_LABELS[String(row.source_module || '')] || String(row.source_module || ''),
      children,
      depth,
    };
  }

  // --- 查根节点 ---
  const startStmt = db.prepare(`SELECT * FROM seed_sources WHERE id = ? AND deleted_at IS NULL`);
  startStmt.bind([sourceId]);
  if (!startStmt.step()) {
    startStmt.free();
    throw new Error(`种源 ${sourceId} 不存在或已删除`);
  }
  const root = startStmt.getAsObject() as Record<string, unknown>;
  startStmt.free();

  const rootNode = buildNode('seed_source', root, 'self', '当前种源', 1)!;

  return {
    root: rootNode,
    depth: countDepth(rootNode),
    totalNodes: countNodes(rootNode),
    truncated: hasTruncated(rootNode),
    hasCycle: hasCycle(rootNode),
    traceTime: Date.now() - startTime,
  };
}

// ========== 辅助函数 ==========

function countDepth(node: UpstreamNode): number {
  if (!node.children || node.children.length === 0) return node.depth;
  return Math.max(...node.children.map(c => countDepth(c)));
}

function countNodes(node: UpstreamNode): number {
  let count = 1;
  for (const child of node.children) {
    count += countNodes(child);
  }
  return count;
}

function hasTruncated(node: UpstreamNode): boolean {
  if (node.isTruncated) return true;
  return node.children.some(c => hasTruncated(c));
}

function hasCycle(node: UpstreamNode): boolean {
  if (node.isCycle) return true;
  return node.children.some(c => hasCycle(c));
}