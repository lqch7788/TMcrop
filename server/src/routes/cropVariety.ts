/**
 * 作物品种 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/**
 * 获取所有作物品种
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM crop_varieties ORDER BY crop_code');

    if (results.length === 0) {
      return res.json({
        success: true,
        data: [],
        meta: { total: 0 }
      });
    }

    const { columns, values } = results[0];
    const varieties = values.map((row: any[]) => {
      const obj: any = {};
      columns.forEach((col: string, i: number) => {
        obj[col] = row[i];
      });
      return obj;
    });

    res.json({
      success: true,
      data: varieties,
      meta: {
        total: varieties.length
      }
    });
  } catch (error) {
    console.error('获取作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '获取作物品种失败'
    });
  }
});

/**
 * 根据ID获取单个作物品种
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM crop_varieties WHERE id = ?');
    stmt.bind([id]);
    const variety = stmt.getAsObject();

    if (!variety || Object.keys(variety).length === 0) {
      return res.status(404).json({
        success: false,
        error: '作物品种不存在'
      });
    }

    res.json({
      success: true,
      data: variety
    });
  } catch (error) {
    console.error('获取作物品种详情失败:', error);
    res.status(500).json({
      success: false,
      error: '获取作物品种详情失败'
    });
  }
});

/**
 * 创建作物品种
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id,
      crop_code,
      category_code,
      category_name,
      type_code,
      type_name,
      variety_code,
      variety_name,
      sub_variety1_code,
      sub_variety1_name,
      detail_variety_code,
      status = 'active'
    } = req.body;

    const newId = id || `CV${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO crop_varieties
      (id, crop_code, category_code, category_name, type_code, type_name,
       variety_code, variety_name, sub_variety1_code, sub_variety1_name,
       detail_variety_code, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, crop_code, category_code, category_name, type_code, type_name,
      variety_code, variety_name, sub_variety1_code, sub_variety1_name,
      detail_variety_code, status, now, now
    ]);

    saveDatabase();

    res.status(201).json({
      success: true,
      data: { id: newId }
    });
  } catch (error) {
    console.error('创建作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '创建作物品种失败'
    });
  }
});

/**
 * 更新作物品种
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    // 构建更新语句
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

    db.run(`UPDATE crop_varieties SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('更新作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '更新作物品种失败'
    });
  }
});

/**
 * 删除作物品种
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM crop_varieties WHERE id = ?', [id]);
    saveDatabase();

    res.json({
      success: true,
      data: { id }
    });
  } catch (error) {
    console.error('删除作物品种失败:', error);
    res.status(500).json({
      success: false,
      error: '删除作物品种失败'
    });
  }
});

export default router;
