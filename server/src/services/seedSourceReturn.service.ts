/**
 * 种源退库 service（2026-06-26 Q1）
 *
 * 业务场景：种源管理操作列「退库」按钮 — 把调拨入种源的数量退回原作物库存
 *
 * 严格约束：
 * - 必须 1:1 关联 inventory_inbound_records 流水（追溯链 = 该流水记录的 source_id = 原库存 ID）
 * - 不允许用户自选其他库存
 * - 支持部分退（quantity - returned_quantity 范围内）
 *
 * 数据流：
 * 1. inventory_inbound_records.returned_quantity += N
 * 2. 原 inventory_stock.current_quantity += N
 * 3. seed_sources.remaining_quantity -= N + quantity -= N
 * 4. 写 inventory_transaction (transfer_in 类型)
 */

import { getDatabase, saveDatabase } from '../db';
import { formatLocalDateISO } from '../utils/dateUtil';

export const SeedSourceReturnErrorCode = {
  INBOUND_RECORD_NOT_FOUND: 'SEED_SRC_RETURN_INBOUND_NOT_FOUND',
  INSUFFICIENT_RETURNABLE: 'SEED_SRC_RETURN_INSUFFICIENT_RETURNABLE',
  INSUFFICIENT_SOURCE_AVAILABLE: 'SEED_SRC_RETURN_INSUFFICIENT_SOURCE',
  SOURCE_STOCK_GONE: 'SEED_SRC_RETURN_SOURCE_STOCK_GONE',
  UNIT_MISMATCH: 'SEED_SRC_RETURN_UNIT_MISMATCH',
  EMPTY_ITEMS: 'SEED_SRC_RETURN_EMPTY_ITEMS',
} as const;

// 2026-07-14：业务错误基类统一——别名 re-export 给 SeedSourceReturnBusinessError（与 routes/seedSource.ts AppendBusinessError 共用 BusinessError）
import { BusinessError } from './seedSource.service';
export const SeedSourceReturnBusinessError = BusinessError;
type SeedSourceReturnBusinessError = BusinessError;

export interface ReturnItem {
  inboundRecordId: string;
  quantity: number;
  unit: string;
}

export interface ReturnResult {
  returnedCount: number;
  newSourceRemaining: number;
  newSourceTotal: number;
}

/**
 * 执行种源退库（事务级，失败自动回滚）
 */
