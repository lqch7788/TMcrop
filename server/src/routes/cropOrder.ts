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

/**
 * 生成订单编码
 */
function generateOrderCode(type: string): string {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  const seq = String(Math.floor(Math.random() * 10000)).padStart(4, '0');
  const typePrefix = type ? type.substring(0, 2).toUpperCase() : 'OR';
  return `OR${year}${month}${day}${typePrefix}${seq}`;
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
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

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

    const stmt = db.prepare('SELECT * FROM crop_orders WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '订单不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取订单详情失败:', error);
    res.status(500).json({ success: false, error: '获取订单详情失败' });
  }
});

/**
 * 创建订单
 * POST /api/crop-orders
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const {
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
      create_by
    } = req.body;

    if (!id) {
      return res.status(400).json({ success: false, error: '订单ID不能为空' });
    }

    const now = new Date().toISOString();
    const code = order_code || generateOrderCode(order_type);

    db.run(`
      INSERT INTO crop_orders (
        id, order_code, order_type, crop_name, crop_variety,
        quantity, unit, unit_price, total_amount,
        customer_name, customer_contact, delivery_address,
        order_date, expected_delivery_date, actual_delivery_date,
        status, remarks, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
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
      now
    ]);

    saveDatabase();

    res.status(201).json({ success: true, message: '订单创建成功', id, code });
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

    res.json({ success: true, message: '订单更新成功' });
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

    // 只允许删除草稿或已取消的订单
    if (order.status !== 'draft' && order.status !== 'cancelled') {
      return res.status(400).json({ success: false, error: '只允许删除草稿或已取消的订单' });
    }

    db.run('DELETE FROM crop_orders WHERE id = ?', [id]);
    saveDatabase();

    res.json({ success: true, message: '订单删除成功' });
  } catch (error) {
    console.error('删除订单失败:', error);
    res.status(500).json({ success: false, error: '删除订单失败' });
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

export default router;
