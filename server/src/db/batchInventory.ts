/**
 * 批次库存数据库操作（V14.0 FEFO 先进先出）
 * 每个入库物料行 = 一条批次库存记录
 * material_code + batch_no 复合唯一键，入库时 upsert，出库时扣减 remaining_quantity
 */

import { getDatabase, saveDatabase } from './index';

export interface BatchInventoryItem {
  id?: string;
  material_code: string;
  material_name?: string;
  batch_no: string;
  production_date?: string;
  expiry_date?: string;
  unit?: string;
  total_quantity: number;
  remaining_quantity: number;
  inbound_record_id?: number;
  create_time?: string;
  update_time?: string;
}

/** 入库时同步：为每条物料明细 upsert 到 batch_inventory */
export function upsertBatchInventory(materials: Array<{
  code?: string;
  name?: string;
  batchNo?: string;
  productionDate?: string;
  expiryDate?: string;
  unit?: string;
  quantity?: number;
}>, inboundRecordId: number): void {
  const db = getDatabase();
  // sql.js 不支持 ON CONFLICT，用 SELECT(查重) + INSERT/UPDATE 手动 upsert

  const checkStmt = db.prepare('SELECT id, total_quantity, remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?');

  for (const m of materials) {
    const code = (m.code || '').trim();
    const batchNo = (m.batchNo || '').trim() || `DEFAULT-${code}-${Date.now()}`;
    const name = m.name || '';
    const prodDate = m.productionDate || null;
    const expiryDate = m.expiryDate || null;
    const unit = m.unit || '';
    const qty = m.quantity || 0;
    if (!code || qty <= 0) continue;

    // 查是否已有该 material_code + batch_no 的记录
    checkStmt.bind([code, batchNo]);
    const exists = checkStmt.step();
    if (exists) {
      const row = checkStmt.getAsObject() as any;
      const newTotal = (row.total_quantity as number) + qty;
      const newRemain = (row.remaining_quantity as number) + qty;
      db.run(
        `UPDATE batch_inventory SET total_quantity = ?, remaining_quantity = ?, update_time = datetime('now','localtime') WHERE id = ?`,
        [newTotal, newRemain, row.id as string]
      );
      checkStmt.reset();
    } else {
      checkStmt.reset();
      const id = `bi-${code}-${batchNo}-${Date.now()}`;
      db.run(
        `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, inbound_record_id)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, code, name, batchNo, prodDate, expiryDate, unit, qty, qty, inboundRecordId]
      );
    }
  }
  checkStmt.free();
}

/** FEFO 分配：按过期日期升序返回分配方案 */
export function fefoAllocate(
  materialCode: string,
  requestedQuantity: number
): { allocations: Array<{ batchNo: string; expiryDate: string; quantity: number; unit: string }>; fulfilled: number } {
  const db = getDatabase();
  const results = db.exec(
    `SELECT batch_no, expiry_date, remaining_quantity, unit
     FROM batch_inventory
     WHERE material_code = ? AND remaining_quantity > 0
     ORDER BY expiry_date ASC NULLS LAST, create_time ASC`,
    [materialCode]
  );

  const allocations: Array<{ batchNo: string; expiryDate: string; quantity: number; unit: string }> = [];
  let remaining = requestedQuantity;

  if (results.length > 0) {
    for (const row of results[0].values) {
      if (remaining <= 0) break;
      const batchNo = row[0] as string;
      const expiryDate = row[1] as string;
      const avail = row[2] as number;
      const unit = row[3] as string || '';
      const take = Math.min(avail, remaining);
      allocations.push({ batchNo, expiryDate: expiryDate || '', quantity: take, unit });
      remaining -= take;
    }
  }

  return { allocations, fulfilled: requestedQuantity - remaining };
}

/** 出库时扣减批次库存 */
export function deductBatchInventory(
  allocations: Array<{ materialCode: string; batchNo: string; quantity: number }>
): void {
  const db = getDatabase();
  for (const alloc of allocations) {
    db.run(
      `UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, update_time = datetime('now','localtime')
       WHERE material_code = ? AND batch_no = ? AND remaining_quantity >= ?`,
      [alloc.quantity, alloc.materialCode, alloc.batchNo, alloc.quantity]
    );
  }
  saveDatabase();
}

/** 退料时恢复批次库存 */
export function restoreBatchInventory(
  returns: Array<{ materialCode: string; batchNo: string; quantity: number }>
): void {
  const db = getDatabase();
  for (const ret of returns) {
    const check = db.exec(
      `SELECT id FROM batch_inventory WHERE material_code = ? AND batch_no = ?`,
      [ret.materialCode, ret.batchNo]
    );
    if (check.length > 0 && check[0].values.length > 0) {
      db.run(
        `UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = datetime('now','localtime')
         WHERE material_code = ? AND batch_no = ?`,
        [ret.quantity, ret.materialCode, ret.batchNo]
      );
    }
  }
  saveDatabase();
}

/** 获取某物料所有批次库存（带剩余量） */
export function getBatchStock(materialCode: string): BatchInventoryItem[] {
  const db = getDatabase();
  const results = db.exec(
    `SELECT * FROM batch_inventory WHERE material_code = ? ORDER BY expiry_date ASC NULLS LAST`,
    [materialCode]
  );
  if (results.length === 0) return [];
  const { columns, values } = results[0];
  return values.map((row: any[]) => {
    const obj: any = {};
    columns.forEach((col: string, i: number) => { obj[col] = row[i]; });
    return obj as BatchInventoryItem;
  });
}
