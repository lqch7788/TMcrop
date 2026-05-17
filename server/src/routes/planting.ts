/**
 * 种植批次 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

router.get('/', (req: Request, res: Response) => {
  try {
    const { crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 使用 SQL 别名将数据库字段映射到前端期望的字段名
    // LEFT JOIN seedlings + production_plans 获取关联生产计划（育苗→计划链路）
    let baseSql = `SELECT
      p.id,
      p.planting_code AS plantCode,
      p.source_type AS sourceType,
      p.source_id AS sourceId,
      p.source_name AS sourceCode,
      '' AS cropCode,
      p.crop_name AS cropName,
      p.crop_variety AS cropVariety,
      '' AS areaId,
      p.area_name AS areaName,
      '' AS rootName,
      p.planting_quantity AS plantingCount,
      p.planting_date AS plantingDate,
      0 AS soilPH,
      0 AS soilEC,
      0 AS transplantCount,
      '' AS transplantDate,
      FALSE AS isHarvest,
      '' AS harvestDate,
      0 AS attritionRate,
      0 AS printCount,
      '' AS traceabilityCode,
      '[]' AS pictures,
      p.greenhouse_name AS greenhouseName,
      p.planted_quantity AS plantedQuantity,
      p.survival_quantity AS survivalQuantity,
      p.survival_rate AS survivalRate,
      p.growth_status AS growthStatus,
      p.expected_harvest_date AS expectedHarvestDate,
      p.actual_harvest_date AS actualHarvestDate,
      p.harvest_quantity AS harvestQuantity,
      p.status,
      p.remarks,
      COALESCE(pp.id, '') AS productionPlanId,
      COALESCE(pp.plan_code, '') AS productionPlanCode,
      p.create_by AS createBy,
      p.create_time AS createTime,
      p.update_time AS updateTime
    FROM plantings p
    LEFT JOIN seedlings s ON p.source_id = s.id
    LEFT JOIN production_plans pp ON s.production_plan_code = pp.plan_code
    WHERE 1=1`;
    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND p.crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      baseSql += ' AND p.status = ?';
      params.push(status);
    }

    // COUNT 查询用同样的 JOIN 和 WHERE 条件
    const countSql = `SELECT COUNT(*) FROM plantings p
    LEFT JOIN seedlings s ON p.source_id = s.id
    LEFT JOIN production_plans pp ON s.production_plan_code = pp.plan_code
    WHERE 1=1` + (crop_name ? ' AND p.crop_name LIKE ?' : '') + (status ? ' AND p.status = ?' : '');

    baseSql += ' ORDER BY p.create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    // 获取数据列表
    const items = queryToObjects(db, baseSql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    console.error('获取种植记录失败:', error);
    res.status(500).json({ success: false, error: '获取种植记录失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM plantings WHERE id = ?');
    stmt.bind([id]);
    let item = null;
    if (stmt.step()) {
      item = stmt.getAsObject();
    }
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }

    res.json({ success: true, data: item });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取种植详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const { id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
            greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
            survival_quantity, survival_rate, growth_status, expected_harvest_date, status, remarks, create_by } = req.body;

    const newId = id || `PL${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO plantings (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
        greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
        survival_quantity, survival_rate, growth_status, expected_harvest_date, status, remarks, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
        greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
        survival_quantity, survival_rate, growth_status, expected_harvest_date, status || 'planted', remarks, create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建种植记录失败:', error);
    res.status(500).json({ success: false, error: '创建种植记录失败' });
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

    db.run(`UPDATE plantings SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新种植记录失败' });
  }
});

// 批量操作路由必须在 /:id 之前定义，否则 /batch 会被当作 :id 参数

/**
 * 批量获取种植记录
 * GET /api/plantings/batch?ids=id1,id2,id3
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
    const sql = `SELECT * FROM plantings WHERE id IN (${placeholders})`;
    const items = queryToObjects(db, sql, idArray);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量获取种植记录失败' });
  }
});

/**
 * 批量更新种植记录
 * PUT /api/plantings/batch
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
    db.run(`UPDATE plantings SET ${fields}, update_time = ? WHERE id IN (${placeholders})`, [...values, ...ids]);

    saveDatabase();
    res.json({ success: true, data: { ids, updated: ids.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量更新种植记录失败' });
  }
});

/**
 * 批量删除种植记录
 * DELETE /api/plantings/batch?ids=id1,id2,id3
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
    db.run(`DELETE FROM plantings WHERE id IN (${placeholders})`, idArray);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    res.status(500).json({ success: false, error: '批量删除种植记录失败' });
  }
});

/**
 * 检查种植记录是否可删除（是否被标签引用）
 * GET /api/plantings/:id/check-deletable
 */
