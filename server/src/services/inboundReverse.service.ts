/**
 * 入库记录冲销服务（2026-07-18）
 *
 * - 事务包裹 + 3 表审计
 * - inventory_transaction 用真实字段：instance_id / transaction_id / business_id / balance_before / balance_after / operate_date
 * - 写 flow_log 失败不影响主流程
 * - returnable=0 短路 throw
 */

import { getDatabase, saveDatabase } from '../db';
import { writeFlowLog } from './flowLogService';

export interface ReverseInboundInput {
  inboundRecordId: string;
  reason: string;
  // 2026-07-19 P0-2：操作员透传（替代硬编码 'system'）
  operatorId?: string;
  operatorName?: string;
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
      [nowISO, payload.operatorId || 'system', payload.reason, payload.inboundRecordId]);

    // 5. 扣减种源库存
    db.run(`UPDATE seed_sources SET quantity = quantity - ?, remaining_quantity = remaining_quantity - ? WHERE id = ?`,
      [returnable, returnable, seedSourceId]);

    // 5b. 2026-10-16：种植留种回流凭证的级联撤销（配套「入库区凭证↔回流记录配对去重」）——
    //    一次留种回流同时写入库凭证（source_type='planting_self_kept'）与回流记录
    //    （crop_circulation_records PROPAGATION）。入库区配对去重后回流记录行不再单独显示，
    //    其撤销语义合并到本凭证的「冲销」，因此冲销凭证必须同步回流记录侧账目：
    //    标记撤销 + reflow_count 回退（合并入既有种源时）+ 种植端采收记录同步标记。
    //    ⚠️ 不重复扣库存、不重复写反向流水/流转日志（本函数 5/6/7 步已覆盖同量反向），
    //       仅做回流记录侧对齐（与 revokeCirculationRecord 的第 4/5(计数)/8/9 步等价）。
    if (record.source_type === 'planting_self_kept') {
      const circStmt = db.prepare(`
        SELECT * FROM crop_circulation_records
        WHERE new_source_id = ? AND circulation_type = 'PROPAGATION'
          AND quantity = ? AND circulation_date = ? AND is_revoked = 0
        ORDER BY created_at ASC LIMIT 1
      `);
      circStmt.bind([seedSourceId, record.quantity, record.record_date]);
      const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
      circStmt.free();
      if (circ) {
        // WHERE 加 is_revoked=0：并发下已被撤销则命中 0 行，跳过即可（无需抛错——该记录已处于目标状态）
        db.run(`
          UPDATE crop_circulation_records
          SET is_revoked = 1, revoked_at = ?, revoked_by = ?, notes = ?
          WHERE id = ? AND is_revoked = 0
        `, [nowISO, payload.operatorId || 'system', `[REVOKE] ${payload.reason}`, circ.id]);
        // 合并入既有种源的回流需回退合并计数（新建种源无计数语义，与 revokeCirculationRecord 一致）
        if (circ.merge_action === 'merge_into_existing') {
          db.run(`UPDATE seed_sources SET reflow_count = MAX(0, reflow_count - 1) WHERE id = ?`, [seedSourceId]);
        }
        // 审计：回流编辑日志（与 revokeCirculationRecord 写同一张表，入库审计 Tab 可见）
        db.run(`
          INSERT INTO circulation_edit_log
            (circulation_id, action, before_quantity, after_quantity, edited_by, edited_by_name, reason, created_at)
          VALUES (?, 'reverse', ?, 0, ?, ?, ?, ?)
        `, [circ.id, Number(circ.quantity || 0), payload.operatorId || 'system', payload.operatorName || 'system', payload.reason, nowISO]);
        // 种植端同步标记（与 revokeCirculationRecord 第 9 步一致；老库可能缺列，不影响主流程）
        try {
          db.run(`
            UPDATE planting_harvest_records
            SET circulation_revoked_at = ?, circulation_revoked_by = ?, circulation_revoke_reason = ?
            WHERE circulation_record_id = ?
          `, [nowISO, payload.operatorId || 'system', payload.reason, circ.id]);
        } catch (e: any) {
          console.warn('[reverseInboundRecord] update planting_harvest_records failed:', e.message);
        }
      } else {
        console.warn(`[reverseInboundRecord] 未找到与凭证 ${payload.inboundRecordId} 配对的未撤销回流记录（数量 ${record.quantity} / 日期 ${record.record_date}），仅冲销凭证。`);
      }
    }

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
      payload.operatorId || 'system', payload.operatorName || 'system', nowISO, nowISO, payload.reason,
    ]);

    // 7. 写 material_flow_log（try/catch，不影响主流程）
    try {
      writeFlowLog({
        flow_type: 'correction',
        crop_name: stock.crop_name,
        source_type: 'inbound_record',
        source_id: payload.inboundRecordId,
        source_quantity: -returnable,
        source_unit: record.unit,
        target_type: 'seed_source',
        target_id: seedSourceId,
        target_code: stock.source_code || seedSourceId,
        target_quantity: -returnable,
        target_unit: record.unit,
        business_id: payload.inboundRecordId,
        business_code: payload.inboundRecordId,
        created_by: payload.operatorId || 'system',
      });
    } catch (e: any) {
      console.warn('[reverseInboundRecord] writeFlowLog failed:', e.message);
    }

    // 8. 写 inbound_edit_log 审计
    db.run(`
      INSERT INTO inbound_edit_log (inbound_id, action, before_quantity, after_quantity, edited_by, edited_by_name, reason, created_at)
      VALUES (?, 'reverse', ?, 0, ?, ?, ?, ?)
    `, [payload.inboundRecordId, record.quantity, payload.operatorId || 'system', payload.operatorName || 'system', payload.reason, nowISO]);

    db.run('COMMIT');
    saveDatabase();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}