export function executeReturnToInventory(
  targetSeedSourceId: string,
  items: ReturnItem[],
): ReturnResult {
  if (!targetSeedSourceId) {
    throw new SeedSourceReturnBusinessError(
      SeedSourceReturnErrorCode.EMPTY_ITEMS,
      '目标种源 ID 不能为空',
    );
  }
  if (!items || items.length === 0) {
    throw new SeedSourceReturnBusinessError(
      SeedSourceReturnErrorCode.EMPTY_ITEMS,
      '至少选择 1 条退库流水',
    );
  }

  const db = getDatabase();
  const now = new Date().toISOString();
  const dateStr = formatLocalDateISO();
  let totalReturned = 0;

  // 2026-07-14：开启事务（sql.js 支持 SQLite 原生 BEGIN/COMMIT/ROLLBACK）
  // 任一步骤失败则整体回滚，避免半成品退库导致库存/种源数据不一致
  db.exec('BEGIN TRANSACTION');

  try {

  // 1. 锁定并读取目标种源
  // 1. 锁定并读取目标种源
  const ssStmt = db.prepare(
    `SELECT id, source_code, remaining_quantity, quantity, unit, crop_code, transferred_from_stock_id
     FROM seed_sources WHERE id = ? AND deleted_at IS NULL`
  );
  ssStmt.bind([targetSeedSourceId]);
  const ss = ssStmt.step() ? (ssStmt.getAsObject() as Record<string, unknown>) : null;
  ssStmt.free();
  if (!ss) {
    throw new SeedSourceReturnBusinessError(
      SeedSourceReturnErrorCode.INBOUND_RECORD_NOT_FOUND,
      `目标种源不存在: id=${targetSeedSourceId}`,
      404,
    );
  }
  const sourceUnit = String(ss.unit || '');
  let sourceRemaining = Number(ss.remaining_quantity || 0);
  let sourceTotal = Number(ss.quantity || 0);

  for (const item of items) {
    if (!Number.isInteger(item.quantity) || item.quantity <= 0) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.INSUFFICIENT_RETURNABLE,
        `退库数量必须为正整数: recordId=${item.inboundRecordId}, qty=${item.quantity}`,
      );
    }

    // 2. 锁定流水（FOR UPDATE 语义：sql.js 是单线程内存，这里直接读取）
    const irStmt = db.prepare(
      `SELECT id, source_module, source_id, source_code, stock_type,
              quantity, returned_quantity, unit
       FROM inventory_inbound_records WHERE id = ?`
    );
    irStmt.bind([item.inboundRecordId]);
    const ir = irStmt.step() ? (irStmt.getAsObject() as Record<string, unknown>) : null;
    irStmt.free();
    if (!ir) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.INBOUND_RECORD_NOT_FOUND,
        `退库流水不存在: id=${item.inboundRecordId}`,
        404,
      );
    }

    // 3. 校验：流水是否关联到本种源（追溯链校验，防止跨种源退库）
    //    通过 inventory_inbound_records.business_id = 种源 ID 来校验
    const bizStmt = db.prepare(
      `SELECT business_id FROM inventory_inbound_records WHERE id = ?`
    );
    bizStmt.bind([item.inboundRecordId]);
    const bizRow = bizStmt.step() ? (bizStmt.getAsObject() as Record<string, unknown>) : null;
    bizStmt.free();
    if (!bizRow || String(bizRow.business_id || '') !== targetSeedSourceId) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.INBOUND_RECORD_NOT_FOUND,
        `退库流水 ${item.inboundRecordId} 不属于种源 ${targetSeedSourceId}`,
        404,
      );
    }

    const irUnit = String(ir.unit || '');
    const irQuantity = Number(ir.quantity || 0);
    const irReturned = Number(ir.returned_quantity || 0);

    // 2026-07-06 P0 修复：ir.source_id 是调拨时新创建的种源库存 ID（不是原始作物库存），
    // 用它更新会把退库数量加到种源库存而非原始库存，导致用户作物库存永远收不到退回数。
    // 正确做法：从 seed_sources.transferred_from_stock_id 取原始调拨源库存 ID。
    // 兜底：如果该字段为空（旧数据/手工建库），仍尝试用 ir.source_id 避免完全失败。
    const originalStockId = String(ss.transferred_from_stock_id || ir.source_id || '');
    const irSourceId = originalStockId;

    // 2026-07-06 P0 修复 B：种源退库必须同时扣减新种源库存（ir.source_id 指向的新库存）。
    // 此前只 +原库存、-种源表，未动新种源库存 → 库存层（22）和种源层（10）不一致。
    // 2026-07-06 P0 修复 D：仅读取不写入 — 所有写入放在校验通过后，避免校验失败导致部分写入
    const newSeedStockId = String(ir.source_id || '');

    // 4. 单位一致
    if (irUnit !== sourceUnit) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.UNIT_MISMATCH,
        `流水单位 ${irUnit} ≠ 种源单位 ${sourceUnit}`,
      );
    }
    if (item.unit && item.unit !== irUnit) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.UNIT_MISMATCH,
        `退库单位 ${item.unit} ≠ 流水单位 ${irUnit}`,
      );
    }

    // 5. 可退量校验
    const returnable = irQuantity - irReturned;
    if (item.quantity > returnable) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.INSUFFICIENT_RETURNABLE,
        `退库数量 ${item.quantity} 超过可退量 ${returnable}（流水 ${item.inboundRecordId}）`,
      );
    }

    // 6. 种源可用量校验
    if (item.quantity > sourceRemaining) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.INSUFFICIENT_SOURCE_AVAILABLE,
        `种源可用 ${sourceRemaining}${sourceUnit} < 退库 ${item.quantity}${item.unit}`,
      );
    }

    // 7. 锁定并读取原库存（仅读取，不写入 — 所有写入放在校验通过后）
    const stockStmt = db.prepare(
      `SELECT id, instance_id, current_quantity, available_quantity, status
       FROM inventory_stock WHERE id = ?`
    );
    stockStmt.bind([irSourceId]);
    const stock = stockStmt.step() ? (stockStmt.getAsObject() as Record<string, unknown>) : null;
    stockStmt.free();
    if (!stock) {
      throw new SeedSourceReturnBusinessError(
        SeedSourceReturnErrorCode.SOURCE_STOCK_GONE,
        `原库存不存在: id=${irSourceId}`,
        410,
      );
    }

    // 7b. 读取新种源库存（仅读取）
    let newSeedStockInstanceId = '';
    let newSeedStockCurrent = 0;
    let newSeedStockAvailable = 0;
    if (newSeedStockId && newSeedStockId !== originalStockId) {
      const nsStmt = db.prepare(
        `SELECT instance_id, current_quantity, available_quantity FROM inventory_stock WHERE id = ?`
      );
      nsStmt.bind([newSeedStockId]);
      if (nsStmt.step()) {
        const ns = nsStmt.getAsObject() as Record<string, unknown>;
        newSeedStockInstanceId = String(ns.instance_id || '');
        newSeedStockCurrent = Number(ns.current_quantity || 0);
        newSeedStockAvailable = Number(ns.available_quantity || 0);
      }
      nsStmt.free();
      // 新种源库存可退量校验（防止退库超过种源库存）
      if (item.quantity > newSeedStockCurrent) {
        throw new SeedSourceReturnBusinessError(
          SeedSourceReturnErrorCode.INSUFFICIENT_SOURCE_AVAILABLE,
          `种源库存 ${newSeedStockCurrent}${irUnit} < 退库 ${item.quantity}${irUnit}`,
        );
      }
    }

    // 8. 更新流水 returned_quantity
    db.run(
      `UPDATE inventory_inbound_records
       SET returned_quantity = returned_quantity + ?, update_time = ?
       WHERE id = ?`,
      [item.quantity, now, item.inboundRecordId],
    );

    // 9. 增加原库存
    const oldCurrent = Number(stock.current_quantity || 0);
    const oldAvailable = Number(stock.available_quantity || 0);
    const newCurrent = oldCurrent + item.quantity;
    const newAvailable = oldAvailable + item.quantity;
    db.run(
      `UPDATE inventory_stock
       SET current_quantity = ?, available_quantity = ?, status = 'in_stock', update_time = ?
       WHERE id = ?`,
      [newCurrent, newAvailable, now, irSourceId],
    );

    // 10. 扣减种源
    // 2026-07-06：同步增加 used_quantity（退库是"使用过又退回"，属历史使用累计）
    // 原因：保证守恒 quantity = used_quantity + remaining_quantity
    // 之前只减 remaining 不加 used → 历史数据不一致（如 ZZ20260626-001 remaining 虚高）
    sourceRemaining -= item.quantity;
    sourceTotal -= item.quantity;
    db.run(
      `UPDATE seed_sources
       SET remaining_quantity = ?, quantity = ?, used_quantity = used_quantity + ?,
           update_time = ?
       WHERE id = ?`,
      [sourceRemaining, sourceTotal, item.quantity, now, targetSeedSourceId],
    );

    // 11. 写 inventory_transaction (transfer_in) — 原始库存被 +N
    // 2026-07-06 P0 修复 A：business_id 改回种源 ID（之前是原库存 ID），
    //   让种源详情 timeline 能查到退库流水（queryEntityHistory 用 business_id = 种源ID 过滤）
    // 2026-07-14：流水 ID 改用 crypto.randomUUID()（替代 Math.random 违规，违反 [[code-generation-contract-rule]] 铁律）
      const { randomUUID } = require('crypto');
      const txId = `TX-RET-${dateStr}-${randomUUID()}`;
    db.run(
      `INSERT INTO inventory_transaction (
        id, transaction_id, instance_id, stock_type, transaction_type, quantity,
        balance_before, balance_after, business_id, business_type, business_code,
        operator_id, operator_name, operate_date, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        txId,                                                    // 1: id
        txId,                                                    // 2: transaction_id
        String(stock.instance_id || ''),                         // 3: instance_id
        String(ir.stock_type || ''),                             // 4: stock_type
        'transfer_in',                                           // 5: transaction_type
        item.quantity,                                           // 6: quantity
        oldCurrent,                                              // 7: balance_before
        newCurrent,                                              // 8: balance_after
        targetSeedSourceId,  // 2026-07-06 P0 修复 A：种源 ID     // 9: business_id
        'inventory_transfer',                                    // 10: business_type（2026-07-16 修复）
        String(ir.source_code || ''),                            // 11: business_code
        'system',                                                // 12: operator_id
        'system',                                                // 13: operator_name
        dateStr,                                                 // 14: operate_date
        `种源 ${ss.source_code} 退库 ${item.quantity}${irUnit}`, // 15: remarks
        now,                                                     // 16: create_time
      ],
    );

    // 12. 扣减新种源库存 + 写 transfer_out 流水（仅当新种源库存与原库存不同时）
    // 2026-07-06 P0 修复 B：补齐新种源库存扣减 + 流水（否则库存层 + 种源层数据不一致）
    // 2026-07-16：种源退库完成（quantity=0）后把 status 标记为 'transferred'，让所有列表过滤（status!='transferred'）自动隐藏
    //   避免产生 0 数量的"僵尸"库存记录无法删除（inventoryDeleteGuard 会拦截有流水关联的库存）
    if (newSeedStockId && newSeedStockId !== originalStockId && newSeedStockCurrent > 0) {
      const newSeedCurrentAfter = newSeedStockCurrent - item.quantity;
      const newSeedAvailableAfter = Math.max(0, newSeedStockAvailable - item.quantity);
      const newSeedStatus = newSeedCurrentAfter <= 0 ? 'transferred' : 'in_stock';
      db.run(
        `UPDATE inventory_stock
         SET current_quantity = ?, available_quantity = ?, status = ?, update_time = ?
         WHERE id = ?`,
        [newSeedCurrentAfter, newSeedAvailableAfter, newSeedStatus, now, newSeedStockId]
      );
      // 写种源库存扣减的 transfer_out 流水
      const txOutId = `TX-RET-OUT-${dateStr}-${randomUUID()}`;
      db.run(
        `INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [
          txOutId,                                                // 1: id
          txOutId,                                                // 2: transaction_id
          newSeedStockInstanceId,                                 // 3: instance_id
          String(ir.stock_type || ''),                             // 4: stock_type
          'transfer_out',                                         // 5: transaction_type
          item.quantity,                                           // 6: quantity
          newSeedStockCurrent,                                    // 7: balance_before
          newSeedCurrentAfter,                                    // 8: balance_after
          targetSeedSourceId,                                     // 9: business_id
          'inventory_transfer',                                    // 10: business_type（2026-07-16 修复）
          String(ss.source_code || ''),                            // 11: business_code
          'system',                                                // 12: operator_id
          'system',                                                // 13: operator_name
          dateStr,                                                 // 14: operate_date
          `种源 ${ss.source_code} 退库 ${item.quantity}${irUnit}（扣减种源库存）`, // 15: remarks
          now,                                                     // 16: create_time
        ]
      );
    }

    totalReturned += item.quantity;
  }

  // 2026-07-14：所有 SQL 成功 → 提交事务
  db.exec('COMMIT');

  saveDatabase();

  return {
    returnedCount: totalReturned,
    newSourceRemaining: sourceRemaining,
    newSourceTotal: sourceTotal,
  };

  } catch (err) {
    // 2026-07-14：失败回滚（已 COMMIT 之外的任意步骤抛错）
    try { db.exec('ROLLBACK'); } catch (rbErr) {
      console.error('[seedSourceReturn] ROLLBACK 失败:', rbErr);
    }
    throw err;
  }
}

