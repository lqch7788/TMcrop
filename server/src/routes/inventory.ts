/**
 * 库存 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/**
 * 获取所有库存记录
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, stock_type, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM inventory WHERE 1=1';
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (stock_type) {
      sql += ' AND stock_type = ?';
      params.push(stock_type);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY create_time DESC';

    // 获取总数 - 使用 db.exec() 获取结果
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.exec(countSql, params);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? Number(countResult[0].values[0][0]) || 0
      : 0;

    // 分页 - 使用参数化查询防止SQL注入
    const offset = (Number(page) - 1) * Number(limit);
    const limitValue = Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(limitValue, offset);

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const items: any[] = [];
    while (stmt.step()) {
      items.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({
      success: true,
      data: items,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit)
      }
    });
  } catch (error) {
    console.error('获取库存记录失败:', error);
    res.status(500).json({
      success: false,
      error: '获取库存记录失败'
    });
  }
});

/**
 * 按作物名称聚合查询库存（多形态搜索）
 */
router.get('/aggregate/by-crop', (req: Request, res: Response) => {
  try {
    const { crop_name } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM inventory WHERE 1=1';
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    const results = db.exec(sql);
    let items: any[] = [];

    if (results.length > 0) {
      const { columns, values } = results[0];
      items = values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }

    // 按 stock_type 分组
    const grouped = {
      seed: items.filter((item: any) => item.stock_type === 'seed'),
      seedling: items.filter((item: any) => item.stock_type === 'seedling'),
      product: items.filter((item: any) => item.stock_type === 'product')
    };

    // 计算各形态总数量
    const totalQuantity = {
      seed: grouped.seed.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
      seedling: grouped.seedling.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0),
      product: grouped.product.reduce((sum: number, item: any) => sum + (item.quantity || 0), 0)
    };

    res.json({
      success: true,
      data: {
        crop_name: crop_name || '',
        seed: grouped.seed,
        seedling: grouped.seedling,
        product: grouped.product,
        total: items.length,
        totalQuantity
      }
    });
  } catch (error) {
    console.error('聚合查询失败:', error);
    res.status(500).json({
      success: false,
      error: '聚合查询失败'
    });
  }
});

// 批量操作路由必须在 /:id 之前定义，否则 /batch 会被当作 :id 参数

/**
 * 批量获取库存记录
 * GET /api/inventory/batch?ids=id1,id2,id3
 */
router.get('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }

    const idArray = ids.split(',').filter(id => id.trim() !== '');
    if (idArray.length === 0) {
      return res.json({ success: true, data: [] });
    }

    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    const sql = `SELECT * FROM inventory WHERE id IN (${placeholders})`;

    const results = db.exec(sql);
    let items: any[] = [];

    if (results.length > 0) {
      const { columns, values } = results[0];
      items = values.map((row: any[]) => {
        const obj: any = {};
        columns.forEach((col: string, i: number) => {
          obj[col] = row[i];
        });
        return obj;
      });
    }

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量获取库存记录失败' });
  }
});

/**
 * 批量更新库存记录
 * PUT /api/inventory/batch
 */
router.put('/batch', (req: Request, res: Response) => {
  try {
    const { ids, updates } = req.body;

    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 ids 参数或 ids 不是有效数组' });
    }

    if (!updates || typeof updates !== 'object') {
      return res.status(400).json({ success: false, error: '缺少 updates 参数或 updates 不是有效对象' });
    }

    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now);

    const placeholders = ids.map(() => '?').join(',');
    db.run(`UPDATE inventory SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新库存记录失败' });
  }
});

/**
 * 批量删除库存记录
 * DELETE /api/inventory/batch
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }
    const idArray = ids.split(',').filter(id => id.trim() !== '');
    if (idArray.length === 0) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }
    const db = getDatabase();
    const placeholders = idArray.map(() => '?').join(',');
    db.run(`DELETE FROM inventory WHERE id IN (${placeholders})`, idArray);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除库存记录失败' });
  }
});

/**
 * 根据ID获取库存详情
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory WHERE id = ?');
    stmt.bind([id]);
    const item = stmt.getAsObject();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({
        success: false,
        error: '库存记录不存在'
      });
    }

    res.json({
      success: true,
      data: item
    });
  } catch (error) {
    console.error('获取库存详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取库存详情失败'
    });
  }
});

/**
 * 创建库存记录
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id,
      product_code,
      crop_name,
      variety,
      stock_type = 'product',
      quantity = 0,
      unit,
      grade,
      warehouse_id,
      warehouse_name,
      storage_location,
      harvest_date,
      batch_code,
      greenhouse_name,
      planting_mode,
      production_plan_code,
      expiration_date,
      status = 'active'
    } = req.body;

    const newId = id || `INV${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inventory
      (id, product_code, crop_name, variety, stock_type, quantity, unit, grade,
       warehouse_id, warehouse_name, storage_location, harvest_date, storage_date,
       batch_code, greenhouse_name, planting_mode, production_plan_code, expiration_date,
       status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, product_code, crop_name, variety, stock_type, quantity, unit, grade,
      warehouse_id, warehouse_name, storage_location, harvest_date, now,
      batch_code, greenhouse_name, planting_mode, production_plan_code, expiration_date,
      status, now, now
    ]);

    saveDatabase();

    res.status(201).json({
      success: true,
      data: { id: newId }
    });
  } catch (error) {
    console.error('创建库存记录失败:', error);
    res.status(500).json({
      success: false,
      error: '创建库存记录失败'
    });
  }
});

/**
 * 更新库存记录
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 允许更新的字段白名单
    const allowedFields = [
      'product_code', 'crop_name', 'variety', 'stock_type', 'quantity', 'unit', 'grade',
      'warehouse_id', 'warehouse_name', 'storage_location', 'harvest_date', 'storage_date',
      'batch_code', 'greenhouse_name', 'planting_mode', 'production_plan_code',
      'expiration_date', 'status', 'alert_settings', 'inbound_records', 'outbound_records'
    ];

    const fields: string[] = [];
    const values: any[] = [];

    for (const key of Object.keys(updates)) {
      if (key !== 'id' && allowedFields.includes(key)) {
        fields.push(`${key} = ?`);
        values.push(updates[key]);
      }
    }

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段'
      });
    }

    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    const db = getDatabase();
    db.run(`UPDATE inventory SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('更新库存记录失败:', error);
    res.status(500).json({
      success: false,
      error: '更新库存记录失败'
    });
  }
});

/**
 * 删除库存记录
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM inventory WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('删除库存记录失败:', error);
    res.status(500).json({
      success: false,
      error: '删除库存记录失败'
    });
  }
});

export default router;
