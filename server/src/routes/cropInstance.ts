/**
 * 作物实例 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 构建基础SQL和参数
    let sql = 'SELECT * FROM crop_instances WHERE 1=1';
    const params: any[] = [];

    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    // 保存原始SQL用于count查询
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

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作物实例失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_instances WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '作物实例不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取作物实例详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
            category_code, type_code, sub_code, source_origin, source_description,
            initial_quantity, current_quantity, planted_quantity, harvested_quantity, status,
            seed_entry_date, seedling_start_date, planting_date, harvest_date, source_instance_id, create_by } = req.body;

    const newId = id || `CI${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO crop_instances (id, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
        category_code, type_code, sub_code, source_origin, source_description,
        initial_quantity, current_quantity, planted_quantity, harvested_quantity, status,
        seed_entry_date, seedling_start_date, planting_date, harvest_date, source_instance_id, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, instance_code, order_id, order_code, crop_category, crop_name, crop_variety,
        category_code, type_code, sub_code, source_origin, source_description,
        initial_quantity || 0, current_quantity || 0, planted_quantity || 0, harvested_quantity || 0, status || 'seedling',
        seed_entry_date, seedling_start_date, planting_date, harvest_date, source_instance_id, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建作物实例失败:', error);
    res.status(500).json({ success: false, error: '创建作物实例失败' });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    db.run(`UPDATE crop_instances SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新作物实例失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_instances WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除作物实例失败' });
  }
});

export default router;
