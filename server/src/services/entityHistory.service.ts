/**
 * 实体历史服务（2026-06-27）
 * 查询 3-4 张实体级表（按 business_id 关联），返回统一时间线数据
 *
 * 数据源：
 *   - audit_logs: business_id + business_type（lifecycle）
 *   - inventory_inbound_records: business_id（inbound）
 *   - inventory_transaction: business_id（transaction）
 *   - crop_circulation_records: seed_source_id（circulation，仅种源）
 *
 * 注意：material_flow_log 不在此端点，单独通过 /material-flow-log/trace 查询
 */

import { getDatabase } from '../db';

export interface HistoryItem {
  id: string;
  occurredAt: string;
  source: 'entity';           // 实体级历史（非业务流转）
  category: 'lifecycle' | 'inbound' | 'transaction' | 'circulation';
  action: string;
  quantityDelta?: number;
  unit?: string;
  refCode?: string;
  refModule?: string;
  operatorName?: string;
  remarks?: string;
  cropName?: string;          // 作物品种（inbound 表有）
  inboundSource?: string;     // 入库来源类型（外购/调拨/自产等，仅 inbound 有）
  raw?: Record<string, unknown>;
}

/** 实体类型 */
export type EntityType = 'seed_source' | 'seedling' | 'planting';

/** entityType → audit_logs business_type 映射 */
const ENTITY_TO_AUDIT_TYPE: Record<EntityType, string> = {
  seed_source: 'seed_source',
  seedling: 'seedling',
  planting: 'planting',
};

// ========== 2026-07-05 英文枚举 → 中文映射（修复种源详情弹窗显示 PROPAGATION/DISPOSAL/SALES 等） ==========
/** crop_circulation_records.circulation_type → 中文 */
const CIRCULATION_TYPE_CN: Record<string, string> = {
  PROPAGATION: '繁殖回流',
  DISPOSAL: '处置',
  QUANTITY: '数量调整',
};

/** crop_circulation_records.disposition → 中文 */
const DISPOSITION_CN: Record<string, string> = {
  SALES: '销售',
  DISPOSAL: '销毁',
  REUSE: '再利用',
  GIFT: '赠送',
};

/** crop_circulation_records / inventory_inbound_records.source_module → 中文 */
const SOURCE_MODULE_CN: Record<string, string> = {
  harvest: '采收',
  planting: '种植',
  seedling: '育苗',
  inventory: '库存',
  seed_source: '种源',
};

/**
 * 查询实体历史（按 business_id 关联的 3-4 表 UNION）
 */
