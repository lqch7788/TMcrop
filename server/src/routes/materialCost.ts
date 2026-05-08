/**
 * 成本管理 API 路由
 * 处理物料成本和能源成本的 CRUD 操作
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

// 成本类型映射（中文 -> 英文，用于数据字典配置）
const COST_TYPE_MAP: Record<string, string> = {
  '肥料': 'fertilizer',
  '农药': 'pesticide',
  '种子种苗': 'seed',
  '基质农膜': 'film',
  '水电费': 'utility',
  '电费': 'electricity',
  '水费': 'water',
  '燃气费': 'gas',
  '维修费': 'maintenance',
  '其他': 'other',
};

// 标准化成本类型
function normalizeCostType(costType?: string): string {
  if (!costType) return 'other';
  return COST_TYPE_MAP[costType] || costType;
}

// 获取成本类型标签
function getCostTypeLabel(costType: string): string {
  const labelMap: Record<string, string> = {
    'fertilizer': '肥料',
    'pesticide': '农药',
    'seed': '种子种苗',
    'film': '基质农膜',
    'utility': '水电费',
    'electricity': '电费',
    'water': '水费',
    'gas': '燃气费',
    'maintenance': '维修费',
    'other': '其他',
  };
  return labelMap[costType] || costType;
}

// ========== 物料成本 API ==========

/**
 * 获取物料成本列表
 * GET /api/material-costs
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { cost_type, batch_code, greenhouse_name, crop_name, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM material_costs WHERE 1=1';
    const params: any[] = [];

    if (cost_type) {
      sql += ' AND cost_type = ?';
      params.push(cost_type);
    }
    if (batch_code) {
      sql += ' AND batch_code LIKE ?';
      params.push(`%${batch_code}%`);
    }
    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }
    if (crop_name) {
      sql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }
    if (start_date) {
      sql += ' AND cost_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND cost_date <= ?';
      params.push(end_date);
    }

    const countSql = sql;
    sql += ' ORDER BY cost_date DESC';

    const total = execCount(db, countSql, params);
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      costTypeLabel: getCostTypeLabel(item.cost_type || 'other'),
    }));

    res.json({
      success: true,
      data: itemsWithLabels,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取物料成本失败:', error);
    res.status(500).json({ success: false, error: '获取物料成本失败' });
  }
});

/**
 * 获取物料成本详情
 * GET /api/material-costs/:id
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_costs WHERE id = ?');
    stmt.bind([id]);
    let item: any = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '物料成本不存在' });
    }

    item.costTypeLabel = getCostTypeLabel(item.cost_type || 'other');
    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取物料成本详情失败' });
  }
});

/**
 * 创建物料成本
 * POST /api/material-costs
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const {
      id, cost_code, cost_type, cost_name, category,
      batch_id, batch_code, greenhouse_id, greenhouse_name, crop_name,
      material_name, material_type, unit, quantity, unit_price,
      total_amount, cost_date, supplier_id, supplier_name, remarks, create_by
    } = req.body;

    const newId = id || `MC${Date.now()}`;
    const now = new Date().toISOString();

    // 自动计算总价
    const calculatedTotal = total_amount || (quantity * unit_price);

    const db = getDatabase();
    db.run(`
      INSERT INTO material_costs (
        id, cost_code, cost_type, cost_name, category,
        batch_id, batch_code, greenhouse_id, greenhouse_name, crop_name,
        material_name, material_type, unit, quantity, unit_price,
        total_amount, cost_date, supplier_id, supplier_name, remarks, create_by,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, cost_code, normalizeCostType(cost_type), cost_name, category,
      batch_id, batch_code, greenhouse_id, greenhouse_name, crop_name,
      material_name, material_type, unit, quantity || 0, unit_price || 0,
      calculatedTotal, cost_date, supplier_id, supplier_name, remarks, create_by,
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建物料成本失败:', error);
    res.status(500).json({ success: false, error: '创建物料成本失败' });
  }
});

/**
 * 更新物料成本
 * PUT /api/material-costs/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    // 标准化成本类型
    if (updates.cost_type) {
      updates.cost_type = normalizeCostType(updates.cost_type);
    }

    // 自动计算总价
    if (updates.quantity && updates.unit_price && !updates.total_amount) {
      updates.total_amount = updates.quantity * updates.unit_price;
    }

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    const db = getDatabase();
    db.run(`UPDATE material_costs SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新物料成本失败' });
  }
});

/**
 * 删除物料成本
 * DELETE /api/material-costs/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM material_costs WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除物料成本失败' });
  }
});

// ========== 能源成本 API ==========

/**
 * 获取能源成本列表
 * GET /api/energy-costs
 */
