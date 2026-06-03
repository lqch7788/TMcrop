/**
 * 库存 API 路由（V3.0 统一）
 *
 * 路由顺序（重要！Express 按注册顺序匹配）：
 * 1. V3.0 写入操作（inbound / outbound）
 * 2. V3.0 查询操作（list / stats / aggregate / trace / available / by-business / transaction）
 * 3. 兼容路由（GET /, GET /:id, POST /, PUT /:id, DELETE /:id）— 为作物库存等老页面
 *    提供「读 V3.0 stock / 写 V3.0 stock」的能力，老字段（grade/storage_location 等）以缺省值补全
 *
 * 所有路由都使用 inventory_stock / inventory_transaction 表（V3.0 新表）
 * 老的 legacy `inventory` 表不再读写
 */

import { Router, Request, Response } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

// ========== V3.0 写入操作（必须在 /:id 之前） ==========
router.post('/inbound', inventoryController.inbound.bind(inventoryController));
router.post('/outbound', inventoryController.outbound.bind(inventoryController));

// ========== V3.0 查询操作（必须在 /:id 之前） ==========
router.get('/list', inventoryController.getList.bind(inventoryController));
router.get('/stats', inventoryController.getStats.bind(inventoryController));
router.get('/aggregate/by-crop', inventoryController.aggregateByCrop.bind(inventoryController));
router.get('/trace/upstream/:instanceId', inventoryController.traceUpstream.bind(inventoryController));
router.get('/trace/downstream/:instanceId', inventoryController.traceDownstream.bind(inventoryController));
router.get('/available/:instanceId', inventoryController.getAvailableQuantity.bind(inventoryController));
router.get('/by-business/:businessId', inventoryController.getByBusinessId.bind(inventoryController));
router.get('/transaction/:instanceId', inventoryController.getTransactions.bind(inventoryController));

// ========== 兼容老 ProduceInventoryPage 的路由 ==========
// 这些路由从 V3 inventory_stock 表读，但字段映射到老 ProduceInventory 期望的 shape
// 缺失字段（grade / storage_location / expiration_date / harvest_date 等）以空值返回

