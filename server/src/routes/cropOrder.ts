/**
 * 订单 API 路由
 * 提供订单的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// ============================================
// 辅助函数
// ============================================

/**
 * 生成唯一ID
 */
function generateId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 9)}`;
}

// ============================================
// 订单基础 API
// ============================================

/**
 * 获取所有订单
 * GET /api/crop-orders
 * Query: crop_name, status, order_type, keyword, page, limit
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
      crop_name,
      status,
      order_type,
      keyword,
      page = 1,
      limit = 50
    } = req.query;

    let sql = 'SELECT * FROM crop_orders WHERE 1=1';
    const params: (string | number)[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (order_type) {
      sql += ' AND order_type = ?';
      params.push(order_type as string);
    }

    if (keyword) {
      sql += ' AND (order_code LIKE ? OR crop_name LIKE ? OR customer_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    const countSql = sql;
    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, error: '获取订单列表失败' });
  }
});

/**
 * 获取单个订单
 * GET /api/crop-orders/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 使用 queryToObjects 自动转换字段名为驼峰命名
    const items = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM crop_orders WHERE id = ?',
      [id]
    );

    if (!items || items.length === 0) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    res.json({ success: true, data: items[0] });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ success: false, error: '获取订单详情失败' });
  }
});

/**
 * 创建订单
 * POST /api/crop-orders
 * 使用事务确保订单编号唯一性和并发安全
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    let {
      id,
      order_code,
      order_type,
      crop_name,
      crop_variety,
      quantity,
      unit,
      unit_price,
      total_amount,
      customer_name,
      customer_contact,
      delivery_address,
      order_date,
      expected_delivery_date,
      actual_delivery_date,
      status,
      remarks,
      create_by,
      // 新增字段
      order_name,
      crop_category,
      planned_quantity,
      actual_quantity,
      expected_harvest_date,
      supplier_name
    } = req.body;

    // 如果没有提供id，则自动生成一个
    if (!id) {
      id = 'ORD' + Date.now();
    }

    const now = new Date().toISOString();
    const nowDate = new Date();
    let code = order_code;

    // 优先使用前端传入的订单编号（如果格式正确以DD开头）
    // 否则自动生成
    if (!code || !code.startsWith('DD')) {
      const year = nowDate.getFullYear().toString();
      const month = (nowDate.getMonth() + 1).toString().padStart(2, '0');
      const day = nowDate.getDate().toString().padStart(2, '0');
      // 格式: DD + 年月日(8位) + 4位流水号
      const dateStr = `${year}${month}${day}`;

      // 使用 BEGIN IMMEDIATE 获取写锁，确保并发安全
      db.exec("BEGIN IMMEDIATE");

      try {
        // 查询当天最大的订单编号（基于日期前缀匹配）
        const stmt = db.prepare(`
          SELECT order_code FROM crop_orders
          WHERE order_code LIKE ?
          ORDER BY order_code DESC LIMIT 1
        `);
        stmt.bind([`DD${dateStr}%`]);

        let maxSeq = 0;
        if (stmt.step()) {
          const lastCode = stmt.getAsObject().order_code as string;
          const seqStr = lastCode.slice(-4);
          maxSeq = parseInt(seqStr, 10) || 0;
        }
        stmt.free();

        const seq = maxSeq + 1;
        code = `DD${dateStr}${String(seq).padStart(4, '0')}`;

        // 提交事务
        db.exec("COMMIT");
      } catch (error) {
        db.exec("ROLLBACK");
        throw error;
      }
    }

    db.run(`
      INSERT INTO crop_orders (
        id, order_code, order_type, crop_name, crop_variety,
        quantity, unit, unit_price, total_amount,
        customer_name, customer_contact, delivery_address,
        order_date, expected_delivery_date, actual_delivery_date,
        status, remarks, create_by, create_time, update_time,
        order_name, crop_category, planned_quantity, actual_quantity, expected_harvest_date,
      supplier_name
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id,
      code,
      order_type || '',
      crop_name || '',
      crop_variety || '',
      quantity || 0,
      unit || '',
      unit_price || 0,
      total_amount || 0,
      customer_name || '',
      customer_contact || '',
      delivery_address || '',
      order_date || now.substring(0, 10),
      expected_delivery_date || '',
      actual_delivery_date || '',
      status || 'pending',
      remarks || '',
      create_by || '',
      now,
      now,
      order_name || '',
      crop_category || '',
      planned_quantity || 0,
      actual_quantity || 0,
      expected_harvest_date || '',
      supplier_name || ''
    ]);

    saveDatabase();

    // 使用 queryToObjects 查询并自动转换为驼峰命名
    const newOrders = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM crop_orders WHERE id = ?',
      [id]
    );

    res.status(201).json({ success: true, data: newOrders[0] || {} });
  } catch (error) {
    console.error('创建订单失败:', error);
    res.status(500).json({ success: false, error: '创建订单失败' });
  }
});