/**
 * 列出种源的可退库流水（含已退累计 + 剩余可退）
 */
export interface ReturnableInboundRow {
  id: string;
  sourceId: string;
  sourceCode: string;
  sourceInstanceId: string | null;
  stockType: string;
  warehouseId: string | null;
  warehouseName: string | null;
  recordDate: string;
  quantity: number;
  returnedQuantity: number;
  returnableQuantity: number;
  unit: string;
  cropName: string | null;
  cropCode: string | null;
}

export function listReturnableInboundRecords(seedSourceId: string): ReturnableInboundRow[] {
  if (!seedSourceId) return [];
  const db = getDatabase();
  const stmt = db.prepare(
    `SELECT ir.id, ir.source_module, ir.source_id, ir.source_code,
            ist.instance_id AS source_instance_id,
            ir.stock_type, ir.warehouse_id, ir.warehouse_name,
            ir.record_date, ir.quantity, COALESCE(ir.returned_quantity, 0) AS returned_quantity,
            ir.unit, ir.crop_name, ir.crop_code,
            -- 2026-07-16 修复：JOIN 种源表取剩余量，避免弹窗可退量与种源实际可用不一致
            ss.remaining_quantity AS source_remaining
     FROM inventory_inbound_records ir
     LEFT JOIN inventory_stock ist ON ir.source_id = ist.id
     LEFT JOIN seed_sources ss ON ss.id = ir.business_id
     WHERE ir.source_module = 'inventory'
       AND ir.business_id = ?
       AND ir.record_type = 'inbound'
       AND COALESCE(ir.returned_quantity, 0) < ir.quantity
     ORDER BY ir.record_date DESC, ir.id DESC`
  );
  stmt.bind([seedSourceId]);
  const rows: ReturnableInboundRow[] = [];
  while (stmt.step()) {
    const r = stmt.getAsObject() as Record<string, unknown>;
    const quantity = Number(r.quantity || 0);
    const returned = Number(r.returned_quantity || 0);
    const sourceRemaining = Number(r.source_remaining ?? quantity);  // fallback: 无值时用 quantity
    // 2026-07-16 修复：可退量取 MIN(入库未退量, 种源剩余量) — 防止种源剩余<入库未退时仍显示可退全部入库量
    const inboundReturnable = quantity - returned;
    const returnableQuantity = Math.max(0, Math.min(inboundReturnable, sourceRemaining));
    rows.push({
      id: String(r.id || ''),
      sourceId: String(r.source_id || ''),
      sourceCode: String(r.source_code || ''),
      sourceInstanceId: r.source_instance_id ? String(r.source_instance_id) : null,
      stockType: String(r.stock_type || ''),
      warehouseId: r.warehouse_id ? String(r.warehouse_id) : null,
      warehouseName: r.warehouse_name ? String(r.warehouse_name) : null,
      recordDate: String(r.record_date || ''),
      quantity,
      returnedQuantity: returned,
      returnableQuantity,
      unit: String(r.unit || ''),
      cropName: r.crop_name ? String(r.crop_name) : null,
      cropCode: r.crop_code ? String(r.crop_code) : null,
    });
  }
  stmt.free();
  return rows;
}