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
      SELECT ir.id, ir.record_date, ir.source_module, ir.source_code, ir.source_type,
             ir.quantity, ir.unit, ir.warehouse_name, ir.operator_name, ir.notes, ir.create_time,
             ir.crop_name AS ir_crop_name,
             -- 2026-07-16：JOIN inventory_stock 取真实作物名（修复"同品种显示不同名"bug）
             -- 优先级：inventory_stock.crop_name > inventory_inbound_records.crop_name
             COALESCE(stk.crop_name, ir.crop_name) AS crop_name,
             COALESCE(stk.variety_name, NULL) AS crop_variety
      FROM inventory_inbound_records ir
      LEFT JOIN inventory_stock stk ON stk.id = ir.source_id
      WHERE (ir.business_id = ? OR (ir.source_id = ? AND ir.source_module = ?))
      ORDER BY ir.create_time DESC LIMIT ?
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
        // 2026-07-16：「作物品种」列显示最后一级名称（品种名）——
        //   完整路径：水果-浆果类-草莓-宁玉，应显示「宁玉」
        //   优先级：variety_name（品种）> crop_name（作物）> ir.crop_name（入库脏数据）
        cropName: r.crop_variety ? String(r.crop_variety) : (r.crop_name ? String(r.crop_name) : undefined),
        inboundSource: String(r.source_type || ''),
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] inbound query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 3. inventory_transaction（transaction）
  // 2026-07-16：补 LEFT JOIN 关联表（seedlings/plantings/seed_sources/inventory_stock），
  //   让 cropName / inboundSource / refCode / refModule 4 个字段不再为空，
  //   修复「库存流水」Tab 的 4 列空数据问题（YM20260716-001 实际数据：业务=育苗 → JOIN seedlings 拿到 crop_name='宁玉'）
  try {
    const stmt = db.prepare(`
      SELECT
        tx.id, tx.transaction_type, tx.business_type, tx.business_code,
        tx.quantity, tx.balance_before, tx.balance_after,
        tx.operate_date, tx.remarks, tx.operator_name, tx.create_time,
        -- 2026-07-16：JOIN 关联业务表取作物名（按 business_type 分支优先匹配）
        COALESCE(sd.crop_name, sp.crop_name, ss.crop_name, stk.crop_name) AS crop_name,
        -- 2026-07-16：JOIN 关联业务表取品种名（最后一级，优先于 crop_name）
        COALESCE(sd.crop_variety, sp.crop_variety, ss.crop_variety, stk.variety_name) AS variety_name,
        -- 2026-07-16：JOIN inventory_stock 取入库来源类型（外购/调拨/自产等）
        stk.source_type AS stock_source_type
      FROM inventory_transaction tx
      LEFT JOIN seedlings sd
        ON sd.id = tx.business_id AND tx.business_type = 'seedling'
      LEFT JOIN plantings sp
        ON sp.id = tx.business_id AND tx.business_type = 'planting'
      LEFT JOIN seed_sources ss
        ON ss.id = tx.business_id AND tx.business_type = 'seed_source'
      LEFT JOIN inventory_stock stk
        ON stk.instance_id = tx.instance_id
      WHERE tx.business_id = ?
      ORDER BY tx.create_time DESC LIMIT ?
    `);
    stmt.bind([entityId, limit]);
    while (stmt.step()) {
      const r = stmt.getAsObject() as Record<string, unknown>;
      const txnType = String(r.transaction_type || '');
      const bizType = String(r.business_type || '');
      const qty = Number(r.quantity || 0);
      // 2026-07-06 P0 修复：transfer_in 须用 business_type 区分调拨入 vs 退库入：
      //   - business_type='transfer' → 调拨入种源（新种源库存被记 transfer_in，库存增加）
      //   - business_type='inventory_transfer' → 退库（原始库存被记 transfer_in，恢复库存）
      // 否则会把调拨入种源错标成"退库入库"，让用户困惑。
      const actionLabel = txnType === 'transfer_in'
        ? (bizType === 'inventory_transfer' ? '退库入库' : '调拨入库')
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
        // 2026-07-16：填 refCode（业务单号，如 YM20260716-001）
        refCode: String(r.business_code || ''),
        // 2026-07-16：填 refModule（业务模块中文：种源/育苗/种植）
        refModule: SOURCE_MODULE_CN[bizType] || bizType,
        operatorName: String(r.operator_name || ''),
        remarks: String(r.remarks || ''),
        // 2026-07-16：填 cropName（JOIN 关联业务表，显示最后一级品种名）
        // 完整路径：水果-浆果类-草莓-宁玉，应显示「宁玉」
        // 优先级：variety_name（品种）> crop_name（作物）
        cropName: r.variety_name ? String(r.variety_name) : (r.crop_name ? String(r.crop_name) : undefined),
        // 2026-07-16：填 inboundSource（库存来源类型，前端 fmtInboundSource 翻译）
        inboundSource: r.stock_source_type ? String(r.stock_source_type) : bizType || undefined,
      });
    }
    stmt.free();
  } catch (e) {
    console.warn(`[entityHistory] transaction query failed for ${entityType}/${entityId}:`, (e as Error).message);
  }

  // 4. crop_circulation_records（circulation，仅种源）
  // 2026-07-18 修复：LEFT JOIN 源表（plantings/seedlings）+ users 表，补全
  //   refCode（源单号）、operatorName（操作员）、cropName/varietyName（作物品种）
  if (entityType === 'seed_source') {
    try {
      const stmt = db.prepare(`
        SELECT
          cc.id, cc.circulation_date, cc.circulation_type, cc.source_module,
          cc.source_id, cc.quantity, cc.unit, cc.disposition, cc.notes, cc.created_at,
          cc.operator_id,
          -- 源单据 code（关联单号 refCode）：从源表按 source_module 分支取
          COALESCE(sp.planting_code, sd.seedling_code) AS ref_code,
          -- 作物名 + 品种名（来源列）
          COALESCE(sp.crop_name, sd.crop_name, ss_parent.crop_name, ss_new.crop_name) AS crop_name,
          COALESCE(sp.crop_variety, sd.crop_variety, ss_parent.crop_variety, ss_new.crop_variety) AS variety_name,
          -- 操作员名（从 users 表取 real_name）
          COALESCE(u.real_name, u.username) AS operator_name
        FROM crop_circulation_records cc
        LEFT JOIN plantings sp
          ON sp.id = cc.source_id AND cc.source_module = 'planting'
        LEFT JOIN seedlings sd
          ON sd.id = cc.source_id AND cc.source_module = 'seedling'
        LEFT JOIN seed_sources ss_parent
          ON ss_parent.id = cc.parent_source_id
        LEFT JOIN seed_sources ss_new
          ON ss_new.id = cc.new_source_id
        LEFT JOIN users u
          ON u.id = cc.operator_id
        WHERE cc.parent_source_id = ? OR cc.new_source_id = ?
        ORDER BY cc.created_at DESC LIMIT ?
      `);
      stmt.bind([entityId, entityId, limit]);
      while (stmt.step()) {
        const r = stmt.getAsObject() as Record<string, unknown>;
        const qty = Number(r.quantity || 0);
        const sourceModuleCn = SOURCE_MODULE_CN[String(r.source_module || '')] || String(r.source_module || '');
        results.push({
          id: String(r.id || ''),
          occurredAt: String(r.created_at || r.circulation_date || ''),
          source: 'entity',
          category: 'circulation',
          action: CIRCULATION_TYPE_CN[String(r.circulation_type || '')] || String(r.circulation_type || '回流'),
          quantityDelta: qty,
          unit: String(r.unit || ''),
          // 2026-07-18 修复：refCode（关联单号）从源表取
          refCode: String(r.ref_code || ''),
          refModule: sourceModuleCn,
          // 2026-07-18 修复：operatorName 从 users.real_name 取
          operatorName: String(r.operator_name || ''),
          // 2026-07-18 修复：cropName 显示完整「作物+品种」路径
          // 优先级：variety_name（品种）> crop_name（作物）
          cropName: r.variety_name
            ? `${r.crop_name ? String(r.crop_name) + ' › ' : ''}${String(r.variety_name)}`
            : (r.crop_name ? String(r.crop_name) : undefined),
          // 2026-07-18 修复：inboundSource（来源）与 refModule 同步（中文）
          inboundSource: sourceModuleCn,
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
