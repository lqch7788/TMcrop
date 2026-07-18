/**
 * 入库记录冲销服务（2026-07-18）
 *
 * - 事务包裹 + 3 表审计
 * - inventory_transaction 用真实字段：instance_id / transaction_id / business_id / balance_before / balance_after / operate_date
 * - 写 flow_log 失败不影响主流程
 * - returnable=0 短路 throw
 */

import { getDatabase, saveDatabase } from '../db';

export interface ReverseInboundInput {
  inboundRecordId: string;
  reason: string;
}

export function reverseInboundRecord(
  seedSourceId: string,
  payload: ReverseInboundInput
): void {
  const db = getDatabase();
  const nowISO = new Date().toISOString();

  db.run('BEGIN IMMEDIATE');
  try {
    // 1. 读目标 inbound_record
    const recordRow = db.prepare(`SELECT * FROM inventory_inbound_records WHERE id = ? AND business_id = ?`);
    recordRow.bind([payload.inboundRecordId, seedSourceId]);
    const record: any = recordRow.step() ? recordRow.getAsObject() : null;
    recordRow.free();
    if (!record) throw new Error('入库记录不存在');
    if (record.reversed_at) throw new Error('已冲销，无法重复操作');

    // 2. 读种源
    const stockRow = db.prepare(`SELECT * FROM seed_sources WHERE id = ?`);
    stockRow.bind([seedSourceId]);
    const stock: any = stockRow.step() ? stockRow.getAsObject() : null;
    stockRow.free();
    if (!stock) throw new Error('种源不存在');
    if (stock.status !== 'active') throw new Error('种源状态非 active，无法冲销');

    // 3. 计算可冲销数量（已退完短路）
    const returnable = record.quantity - (record.returned_quantity || 0);
    if (returnable <= 0) {
      throw new Error('已全部退完，无需冲销');
    }
    if (stock.remaining_quantity < returnable) {
      throw new Error(`可用数量不足（${stock.remaining_quantity} < ${returnable}）`);
    }

    const balanceBefore = stock.remaining_quantity;
    const balanceAfter = balanceBefore - returnable;

    // 4. 标记入库记录为已冲销
    db.run(`UPDATE inventory_inbound_records SET reversed_at = ?, reversed_by = ?, reverse_reason = ? WHERE id = ?`,
      [nowISO, 'system', payload.reason, payload.inboundRecordId]);

    // 5. 扣减种源库存
    db.run(`UPDATE seed_sources SET quantity = quantity - ?, remaining_quantity = remaining_quantity - ? WHERE id = ?`,
      [returnable, returnable, seedSourceId]);

    // 6. 写 inventory_transaction（真实字段 + operator_name + remarks 审计完整性）
    const txId = `TXN-REV-${Date.now()}`;
    db.run(`
      INSERT INTO inventory_transaction (
        id, transaction_id, instance_id, stock_type,
        transaction_type, quantity, balance_before, balance_after,
        business_id, business_type, business_code,
        operator_id, operator_name, operate_date, create_time, remarks
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      txId, txId, seedSourceId, 'seed',
      'reverse_inbound', -returnable, balanceBefore, balanceAfter,
      payload.inboundRecordId, 'inbound_record', payload.inboundRecordId,
      'system', 'system', nowISO, nowISO, payload.reason,
    ]);

    // 7. 写 material_flow_log（try/catch，不影响主流程）
    try {
      // 动态 require 避免循环依赖
      const { writeFlowLog } = require('./flowLogService');
      writeFlowLog({
        flow_type: 'correction',
        crop_name: stock.crop_name,
        source_id: seedSourceId,
        source_quantity: -returnable,
        source_unit: record.unit,
        ref_id: payload.inboundRecordId,
        business_code: payload.inboundRecordId,
        created_by: 'system',
      });
    } catch (e: any) {
      console.warn('[reverseInboundRecord] writeFlowLog failed:', e.message);
    }

    // 8. 写 inbound_edit_log 审计
    db.run(`
      INSERT INTO inbound_edit_log (inbound_id, action, before_quantity, after_quantity, edited_by, edited_by_name, reason, created_at)
      VALUES (?, 'reverse', ?, 0, ?, ?, ?, ?)
    `, [payload.inboundRecordId, record.quantity, 'system', 'system', payload.reason, nowISO]);

    db.run('COMMIT');
    saveDatabase();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}