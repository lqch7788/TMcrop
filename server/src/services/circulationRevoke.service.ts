/**
 * 留种回流撤销服务（2026-07-19）
 *
 * 设计目的：
 * - 补齐"留种回流"撤销场景（调拨入库的冲销已由 inboundReverse.service 覆盖）
 * - 撤销 = 整批作废：可逆数据回退（库存/reflowCount/账目），不可逆数据保留（plantings/planting_harvest_records 不删）
 *
 * 8 步事务：
 * 1. 读 crop_circulation_records 行 + 校验 is_revoked=0
 * 2. 读目标种源
 * 3. 校验：种源未处于"已消耗完毕"或后续被再次回流成"零"等
 * 4. UPDATE crop_circulation_records is_revoked=1, revoked_at, revoked_by, revoke_reason
 * 5. UPDATE seed_sources remaining_quantity -= quantity, reflow_count -= 1
 * 6. INSERT inventory_transaction 反向流水
 * 7. writeFlowLog 反向（try/catch）
 * 8. INSERT circulation_edit_log 审计
 * 9. UPDATE planting_harvest_records.circulation_revoked_at 同步
 *
 * 配套：种源入库审计 Tab UNION inbound_edit_log + circulation_edit_log 一并展示
 */

import { getDatabase, saveDatabase } from '../db';
import { writeFlowLog } from './flowLogService';
import { formatLocalDateISO } from '../utils/dateUtil';

export interface RevokeCirculationInput {
  circulationId: string;
  reason: string;
  // 2026-07-19 P0-2：操作员透传
  operatorId?: string;
  operatorName?: string;
}