/**
 * 更新订单
 * PUT /api/crop-orders/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 先查询当前数据
    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);
    let order: Record<string, unknown> | null = null;
    if (stmt.step()) {
      order = stmt.getAsObject();
    }
    stmt.free();

    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    // 构建更新字段映射 (camelCase -> snake_case)
    const fieldMap: Record<string, string> = {
      orderCode: 'order_code',
      orderType: 'order_type',
      cropName: 'crop_name',
      cropVariety: 'crop_variety',
      quantity: 'quantity',
      unit: 'unit',
      unitPrice: 'unit_price',
      totalAmount: 'total_amount',
      customerName: 'customer_name',
      customerContact: 'customer_contact',
      deliveryAddress: 'delivery_address',
      orderDate: 'order_date',
      expectedDeliveryDate: 'expected_delivery_date',
      actualDeliveryDate: 'actual_delivery_date',
      status: 'status',
      remarks: 'remarks',
      // 新增字段映射
      orderName: 'order_name',
      cropCategory: 'crop_category',
      plannedQuantity: 'planned_quantity',
      actualQuantity: 'actual_quantity',
      expectedHarvestDate: 'expected_harvest_date',
      supplierName: 'supplier_name',
      createBy: 'create_by'
    };

    const updateFields: string[] = [];
    const values: (string | number | null)[] = [];

    for (const [key, value] of Object.entries(updates)) {
      if (key === 'id') continue;

      const dbField = fieldMap[key] || key;
      updateFields.push(`${dbField} = ?`);
      values.push(value as string | number | null);
    }

    if (updateFields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    updateFields.push('update_time = ?');
    values.push(now);
    values.push(id);

    db.run(`UPDATE crop_orders SET ${updateFields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

    // 查询更新后的完整数据并返回（自动 camelCase 转换）
    const updatedOrders = queryToObjects<Record<string, unknown>>(
      db,
      'SELECT * FROM crop_orders WHERE id = ?',
      [id]
    );

    res.json({
      success: true,
      message: '订单更新成功',
      data: updatedOrders.length > 0 ? updatedOrders[0] : null
    });
  } catch (error) {
    console.error('更新订单失败:', error);
    res.status(500).json({ success: false, error: '更新订单失败' });
  }
});

/**
 * 删除订单
 * DELETE /api/crop-orders/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 检查订单是否存在
    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);
    let order: Record<string, unknown> | null = null;
    if (stmt.step()) {
      order = stmt.getAsObject();
    }
    stmt.free();

    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    // 只禁止删除已完成的订单
    if (order.status === 'completed') {
      return res.status(400).json({ success: false, error: '无法删除已完成的订单' });
    }

    db.run('DELETE FROM crop_orders WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '订单删除成功' });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({ success: false, error: '删除订单失败' });
  }
});

/**
 * 批量删除订单
 * POST /api/crop-orders/batch/delete
 * Body: { ids: string[] }
 */
router.post('/batch/delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;

    if (!Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: '请提供要删除的订单ID列表' });
    }

    const db = getDatabase();
    const deletedIds: string[] = [];
    const failedIds: { id: string; reason: string }[] = [];

    // 批量查询所有订单
    const placeholders = ids.map(() => '?').join(',');
    const stmt = db.prepare(`SELECT * FROM crop_orders WHERE id IN (${placeholders})`);
    stmt.bind(ids);

    // 收集所有订单到内存
    const ordersMap = new Map<string, Record<string, unknown>>();
    while (stmt.step()) {
      const order = stmt.getAsObject();
      ordersMap.set(order.id as string, order);
    }
    stmt.free();

    // 检查每个订单
    for (const id of ids) {
      const order = ordersMap.get(id);

      if (!order) {
        failedIds.push({ id, reason: '订单不存在' });
        continue;
      }

      // 只禁止删除已完成的订单
      if (order.status === 'completed') {
        failedIds.push({ id, reason: '无法删除已完成的订单' });
        continue;
      }
    }

    // 批量删除有效的订单（非已完成状态）
    const validIds = ids.filter(id => {
      const order = ordersMap.get(id);
      return order && order.status !== 'completed';
    });

    if (validIds.length > 0) {
      const deletePlaceholders = validIds.map(() => '?').join(',');
      db.run(`DELETE FROM crop_orders WHERE id IN (${deletePlaceholders})`, validIds);
      deletedIds.push(...validIds);
    }

    saveDatabase();

    res.json({
      success: true,
      message: `成功删除 ${deletedIds.length} 个订单`,
      data: {
        deleted: deletedIds,
        failed: failedIds
      }
    });
  } catch (error) {
    console.error('批量删除订单失败:', error);
    res.status(500).json({ success: false, error: '批量删除订单失败' });
  }
});