router.get('/:id/check-deletable', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const cntResult = db.exec(
      'SELECT COUNT(*) as cnt FROM plant_labels WHERE planting_id = ? AND move_in_area_name IS NOT NULL',
      [id]
    );
    const labelCount = Number(cntResult[0]?.values[0]?.[0]) || 0;
    res.json({ success: true, data: { deletable: labelCount === 0, labelCount } });
  } catch (error) {
    res.status(500).json({ success: false, error: '检查删除失败' });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM plantings WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除种植记录失败' });
  }
});

// 采收路由 - 更新种植记录的采收状态和采收数量
router.post('/:id/harvest', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { harvest_quantity, harvest_date } = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 检查种植记录是否存在
    const stmt = db.prepare('SELECT id FROM plantings WHERE id = ?');
    stmt.bind([id]);
    const exists = stmt.step();
    stmt.free();

    if (!exists) {
      return res.status(404).json({ success: false, error: '种植记录不存在' });
    }

    // 更新采收状态和采收数量
    db.run(
      `UPDATE plantings SET isHarvest = TRUE, actual_harvest_date = ?, harvest_quantity = ?, status = 'harvested', update_time = ? WHERE id = ?`,
      [harvest_date || now, harvest_quantity || 0, now, id]
    );
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '采收操作失败' });
  }
});

// ========== 辅助查询 API ==========

/**
 * 根据来源ID获取种植记录
 * GET /api/plantings/source/:sourceId
 */
router.get('/source/:sourceId', (req: Request, res: Response) => {
  try {
    const { sourceId } = req.params;
    const db = getDatabase();
    const sql = 'SELECT * FROM plantings WHERE source_id = ? ORDER BY create_time DESC';
    const items = queryToObjects(db, sql, [sourceId]);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取来源种植记录失败' });
  }
});

/**
 * 获取未采收的种植列表
 * GET /api/plantings/unharvested
 */
router.get('/unharvested', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM plantings WHERE status != 'harvested' ORDER BY create_time DESC";
    const items = queryToObjects(db, sql, []);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取未采收种植记录失败' });
  }
});

/**
 * 获取已采收的种植列表
 * GET /api/plantings/harvested
 */
router.get('/harvested', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const sql = "SELECT * FROM plantings WHERE status = 'harvested' ORDER BY actual_harvest_date DESC";
    const items = queryToObjects(db, sql, []);

    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取已采收种植记录失败' });
  }
});

// ========== 代码生成 API ==========

/**
 * 生成种植批号
 * GET /api/plantings/generate-code?sourceCode=xxx
 */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const { sourceCode } = req.query;
    const date = new Date();
    const dateStr = date.toISOString().slice(0, 10).replace(/-/g, '');
    const code = sourceCode ? `${sourceCode}-${dateStr}` : `PL${dateStr}`;
    res.json({ success: true, data: code });
  } catch (error) {
    res.status(500).json({ success: false, error: '生成种植批号失败' });
  }
});

/**
 * 重置种植数据到默认状态
 * POST /api/plantings/reset
 */