export function queryEntityHistory(entityType: EntityType, entityId: string, limit = 200): HistoryItem[] {
  if (!entityId) return [];

  const db = getDatabase();
  const auditType = ENTITY_TO_AUDIT_TYPE[entityType];
  const results: HistoryItem[] = [];

  // 1. audit_logs（lifecycle）
  try {
    const stmt = db.prepare(`
      SELECT id, action, opinion, operator_name, created_at
      FROM audit_logs
      WHERE business_type = ? AND business_id = ?
      ORDER BY created_at DESC LIMIT ?
    `);
    stmt.bind([auditType, entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const action = String(r.action || '');
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.created_at || ''),
        source: 'entity',
        category: 'lifecycle',
        action: action === 'create' ? '创建' : action === 'update' ? '修改' : action === 'delete' ? '删除' : action,
        operatorName: String(r.operator_name || 'system'),
        remarks: String(r.opinion || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] audit_logs query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 2. inventory_inbound_records（inbound）
  // 注意：business_id 可能为空，source_id + source_module 是主要关联路径
  try {
    const stmt = db.prepare(`
      SELECT id, record_date, source_module, source_code, source_type,
             quantity, unit, warehouse_name, operator_name, notes, create_time,
             crop_name
      FROM inventory_inbound_records
      WHERE (business_id = ? OR (source_id = ? AND source_module = ?))
      ORDER BY create_time DESC LIMIT ?
    `);
    const sourceModule = entityType === 'seed_source' ? 'seed_source'
      : entityType === 'seedling' ? 'seedling' : 'planting';
    stmt.bind([entityId, entityId, sourceModule, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const qty = Number(r.quantity || 0);
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.create_time || r.record_date || ''),
        source: 'entity',
        category: 'inbound',
        action: `入库 +${qty}`,
        quantityDelta: qty,
        unit: String(r.unit || ''),
        refCode: String(r.source_code || ''),
        refModule: SOURCE_MODULE_CN[String(r.source_module || '')] || String(r.source_module || ''),
        operatorName: String(r.operator_name || ''),
        remarks: [
                r.notes,
                r.disposition ? `处置方式：${DISPOSITION_CN[String(r.disposition)] || r.disposition}` : null,
              ].filter(Boolean).join(' ｜ '),
        cropName: r.crop_name ? String(r.crop_name) : undefined,
        inboundSource: String(r.source_type || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] inbound query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 3. inventory_transaction（transaction）
  try {
    const stmt = db.prepare(`
      SELECT id, transaction_type, quantity, balance_before, balance_after,
             operate_date, remarks, operator_name, create_time
      FROM inventory_transaction
      WHERE business_id = ?
      ORDER BY create_time DESC LIMIT ?
    `);
    stmt.bind([entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const txnType = String(r.transaction_type || '');
      const qty = Number(r.quantity || 0);
      const actionLabel = txnType === 'transfer_in'
        ? '退库入库'
        : txnType === 'transfer_out'
          ? '调拨出库'
          : txnType === 'inbound'
            ? '入库'
            : txnType === 'outbound'
              ? '出库'
              : txnType === 'freeze'
                ? '冻结'
                : txnType === 'unfreeze'
                  ? '解冻'
                  : txnType;
      results.push({
        id: String(r.id || ''),
        occurredAt: String(r.create_time || r.operate_date || ''),
        source: 'entity',
        category: 'transaction',
        action: actionLabel,
        quantityDelta: txnType === 'transfer_out' || txnType === 'outbound' ? -qty : qty,
        unit: '',
        operatorName: String(r.operator_name || ''),
        remarks: String(r.remarks || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] transaction query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 4. crop_circulation_records（circulation，仅种源）
  if (entityType === 'seed_source') {
    try {
      const stmt = db.prepare(`
        SELECT id, circulation_date, circulation_type, source_module,
               quantity, unit, disposition, notes, created_at
        FROM crop_circulation_records
        WHERE parent_source_id = ? OR new_source_id = ?
        ORDER BY created_at DESC LIMIT ?
      `);
      stmt.bind([entityId, entityId, limit]);
      while (stmt.step()) {
        const r = stmt.getAsObject() as Record<string, unknown>;
        const qty = Number(r.quantity || 0);
        results.push({
          id: String(r.id || ''),
          occurredAt: String(r.created_at || r.circulation_date || ''),
          source: 'entity',
          category: 'circulation',
          action: CIRCULATION_TYPE_CN[String(r.circulation_type || '')] || String(r.circulation_type || '回流'),
          quantityDelta: qty,
          unit: String(r.unit || ''),
          refModule: SOURCE_MODULE_CN[String(r.source_module || '')] || String(r.source_module || ''),
          remarks: [
                r.notes,
                r.disposition ? `处置方式：${DISPOSITION_CN[String(r.disposition)] || r.disposition}` : null,
              ].filter(Boolean).join(' ｜ '),
        });
      }
      stmt.free();
    } catch (e) {
      console.warn(`[entityHistory] circulation query failed for ${entityId}:`, (e as Error).message);
    }
  }

  // 排序：occurredAt 倒序
  results.sort((a, b) => b.occurredAt.localeCompare(a.occurredAt));
  return results.slice(0, limit);
}