export function revokeCirculationRecord(
  payload: RevokeCirculationInput
): void {
  const db = getDatabase();
  const nowISO = new Date().toISOString();

  // 2026-07-19 P0-3：先 BEGIN IMMEDIATE 抢占写锁，再做所有校验
  // 防止两个并发请求都通过 SELECT is_revoked=0 校验后都执行扣减（TOCTOU 竞态）
  // 同时把 SELECT 校验也包进事务，重新读取确保最新状态
  db.run('BEGIN IMMEDIATE');
  try {
    // 1. 读 circulation（事务内重新读，确保最新）
    const circStmt = db.prepare(`SELECT * FROM crop_circulation_records WHERE id = ?`);
    circStmt.bind([payload.circulationId]);
    const circ: any = circStmt.step() ? circStmt.getAsObject() : null;
    circStmt.free();
    if (!circ) throw new Error('回流记录不存在');
    if (circ.is_revoked) throw new Error('该回流已撤销，无法重复操作');
    if (circ.circulation_type !== 'PROPAGATION') {
      throw new Error('仅 PROPAGATION（留种回流）支持撤销；其他类型请走对应模块');
    }

    const targetSourceId = circ.new_source_id;
    const revokeQty = Number(circ.quantity || 0);
    const wasMerged = circ.merge_action === 'merge_into_existing';

    if (revokeQty <= 0) throw new Error('回流数量异常，无法撤销');

    // 2. 读目标种源（事务内）
    // 2026-07-19：如果目标种源物理丢失（历史数据完整性问题），不阻塞用户撤销
    // — 仍然标记回流作废 + 写 audit，但跳过库存回退 / transaction / flow_log / planting_harvest 同步
    // — 在 audit reason 中记录 warning，前端 toast 提示
    const ssStmt = db.prepare(`SELECT * FROM seed_sources WHERE id = ?`);
    ssStmt.bind([targetSourceId]);
    const seedSource: any = ssStmt.step() ? ssStmt.getAsObject() : null;
    ssStmt.free();
    const isOrphaned = !seedSource;

    let balanceBefore = 0;
    let balanceAfter = 0;
    if (seedSource) {
      balanceBefore = Number(seedSource.remaining_quantity || 0);
      balanceAfter = balanceBefore - revokeQty;
      if (balanceAfter < 0) {
        throw new Error(`种源可用数量不足（${balanceBefore} < ${revokeQty}），无法撤销`);
      }
    }

    // 4. 标记回流作废
    // P0-3：WHERE 加 is_revoked=0 条件，UPDATE 受影响行数为 0 → 抛错
    // 即使并发场景下两事务都通过 SELECT 校验，第二个 UPDATE 也只命中 0 行
    const notesValue = isOrphaned
      ? `[REVOKE-ORPHAN] 目标种源已物理删除，仅标记回流作废。${payload.reason}`
      : `[REVOKE] ${payload.reason}`;
    const updCirc = db.prepare(`
      UPDATE crop_circulation_records
      SET is_revoked = 1, revoked_at = ?, revoked_by = ?, notes = ?
      WHERE id = ? AND is_revoked = 0
    `);
    updCirc.run([nowISO, payload.operatorId || 'system', notesValue, payload.circulationId]);
    const circRows = db.getRowsModified();
    updCirc.free();
    if (circRows === 0) {
      throw new Error('该回流已被另一操作撤销，并发冲突');
    }

    // 5. 扣减种源库存 + 回退 reflowCount（仅种源存在时执行）
    if (!isOrphaned) {
      if (wasMerged) {
        db.run(`
          UPDATE seed_sources
          SET quantity = MAX(0, quantity - ?),
              remaining_quantity = MAX(0, remaining_quantity - ?),
              reflow_count = MAX(0, reflow_count - 1)
          WHERE id = ?
        `, [revokeQty, revokeQty, targetSourceId]);
      } else {
        // 新建种源被撤销：库存归零，但不删行（保留追溯链）
        db.run(`
          UPDATE seed_sources
          SET quantity = 0, remaining_quantity = 0
          WHERE id = ?
        `, [targetSourceId]);
      }
    } else {
      console.warn(`[revokeCirculationRecord] 目标种源 ${targetSourceId} 物理丢失，跳过库存回退。回流 ${payload.circulationId} 仅标记作废。`);
    }

    // 6. 写 inventory_transaction 反向流水（仅种源存在时）
    if (!isOrphaned) {
      const txId = `TXN-CIRC-REV-${Date.now()}`;
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type,
          transaction_type, quantity, balance_before, balance_after,
          business_id, business_type, business_code,
          operator_id, operator_name, operate_date, create_time, remarks
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, txId, targetSourceId, 'seed',
        'reverse_circulation', -revokeQty, balanceBefore, balanceAfter,
        payload.circulationId, 'circulation_record', payload.circulationId,
        payload.operatorId || 'system', payload.operatorName || 'system', nowISO, nowISO, payload.reason,
      ]);
    }

    // 7. 写 material_flow_log 反向（仅种源存在时，try/catch 不影响主流程）
    if (!isOrphaned) {
      try {
        writeFlowLog({
          flow_type: 'correction',
          crop_name: seedSource.crop_name,
          source_type: 'circulation_record',
          source_id: payload.circulationId,
          source_quantity: -revokeQty,
          source_unit: circ.unit,
          target_type: 'seed_source',
          target_id: targetSourceId,
          target_code: seedSource.source_code || targetSourceId,
          target_quantity: -revokeQty,
          target_unit: circ.unit,
          business_id: payload.circulationId,
          business_code: payload.circulationId,
          created_by: payload.operatorId || 'system',
        });
      } catch (e: any) {
        console.warn('[revokeCirculationRecord] writeFlowLog failed:', e.message);
      }
    }

    // 8. 写 circulation_edit_log 审计
    db.run(`
      INSERT INTO circulation_edit_log
        (circulation_id, action, before_quantity, after_quantity, edited_by, edited_by_name, reason, created_at)
      VALUES (?, 'reverse', ?, 0, ?, ?, ?, ?)
    `, [payload.circulationId, revokeQty, payload.operatorId || 'system', payload.operatorName || 'system', payload.reason, nowISO]);

    // 9. 同步 planting_harvest_records 标记（如果回流 source_module='planting'）
    //    种植端"采收与结束"记录反映"种植事实发生过"，不删 — 只标"对应回流已撤销"
    try {
      db.run(`
        UPDATE planting_harvest_records
        SET circulation_revoked_at = ?,
            circulation_revoked_by = ?,
            circulation_revoke_reason = ?
        WHERE circulation_record_id = ?
      `, [nowISO, payload.operatorId || 'system', payload.reason, payload.circulationId]);
    } catch (e: any) {
      // 老库可能缺列（fixMissingSchema 临时禁用场景），不影响主流程
      console.warn('[revokeCirculationRecord] update planting_harvest_records failed:', e.message);
    }

    db.run('COMMIT');
    saveDatabase();
  } catch (e) {
    db.run('ROLLBACK');
    throw e;
  }
}
