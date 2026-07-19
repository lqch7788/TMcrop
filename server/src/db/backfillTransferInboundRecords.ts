/**
 * 一次性回填脚本：把 inventory_stock 中 business_type='inventory_transfer' 的调拨入种源
 * 流水回填到 inventory_inbound_records 表，让 listReturnableInboundRecords / 退库功能可用
 *
 * 2026-07-19 背景：
 * - 老数据（V3.0 内部种源合并前）通过 inventoryTransfer 调拨生成的种源，inventory_stock 写了
 *   但 inventory_inbound_records 表没写（流程漏写）
 * - 退库弹窗 listReturnableInboundRecords 只查 inventory_inbound_records → 查不到 → 弹窗空白
 * - 本脚本回填缺失的 inventory_inbound_records 行
 *
 * 幂等：可重入（重复运行不会插入重复行）
 *
 * 运行：npx ts-node src/db/backfillTransferInboundRecords.ts
 */

import { getDatabase, initDatabase, saveDatabase } from './index';
import { generateInboundRecordId } from '../services/inventory.service';
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';

export async function backfillTransferInboundRecords(): Promise<{ inserted: number; skipped: number }> {
  const db = getDatabase();
  let inserted = 0;
  let skipped = 0;

  // 找出所有需要回填的 inventory_stock 记录
  // 2026-07-19 P0-9：精确化 NOT EXISTS（之前用 notes LIKE '%STK-id%' 会误判子串匹配）
  // 改用精确字段比对：source_id 指向同一 inventory_stock
  const candidates = db.prepare(`
    SELECT ist.id, ist.business_id, ist.stock_type, ist.current_quantity, ist.available_quantity,
           ist.unit, ist.crop_id, ist.crop_code, ist.crop_name, ist.variety_name,
           ist.warehouse_id, ist.warehouse_name, ist.instance_id, ist.create_time,
           ist.source_id AS original_source_id, ist.unit_price
    FROM inventory_stock ist
    WHERE ist.business_type = 'inventory_transfer'
      AND ist.current_quantity > 0
      AND NOT EXISTS (
        SELECT 1 FROM inventory_inbound_records ir
        WHERE ir.business_id = ist.business_id
          AND ir.source_module = 'inventory'
          AND ir.source_id = ist.id
      )
  `);

  const candidatesList: any[] = [];
  while (candidates.step()) candidatesList.push(candidates.getAsObject());
  candidates.free();

  // 2026-07-19：预生成所有 IR ID（顺序生成，避免在循环里 Date.now() 导致非确定性）
  // 格式：IR-YYYYMMDD-NNNN（与 generateInboundRecordId 一致）
  const dateStr = formatLocalDateYYYYMMDD();
  const irIds: string[] = [];
  for (let i = 0; i < candidatesList.length; i++) {
    irIds.push(await generateInboundRecordId(dateStr));
  }

  for (let idx = 0; idx < candidatesList.length; idx++) {
    const ist = candidatesList[idx];
    const irId = irIds[idx];  // eslint-disable-line
    const recordDate = (ist.create_time || new Date().toISOString()).slice(0, 10);
    const totalAmount = (ist.unit_price || 0) * ist.current_quantity;

    try {
      db.run(`
        INSERT INTO inventory_inbound_records (
          id, record_type, record_date, source_module, source_id, source_code,
          stock_type, source_type, warehouse_id, warehouse_name,
          crop_code, crop_name, variety_name,
          quantity, unit, unit_price, total_amount,
          business_id, notes, operator_name, create_by, create_time, update_time
        ) VALUES (?, 'inbound', ?, 'inventory', ?, ?, ?, 'inventory_transfer', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        irId,
        recordDate,
        ist.id, ist.instance_id,
        ist.stock_type || 'seed',
        ist.warehouse_id || null, ist.warehouse_name || null,
        ist.crop_code || null, ist.crop_name || null, ist.variety_name || null,
        ist.current_quantity, ist.unit || '袋',
        ist.unit_price || 0, totalAmount,
        ist.business_id,
        `[RETROACTIVE-BACKFILL] 库存调拨入种源流水（inventory_stock.id=${ist.id}）。运行 backfillTransferInboundRecords.ts 回填。`,
        'system',
        'system',
        ist.create_time || new Date().toISOString(),
        ist.create_time || new Date().toISOString(),
      ]);
      inserted++;
    } catch (e: any) {
      console.warn(`[backfill] 跳过 ${ist.id}: ${e.message}`);
      skipped++;
    }
  }

  saveDatabase();
  return { inserted, skipped };
}

/**
 * 2020-07-19：清理历史回填行（旧格式 IR-RETRO-STK...-{timestamp}-{random}）
 * → 删除这些行后，下次启动钩子会以新格式 IR-YYYYMMDD-NNNN 重新回填
 * → 幂等：重复运行不会删正常行（INB- 前缀不受影响）
 */
export function migrateBackfillIds(): { deleted: number } {
  const db = getDatabase();
  const old = db.prepare(`SELECT id FROM inventory_inbound_records WHERE id LIKE 'IR-RETRO-STK%'`);
  const oldIds: string[] = [];
  while (old.step()) oldIds.push(old.getAsObject().id);
  old.free();
  for (const id of oldIds) {
    db.run(`DELETE FROM inventory_inbound_records WHERE id = ?`, [id]);
  }
  saveDatabase();
  return { deleted: oldIds.length };
}

// 独立运行入口
if (require.main === module) {
  (async () => {
    await initDatabase();
    const { saveDatabase } = await import('./index');
    console.log('[backfillTransferInboundRecords] 开始回填...');
    const result = backfillTransferInboundRecords();
    saveDatabase();
    console.log(`[backfillTransferInboundRecords] 完成：插入 ${result.inserted} 条，跳过 ${result.skipped} 条`);
    process.exit(0);
  })();
}