// ============================================
// 订单统计 API
// ============================================

/**
 * 获取订单统计数据
 * GET /api/crop-orders/stats/summary
 */
router.get('/stats/summary', (req: Request, res: Response) => {
  try {
    const db = getDatabase();

    const sql = `
      SELECT
        COUNT(*) as total,
        SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
        SUM(CASE WHEN status = 'processing' THEN 1 ELSE 0 END) as processing,
        SUM(CASE WHEN status = 'shipped' THEN 1 ELSE 0 END) as shipped,
        SUM(CASE WHEN status = 'delivered' THEN 1 ELSE 0 END) as delivered,
        SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
        SUM(total_amount) as total_amount
      FROM crop_orders
    `;

    const stmt = db.prepare(sql);
    stmt.step();
    const stats = stmt.getAsObject();
    stmt.free();

    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取订单统计失败:', error);
    res.status(500).json({ success: false, error: '获取订单统计失败' });
  }
});

/**
 * 获取订单按日期范围统计
 * GET /api/crop-orders/stats/by-date-range
 * Query: start_date, end_date
 */
router.get('/stats/by-date-range', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date } = req.query;

    if (!start_date || !end_date) {
      return res.status(400).json({ success: false, error: '请提供开始日期和结束日期' });
    }

    const sql = `
      SELECT
        DATE(order_date) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as daily_amount
      FROM crop_orders
      WHERE order_date >= ? AND order_date <= ?
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `;

    const stmt = db.prepare(sql);
    stmt.bind([start_date as string, end_date as string]);

    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    res.json({ success: true, data: results });
  } catch (error) {
    console.error('获取日期范围统计失败:', error);
    res.status(500).json({ success: false, error: '获取日期范围统计失败' });
  }
});

/**
 * 获取订单按状态统计（带分页）
 * GET /api/crop-orders/stats/by-status
 * Query: status, page, limit
 */
router.get('/stats/by-status', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { status, page = 1, limit = 50 } = req.query;

    let sql = 'SELECT * FROM crop_orders';
    const params: (string | number)[] = [];

    if (status) {
      sql += ' WHERE status = ?';
      params.push(status as string);
    }

    const countSql = sql;
    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, sql, params);

    res.json({
      success: true,
      data: items,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取订单列表失败:', error);
    res.status(500).json({ success: false, error: '获取订单列表失败' });
  }
});

/**
 * 导出订单数据
 * GET /api/crop-orders/export
 * Query: format (csv|json), crop_name, status, order_type, keyword, start_date, end_date
 */