/** GET /api/inventory 兼容老作物库存列表 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { stock_type, crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = `SELECT * FROM inventory_stock WHERE 1=1`;
    const params: any[] = [];
    if (stock_type) { sql += ` AND stock_type = ?`; params.push(stock_type); }
    if (crop_name) { sql += ` AND crop_name LIKE ?`; params.push(`%${crop_name}%`); }
    if (status) { sql += ` AND status = ?`; params.push(status); }

    // 总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.exec(countSql, params);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? Number(countResult[0].values[0][0]) || 0
      : 0;

    sql += ` ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      // 字段映射：V3 stock → 老 ProduceInventory 期望
      rows.push({
        ...r,
        product_code: r.business_code || `SKU-${r.instance_id}`,
        variety: r.variety_name || '',
        quantity: r.current_quantity || 0,
        grade: 'A',  // 老字段，V3 表没存
        storage_location: '',  // 老字段，V3 表没存
        harvest_date: r.inbound_date || '',
        storage_date: r.create_time || '',
        greenhouse_name: '',
        planting_mode: '',
        expiration_date: '',
        batch_code: r.business_code || '',
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: rows,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('[inventory] 兼容 GET / 失败:', error);
    res.status(500).json({ success: false, error: '获取库存失败' });
  }
});

/** GET /api/inventory/:id 兼容老详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory_stock WHERE id = ? OR instance_id = ? LIMIT 1');
    stmt.bind([id, id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, error: '库存不存在' });
    }
    const r = stmt.getAsObject();
    stmt.free();
    res.json({
      success: true,
      data: {
        ...r,
        product_code: r.business_code || `SKU-${r.instance_id}`,
        variety: r.variety_name || '',
        quantity: r.current_quantity || 0,
        grade: 'A',
        storage_location: '',
        harvest_date: r.inbound_date || '',
        storage_date: r.create_time || '',
        greenhouse_name: '',
        planting_mode: '',
        expiration_date: '',
        batch_code: r.business_code || '',
      },
    });
  } catch (error) {
    console.error('[inventory] 兼容 GET /:id 失败:', error);
    res.status(500).json({ success: false, error: '获取库存失败' });
  }
});

/** POST /api/inventory 兼容老新增（直接落 V3 stock） */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      product_code, crop_name, variety, stock_type = 'product',
      quantity = 0, unit, grade, warehouse_id, warehouse_name,
      storage_location, harvest_date, batch_code, greenhouse_name,
      planting_mode, production_plan_code, expiration_date, status = 'in_stock',
    } = req.body || {};

    const id = `STK-${Date.now()}`;
    const instanceId = `IPR-${new Date().toISOString().slice(0, 10).replace(/-/g, '')}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inventory_stock (
        id, instance_id, stock_type, business_id, business_code,
        crop_name, variety_name, current_quantity, frozen_quantity, available_quantity,
        unit, warehouse_id, warehouse_name, inbound_date,
        source_type, production_plan_code, status, version, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, instanceId, stock_type,
      `MANUAL-${Date.now()}`,  // business_id（手动新增）
      product_code || '',
      crop_name || '',
      variety || '',
      quantity, 0, quantity,
      unit || '公斤',
      warehouse_id || '', warehouse_name || '',
      harvest_date || now.slice(0, 10),
      'self_produced',
      production_plan_code || '',
      status, 1, now, now,
    ]);
    saveDatabase();

    res.status(201).json({ success: true, data: { id, instanceId } });
  } catch (error) {
    console.error('[inventory] 兼容 POST / 失败:', error);
    res.status(500).json({ success: false, error: '新增库存失败' });
  }
});

/** PUT /api/inventory/:id 兼容老更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const db = getDatabase();
    // 白名单（V3 stock 实际列）
    const allowed = ['crop_name', 'variety_name', 'current_quantity', 'frozen_quantity',
      'available_quantity', 'unit', 'warehouse_id', 'warehouse_name',
      'inbound_date', 'production_plan_code', 'status'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const k of Object.keys(updates)) {
      // 老字段 → V3 字段映射
      let v3Key = k;
      if (k === 'quantity') v3Key = 'current_quantity';
      if (k === 'variety') v3Key = 'variety_name';
      if (k === 'cropName') v3Key = 'crop_name';
      if (k === 'warehouseId') v3Key = 'warehouse_id';
      if (k === 'warehouseName') v3Key = 'warehouse_name';
      if (allowed.includes(v3Key)) {
        fields.push(`${v3Key} = ?`);
        values.push(updates[k]);
      }
    }
    if (fields.length === 0) {
      return res.json({ success: true, data: { id, noop: true } });
    }
    fields.push('update_time = ?', 'version = version + 1');
    values.push(new Date().toISOString(), id);
    db.run(`UPDATE inventory_stock SET ${fields.join(', ')} WHERE id = ? OR instance_id = ?`,
      [...values, id, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[inventory] 兼容 PUT /:id 失败:', error);
    res.status(500).json({ success: false, error: '更新库存失败' });
  }
});

/** DELETE /api/inventory/batch?ids=id1,id2,id3 批量删除（必须在 /:id 之前注册） */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }
    const idArray = ids.split(',').map(s => s.trim()).filter(Boolean);
    if (idArray.length === 0) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }
    const db = getDatabase();
    // 同时按 id 和 instance_id 匹配（兼容两种形态）
    const conditions = idArray.map(() => '(id = ? OR instance_id = ?)').join(' OR ');
    const params: any[] = [];
    idArray.forEach(id => params.push(id, id));
    db.run(`DELETE FROM inventory_stock WHERE ${conditions}`, params);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    console.error('[inventory] 批量 DELETE /batch 失败:', error);
    res.status(500).json({ success: false, error: '批量删除库存失败' });
  }
});

/** DELETE /api/inventory/:id 兼容老删除 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM inventory_stock WHERE id = ? OR instance_id = ?', [id, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[inventory] 兼容 DELETE /:id 失败:', error);
    res.status(500).json({ success: false, error: '删除库存失败' });
  }
});

export default router;
