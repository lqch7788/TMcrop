/**
 * 库存交易记录 API 路由（V3.1 出库记录主页面）
 * 2026-06-04 新增：V2.1 铁律改造（OutboundRecordsPage 从 useState 迁到 Store）
 *
 * 数据流：useInventoryTransactionStore → enhancedApiClient → /api/inventory-transactions → SQLite
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

const FIELD_MAP: Record<string, string> = {
  id: 'id',
  type: 'type',
  businessId: 'business_id',
  businessCode: 'business_code',
  instanceId: 'instance_id',
  cropId: 'crop_id',
  cropName: 'crop_name',
  varietyId: 'variety_id',
  varietyName: 'variety_name',
  warehouseId: 'warehouse_id',
  warehouseName: 'warehouse_name',
  quantity: 'quantity',
  unit: 'unit',
  unitPrice: 'unit_price',
  totalAmount: 'total_amount',
  receiver: 'receiver',
  operatorId: 'operator_id',
  operatorName: 'operator_name',
  outboundDate: 'outbound_date',
  remarks: 'remarks',
  status: 'status',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
};

function normalize(row: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    result[jsKey] = jsKey === dbKey ? row[dbKey] : row[dbKey] ?? null;
  }
  return result;
}

function denormalize(data: Record<string, unknown>): Record<string, string | number | null> {
  const result: Record<string, string | number | null> = {};
  for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
    if (data[jsKey] === undefined) continue;
    const v = data[jsKey];
    result[dbKey] = v === null ? null : (v as string | number);
  }
  return result;
}

/** 列表（分页 + 筛选） */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { type, from, to, cropName, warehouseId, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));
    const offset = (pageNum - 1) * limitNum;

    let sql = 'SELECT * FROM inventory_transactions WHERE 1=1';
    const bindings: (string | number)[] = [];
    if (type) { sql += ' AND type = ?'; bindings.push(type as string); }
    if (from) { sql += ' AND outbound_date >= ?'; bindings.push(from as string); }
    if (to) { sql += ' AND outbound_date <= ?'; bindings.push(to as string); }
    if (cropName) { sql += ' AND crop_name = ?'; bindings.push(cropName as string); }
    if (warehouseId) { sql += ' AND warehouse_id = ?'; bindings.push(warehouseId as string); }
    sql += ' ORDER BY outbound_date DESC, created_at DESC LIMIT ? OFFSET ?';
    bindings.push(limitNum, offset);

    const stmt = db.prepare(sql);
    stmt.bind(bindings);
    const rows: unknown[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();

    // count
    let countSql = 'SELECT COUNT(*) as c FROM inventory_transactions WHERE 1=1';
    const countBindings: (string | number)[] = [];
    if (type) { countSql += ' AND type = ?'; countBindings.push(type as string); }
    if (from) { countSql += ' AND outbound_date >= ?'; countBindings.push(from as string); }
    if (to) { countSql += ' AND outbound_date <= ?'; countBindings.push(to as string); }
    if (cropName) { countSql += ' AND crop_name = ?'; countBindings.push(cropName as string); }
    if (warehouseId) { countSql += ' AND warehouse_id = ?'; countBindings.push(warehouseId as string); }
    const cStmt = db.prepare(countSql);
    cStmt.bind(countBindings);
    let total = 0;
    if (cStmt.step()) total = Number(cStmt.getAsObject().c) || 0;
    cStmt.free();

    // summary: 聚合（count / totalQuantity / totalAmount）
    let sumSql = 'SELECT COALESCE(SUM(quantity),0) as total_qty, COALESCE(SUM(total_amount),0) as total_amt, COUNT(*) as cnt FROM inventory_transactions WHERE 1=1';
    const sumBindings: (string | number)[] = [];
    if (type) { sumSql += ' AND type = ?'; sumBindings.push(type as string); }
    if (from) { sumSql += ' AND outbound_date >= ?'; sumBindings.push(from as string); }
    if (to) { sumSql += ' AND outbound_date <= ?'; sumBindings.push(to as string); }
    if (cropName) { sumSql += ' AND crop_name = ?'; sumBindings.push(cropName as string); }
    if (warehouseId) { sumSql += ' AND warehouse_id = ?'; sumBindings.push(warehouseId as string); }
    const sStmt = db.prepare(sumSql);
    sStmt.bind(sumBindings);
    let summary = { totalQuantity: 0, totalAmount: 0, count: 0 };
    if (sStmt.step()) {
      const r = sStmt.getAsObject();
      summary = {
        totalQuantity: Number(r.total_qty) || 0,
        totalAmount: Number(r.total_amt) || 0,
        count: Number(r.cnt) || 0,
      };
    }
    sStmt.free();

    res.json({
      success: true,
      data: {
        rows: rows.map(r => normalize(r as Record<string, unknown>)),
        total,
        summary,
      },
      meta: { page: pageNum, limit: limitNum, totalPages: Math.ceil(total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 创建 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const id = data.id || `itx_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO inventory_transactions (
        id, type, business_id, business_code, instance_id,
        crop_id, crop_name, variety_id, variety_name,
        warehouse_id, warehouse_name,
        quantity, unit, unit_price, total_amount,
        receiver, operator_id, operator_name, outbound_date, remarks, status,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        id, data.type || 'outbound', data.business_id, data.business_code, data.instance_id,
        data.crop_id, data.crop_name, data.variety_id, data.variety_name,
        data.warehouse_id, data.warehouse_name,
        data.quantity, data.unit, data.unit_price, data.total_amount,
        data.receiver, data.operator_id, data.operator_name, data.outbound_date, data.remarks, data.status || 'completed',
        now, now,
      ],
    );
    const stmt = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?');
    stmt.bind([id]);
    if (stmt.step()) {
      const created = normalize(stmt.getAsObject());
      stmt.free();
      return res.status(201).json({ success: true, data: created });
    }
    stmt.free();
    res.status(500).json({ success: false, error: '创建后查询失败' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const data = denormalize(req.body);
    const fields: string[] = [];
    const values: (string | number | null)[] = [];
    for (const [jsKey, dbKey] of Object.entries(FIELD_MAP)) {
      if (data[jsKey] !== undefined && dbKey !== 'id') {
        fields.push(`${dbKey} = ?`);
        values.push(data[jsKey]);
      }
    }
    if (fields.length === 0) return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    fields.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.id);
    db.run(`UPDATE inventory_transactions SET ${fields.join(', ')} WHERE id = ?`, values);
    const stmt = db.prepare('SELECT * FROM inventory_transactions WHERE id = ?');
    stmt.bind([req.params.id]);
    if (stmt.step()) {
      const updated = normalize(stmt.getAsObject());
      stmt.free();
      return res.json({ success: true, data: updated });
    }
    stmt.free();
    res.status(404).json({ success: false, error: '记录不存在' });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 删除 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    db.run('DELETE FROM inventory_transactions WHERE id = ?', [req.params.id]);
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

export default router;