router.get('/export', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { format = 'csv', crop_name, status, order_type, keyword, start_date, end_date } = req.query;

    let sql = 'SELECT * FROM crop_orders WHERE 1=1';
    const params: (string | number)[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status as string);
    }

    if (order_type) {
      sql += ' AND order_type = ?';
      params.push(order_type as string);
    }

    if (keyword) {
      sql += ' AND (order_code LIKE ? OR crop_name LIKE ? OR customer_name LIKE ?)';
      const kw = `%${keyword}%`;
      params.push(kw, kw, kw);
    }

    if (start_date) {
      sql += ' AND order_date >= ?';
      params.push(start_date as string);
    }

    if (end_date) {
      sql += ' AND order_date <= ?';
      params.push(end_date as string);
    }

    sql += ' ORDER BY create_time DESC';

    const items = queryToObjects(db, sql, params);

    if (format === 'json') {
      // 返回 JSON 格式
      res.json({
        success: true,
        data: items,
        meta: { total: items.length, exported_at: new Date().toISOString() }
      });
    } else {
      // 返回 CSV 格式
      if (items.length === 0) {
        return res.status(404).json({ success: false, error: '没有可导出的数据' });
      }

      // CSV 表头
      const headers = [
        '订单编号', '订单类型', '作物名称', '品种', '数量', '单位',
        '单价', '总金额', '客户名称', '客户联系', '交货地址',
        '订单日期', '预计交货日期', '实际交货日期', '状态', '备注', '创建人', '创建时间'
      ];

      // CSV 字段映射
      const fields = [
        'order_code', 'order_type', 'crop_name', 'crop_variety', 'quantity', 'unit',
        'unit_price', 'total_amount', 'customer_name', 'customer_contact', 'delivery_address',
        'order_date', 'expected_delivery_date', 'actual_delivery_date', 'status', 'remarks', 'create_by', 'create_time'
      ];

      // 生成 CSV 内容
      const csvRows: string[] = [];
      csvRows.push(headers.join(','));

      for (const item of items) {
        const row = fields.map(field => {
          let value = item[field];
          // 处理特殊字符（引号、逗号）
          if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `orders_${new Date().toISOString().substring(0, 10).replace(/-/g, '')}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    }
  } catch (error) {
    console.error('导出订单失败:', error);
    res.status(500).json({ success: false, error: '导出订单失败' });
  }
});

/**
 * 导出订单统计数据
 * GET /api/crop-orders/export/stats
 * Query: start_date, end_date, format (csv|json)
 */
router.get('/export/stats', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { start_date, end_date, format = 'csv' } = req.query;

    // 默认导出最近30天的统计数据
    const endDate = end_date || new Date().toISOString().substring(0, 10);
    const startDate = start_date || new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString().substring(0, 10);

    const sql = `
      SELECT
        DATE(order_date) as date,
        COUNT(*) as order_count,
        SUM(total_amount) as daily_amount
      FROM crop_orders
      WHERE order_date >= ? AND order_date <= ?
      GROUP BY DATE(order_date)
      ORDER BY date DESC
    `;

    const stmt = db.prepare(sql);
    stmt.bind([startDate as string, endDate as string]);

    const results: Record<string, unknown>[] = [];
    while (stmt.step()) {
      results.push(stmt.getAsObject());
    }
    stmt.free();

    if (format === 'json') {
      res.json({
        success: true,
        data: results,
        meta: {
          total: results.length,
          start_date: startDate,
          end_date: endDate,
          exported_at: new Date().toISOString()
        }
      });
    } else {
      if (results.length === 0) {
        return res.status(404).json({ success: false, error: '没有可导出的数据' });
      }

      // CSV 表头
      const headers = ['日期', '订单数量', '日销售额'];
      // CSV 字段
      const fields = ['date', 'order_count', 'daily_amount'];

      // 生成 CSV 内容
      const csvRows: string[] = [];
      csvRows.push(headers.join(','));

      for (const item of results) {
        const row = fields.map(field => {
          let value = item[field];
          if (typeof value === 'string' && (value.includes(',') || value.includes('"'))) {
            value = `"${value.replace(/"/g, '""')}"`;
          }
          return value ?? '';
        });
        csvRows.push(row.join(','));
      }

      const csvContent = csvRows.join('\n');
      const filename = `order_stats_${startDate}_${endDate}.csv`;

      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
      res.send(csvContent);
    }
  } catch (error) {
    console.error('导出订单统计失败:', error);
    res.status(500).json({ success: false, error: '导出订单统计失败' });
  }
});

// ============================================
// 订单关联实例 API
// ============================================

/**
 * 关联实例到订单
 * POST /api/crop-orders/:id/link-instances
 */
router.post('/:id/link-instances', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { instanceIds } = req.body;

    if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 instanceIds 参数或 instanceIds 不是有效数组' });
    }

    const db = getDatabase();

    // 检查订单是否存在
    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);
    let order: Record<string, unknown> | null = null;
    if (stmt.step()) {
      order = stmt.getAsObject();
    }
    stmt.free();

    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    const now = new Date().toISOString();
    let linkedCount = 0;

    for (const instanceId of instanceIds) {
      // 检查实例是否已关联到其他订单
      const checkStmt = db.prepare('SELECT order_id FROM crop_instances WHERE id = ?');
      checkStmt.bind([instanceId]);
      let currentOrderId: string | null = null;
      if (checkStmt.step()) {
        currentOrderId = checkStmt.getAsObject().order_id as string;
      }
      checkStmt.free();

      if (currentOrderId && currentOrderId !== id) {
        continue; // 已关联到其他订单，跳过
      }

      // 关联实例到订单
      db.run('UPDATE crop_instances SET order_id = ?, update_time = ? WHERE id = ?', [id, now, instanceId]);
      linkedCount++;
    }

    saveDatabase();
    res.json({ success: true, data: { linked: linkedCount } });
  } catch (error) {
    console.error('关联实例失败:', error);
    res.status(500).json({ success: false, error: '关联实例失败' });
  }
});

