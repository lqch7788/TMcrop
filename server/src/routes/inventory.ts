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
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM inventory WHERE 1=1';
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY create_time DESC';

    // 获取总数
    const countResult = db.exec(sql.replace('SELECT *', 'SELECT COUNT(*) as total'));
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? countResult[0].values[0][0] as number
      : 0;

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

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
      quantity = 0,
      unit,
      grade,
      warehouse_name,
      storage_location,
      harvest_date,
      batch_code,
      greenhouse_name,
      planting_mode,
      status = 'active'
    } = req.body;

    const newId = id || `INV${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inventory
      (id, product_code, crop_name, variety, quantity, unit, grade,
       warehouse_name, storage_location, harvest_date, storage_date,
       batch_code, greenhouse_name, planting_mode, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, product_code, crop_name, variety, quantity, unit, grade,
      warehouse_name, storage_location, harvest_date, now,
      batch_code, greenhouse_name, planting_mode, status, now, now
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

    const db = getDatabase();

    const fields = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => `${key} = ?`)
      .join(', ');

    if (fields.length === 0) {
      return res.status(400).json({
        success: false,
        error: '没有需要更新的字段'
      });
    }

    const values = Object.keys(updates)
      .filter(key => key !== 'id')
      .map(key => updates[key]);
    values.push(now, id);

    db.run(`UPDATE inventory SET ${fields}, update_time = ? WHERE id = ?`, values);
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