router.get('/energy', (req: Request, res: Response) => {
  try {
    const { cost_type, greenhouse_name, batch_code, start_date, end_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM energy_costs WHERE 1=1';
    const params: any[] = [];

    if (cost_type) {
      sql += ' AND cost_type = ?';
      params.push(cost_type);
    }
    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }
    if (batch_code) {
      sql += ' AND batch_code LIKE ?';
      params.push(`%${batch_code}%`);
    }
    if (start_date) {
      sql += ' AND cost_date >= ?';
      params.push(start_date);
    }
    if (end_date) {
      sql += ' AND cost_date <= ?';
      params.push(end_date);
    }

    const countSql = sql;
    sql += ' ORDER BY cost_date DESC';

    const total = execCount(db, countSql, params);
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);
    const itemsWithLabels = items.map((item: any) => ({
      ...item,
      costTypeLabel: getCostTypeLabel(item.cost_type || 'other'),
    }));

    res.json({
      success: true,
      data: itemsWithLabels,
      meta: { total, page: Number(page), limit: Number(limit) }
    });
  } catch (error) {
    console.error('获取能源成本失败:', error);
    res.status(500).json({ success: false, error: '获取能源成本失败' });
  }
});

/**
 * 创建能源成本
 * POST /api/energy-costs
 */
router.post('/energy', (req: Request, res: Response) => {
  try {
    const {
      id, cost_code, cost_type, greenhouse_id, greenhouse_name,
      batch_id, batch_code, quantity, unit, unit_price,
      total_amount, cost_date, meter_start, meter_end,
      remarks, create_by, crop_name, supplier_id, supplier_name
    } = req.body;

    const newId = id || `EC${Date.now()}`;
    const now = new Date().toISOString();

    const calculatedTotal = total_amount || (quantity * unit_price);

    const db = getDatabase();
    db.run(`
      INSERT INTO energy_costs (
        id, cost_code, cost_type, greenhouse_id, greenhouse_name,
        batch_id, batch_code, quantity, unit, unit_price,
        total_amount, cost_date, meter_start, meter_end,
        remarks, create_by, crop_name, supplier_id, supplier_name,
        create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, cost_code, normalizeCostType(cost_type), greenhouse_id, greenhouse_name,
      batch_id, batch_code, quantity || 0, unit, unit_price || 0,
      calculatedTotal, cost_date, meter_start || 0, meter_end || 0,
      remarks, create_by, crop_name, supplier_id, supplier_name,
      now, now
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建能源成本失败:', error);
    res.status(500).json({ success: false, error: '创建能源成本失败' });
  }
});

/**
 * 更新能源成本
 * PUT /api/energy-costs/:id
 */
router.put('/energy/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();

    if (updates.cost_type) {
      updates.cost_type = normalizeCostType(updates.cost_type);
    }

    if (updates.quantity && updates.unit_price && !updates.total_amount) {
      updates.total_amount = updates.quantity * updates.unit_price;
    }

    const fields = Object.keys(updates).filter(k => k !== 'id').map(k => `${k} = ?`).join(', ');
    if (fields.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    const values = Object.keys(updates).filter(k => k !== 'id').map(k => updates[k]);
    values.push(now, id);

    const db = getDatabase();
    db.run(`UPDATE energy_costs SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新能源成本失败' });
  }
});

/**
 * 删除能源成本
 * DELETE /api/energy-costs/:id
 */
router.delete('/energy/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM energy_costs WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除能源成本失败' });
  }
});

export default router;