/**
 * 从订单取消关联实例
 * POST /api/crop-orders/:id/unlink-instances
 */
router.post('/:id/unlink-instances', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { instanceIds } = req.body;

    if (!Array.isArray(instanceIds) || instanceIds.length === 0) {
      return res.status(400).json({ success: false, error: '缺少 instanceIds 参数或 instanceIds 不是有效数组' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    let unlinkedCount = 0;

    for (const instanceId of instanceIds) {
      db.run('UPDATE crop_instances SET order_id = NULL, update_time = ? WHERE id = ? AND order_id = ?', [now, instanceId, id]);
      unlinkedCount++;
    }

    saveDatabase();
    res.json({ success: true, data: { unlinked: unlinkedCount } });
  } catch (error) {
    console.error('取消关联实例失败:', error);
    res.status(500).json({ success: false, error: '取消关联实例失败' });
  }
});

/**
 * 更新订单状态
 * PUT /api/crop-orders/:id/status
 */
router.put('/:id/status', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;

    if (!status) {
      return res.status(400).json({ success: false, error: '缺少 status 参数' });
    }

    const db = getDatabase();
    const now = new Date().toISOString();

    // 检查订单是否存在
    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);
    let order: Record<string, unknown> | null = null;
    if (stmt.step()) {
      order = stmt.getAsObject();
    }
    stmt.free();

    if (!order) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    db.run('UPDATE crop_orders SET status = ?, update_time = ? WHERE id = ?', [status, now, id]);
    saveDatabase();

    res.json({ success: true, message: '订单状态已更新' });
  } catch (error) {
    console.error('更新订单状态失败:', error);
    res.status(500).json({ success: false, error: '更新订单状态失败' });
  }
});

/**
 * 重置订单数据
 * POST /api/crop-orders/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 清空现有数据
    db.run('DELETE FROM crop_orders');

    // 插入默认数据
    const defaultData = [
      {
        id: 'ORD001',
        order_code: 'DD20260501100001',
        order_type: 'sales',
        crop_name: '番茄',
        crop_variety: '红果番茄',
        quantity: 1000,
        unit: 'kg',
        unit_price: 4.0,
        total_amount: 4000,
        customer_name: '永辉超市',
        customer_contact: '13800138000',
        delivery_address: '福州市鼓楼区',
        order_date: '2026-05-01',
        expected_delivery_date: '2026-05-05',
        status: 'pending',
        remarks: '第一批订单',
        create_by: '李明辉'
      },
      {
        id: 'ORD002',
        order_code: 'DD20260502100002',
        order_type: 'sales',
        crop_name: '黄瓜',
        crop_variety: '水果黄瓜',
        quantity: 500,
        unit: 'kg',
        unit_price: 3.0,
        total_amount: 1500,
        customer_name: '沃尔玛',
        customer_contact: '13900139000',
        delivery_address: '厦门市思明区',
        order_date: '2026-05-02',
        expected_delivery_date: '2026-05-06',
        status: 'confirmed',
        remarks: '第二批订单',
        create_by: '王建国'
      }
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO crop_orders (id, order_code, order_type, crop_name, crop_variety,
          quantity, unit, unit_price, total_amount,
          customer_name, customer_contact, delivery_address,
          order_date, expected_delivery_date,
          status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        item.id,
        item.order_code,
        item.order_type,
        item.crop_name,
        item.crop_variety,
        item.quantity,
        item.unit,
        item.unit_price,
        item.total_amount,
        item.customer_name,
        item.customer_contact,
        item.delivery_address,
        item.order_date,
        item.expected_delivery_date,
        item.status,
        item.remarks,
        item.create_by,
        now,
        now
      ]);
    }

    saveDatabase();
    res.json({ success: true, message: '订单数据已重置' });
  } catch (error) {
    console.error('重置订单数据失败:', error);
    res.status(500).json({ success: false, error: '重置订单数据失败' });
  }
});

export default router;