router.post('/reset', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    // 插入默认数据
    const defaultData: Array<{
      id: string;
      planting_code: string;
      source_type: string;
      source_id: string;
      source_name: string;
      crop_name: string;
      crop_variety: string;
      greenhouse_name: string;
      area_name: string;
      planting_date: string;
      planting_quantity: number;
      planted_quantity: number;
      survival_quantity: number;
      survival_rate: number;
      growth_status: string;
      expected_harvest_date: string;
      actual_harvest_date: string | null;
      harvest_quantity: number;
      status: string;
      remarks: string;
      create_by: string;
      create_time: string;
      update_time: string;
    }> = [
      {
        id: 'PL001',
        planting_code: 'ZZ2026-001-01',
        source_type: 'seedling',
        source_id: 'SD001',
        source_name: 'YM2026-001',
        crop_name: '番茄',
        crop_variety: '红果番茄',
        greenhouse_name: '一棚',
        area_name: '01区',
        planting_date: '2026-03-01',
        planting_quantity: 40000,
        planted_quantity: 40000,
        survival_quantity: 38000,
        survival_rate: 95,
        growth_status: '生长期',
        expected_harvest_date: '2026-05-01',
        actual_harvest_date: null,
        harvest_quantity: 0,
        status: 'planted',
        remarks: '长势良好',
        create_by: '李明辉',
        create_time: '2026-03-01 09:00:00',
        update_time: '2026-04-20 16:00:00'
      },
      {
        id: 'PL002',
        planting_code: 'ZZ2026-002-01',
        source_type: 'seed',
        source_id: 'SS003',
        source_name: 'ZZ2026-003',
        crop_name: '黄瓜',
        crop_variety: '水果黄瓜',
        greenhouse_name: '一棚',
        area_name: '02区',
        planting_date: '2026-03-15',
        planting_quantity: 5000,
        planted_quantity: 5000,
        survival_quantity: 4850,
        survival_rate: 97,
        growth_status: '已采收',
        expected_harvest_date: '2026-04-15',
        actual_harvest_date: '2026-04-15',
        harvest_quantity: 4800,
        status: 'harvested',
        remarks: '第一批采收完成',
        create_by: '王建国',
        create_time: '2026-03-15 10:00:00',
        update_time: '2026-04-15 18:00:00'
      }
    ];

    // 先删除所有现有数据
    db.run('DELETE FROM plantings');

    // 插入默认数据
    for (const item of defaultData) {
      db.run(`
        INSERT INTO plantings (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety,
          greenhouse_name, area_name, planting_date, planting_quantity, planted_quantity,
          survival_quantity, survival_rate, growth_status, expected_harvest_date, actual_harvest_date,
          harvest_quantity, status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [item.id, item.planting_code, item.source_type, item.source_id, item.source_name,
          item.crop_name, item.crop_variety, item.greenhouse_name, item.area_name,
          item.planting_date, item.planting_quantity, item.planted_quantity,
          item.survival_quantity, item.survival_rate, item.growth_status, item.expected_harvest_date,
          item.actual_harvest_date ?? null, item.harvest_quantity ?? 0, item.status,
          item.remarks, item.create_by, item.create_time, item.update_time]);
    }

    saveDatabase();
    res.json({ success: true, message: '种植数据已重置' });
  } catch (error) {
    console.error('重置种植数据失败:', error);
    res.status(500).json({ success: false, error: '重置种植数据失败' });
  }
});

// ========== 田间管理每日记录 API ==========

/**
 * 获取田间管理每日记录列表
 * GET /api/plantings/daily-records
 */
router.get('/daily-records', (req: Request, res: Response) => {
  try {
    const { greenhouse_name, crop_name, record_date, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    // 田间管理记录存储在 farm_tasks 表中，筛选 task_type 为日常管理类型的记录
    let sql = `SELECT * FROM farm_tasks WHERE task_type IN ('日常管理', '浇水', '施肥', '除草', '病虫害防治') AND 1=1`;
    const params: any[] = [];

    if (greenhouse_name) {
      sql += ' AND greenhouse_name LIKE ?';
      params.push(`%${greenhouse_name}%`);
    }

    if (crop_name) {
      sql += ' AND task_content LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (record_date) {
      sql += ' AND plan_date = ?';
      params.push(record_date);
    }

    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*)');

    // 获取总数
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY plan_date DESC, plan_time DESC';

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ? OFFSET ?`;
    params.push(Number(limit), offset);

    const items = queryToObjects(db, sql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
    res.status(500).json({ success: false, error: '获取田间管理记录失败' });
  }
});

/**
 * 创建田间管理每日记录
 * POST /api/plantings/daily-records
 */
router.post('/daily-records', (req: Request, res: Response) => {
  try {
    const { task_code, task_title, task_type, task_content, assignee_name,
            greenhouse_name, area_name, plan_date, plan_time, batch_id, batch_code, create_by } = req.body;

    const newId = `FM${Date.now()}`;
    const now = new Date().toISOString();
    const db = getDatabase();

    db.run(`
      INSERT INTO farm_tasks (id, task_code, task_title, task_type, task_content, assignee_name,
        greenhouse_name, area_name, plan_date, plan_time, batch_id, batch_code, status, create_by, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, task_code || `FM${Date.now()}`, task_title, task_type || '日常管理', task_content,
        assignee_name, greenhouse_name, area_name, plan_date, plan_time || '08:00',
        batch_id, batch_code, 'completed', create_by, now, now]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id: newId } });
  } catch (error) {
    console.error('创建田间管理记录失败:', error);
    res.status(500).json({ success: false, error: '创建田间管理记录失败' });
  }
});

/**
 * 更新田间管理每日记录
 * PUT /api/plantings/daily-records/:id
 */
router.put('/daily-records/:id', (req: Request, res: Response) => {
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

    db.run(`UPDATE farm_tasks SET ${fields}, update_time = ? WHERE id = ?`, values);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '更新田间管理记录失败' });
  }
});

/**
 * 删除田间管理每日记录
 * DELETE /api/plantings/daily-records/:id
 */
router.delete('/daily-records/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    db.run('DELETE FROM farm_tasks WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: '删除田间管理记录失败' });
  }
});

export default router;
