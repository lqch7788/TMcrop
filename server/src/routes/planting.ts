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
      p.crop_code AS cropCode,
      p.crop_name AS cropName,
      p.crop_variety AS cropVariety,
      p.area_id AS areaId,
      p.area_name AS areaName,
      p.root_name AS rootName,
      p.planting_quantity AS plantingCount,
      p.planting_date AS plantingDate,
      p.soil_ph AS soilPH,
      p.soil_ec AS soilEC,
      p.transplant_count AS transplantCount,
      p.transplant_date AS transplantDate,
      p.is_harvest AS isHarvest,
      p.harvest_date AS harvestDate,
      p.attrition_rate AS attritionRate,
      p.print_count AS printCount,
      p.traceability_code AS traceabilityCode,
      p.pictures,
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
      p.production_plan_id AS productionPlanId,
      p.production_plan_code AS productionPlanCode,
      p.create_by AS createBy,
      p.create_time AS createTime,
      p.update_time AS updateTime
    FROM plantings p
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

    // COUNT 查询用同样的 WHERE 条件
    const countSql = `SELECT COUNT(*) FROM plantings p WHERE 1=1` +
      (crop_name ? ' AND p.crop_name LIKE ?' : '') +
      (status ? ' AND p.status = ?' : '');

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
    const body = req.body;

    // 统一字段映射（支持前端驼峰和后端下划线命名）
    const finalPlantCode = body.planting_code || body.plantCode || `PL${Date.now()}`;
    const newId = body.id || `PL${Date.now()}`;
    const now = new Date().toISOString();

    const finalSourceType = body.source_type || body.sourceType || '';
    const finalSourceId = body.source_id || body.sourceId || '';
    const finalSourceName = body.source_name || body.sourceCode || '';

    const finalCropName = body.crop_name || body.cropName || '';
    const finalCropVariety = body.crop_variety || body.cropVariety || '';
    const finalCropCode = body.crop_code || body.cropCode || '';

    const finalAreaId = body.area_id || body.areaId || '';
    const finalAreaName = body.area_name || body.areaName || '';
    const finalRootName = body.root_name || body.rootName || '';
    const finalGreenhouseName = body.greenhouse_name || body.greenhouseName || '';

    const finalPlantingDate = body.planting_date || body.plantingDate || '';
    const finalPlantingQuantity = body.planting_quantity || body.plantingCount || 0;
    const finalPlantedQuantity = body.planted_quantity || body.plantedQuantity || 0;
    const finalSurvivalQuantity = body.survival_quantity || 0;
    const finalSurvivalRate = body.survival_rate || body.survivalRate || 0;

    const finalGrowthStatus = body.growth_status || body.growthStatus || '';
    const finalExpectedHarvestDate = body.expected_harvest_date || body.expectedHarvestDate || '';
    const finalStatus = body.status || 'planted';
    const finalRemarks = body.remarks || '';

    const finalCreateBy = body.create_by || body.createBy || '';

    const finalSoilPh = body.soil_ph || body.soilPH || 0;
    const finalSoilEc = body.soil_ec || body.soilEC || 0;
    const finalAttritionRate = body.attrition_rate || body.attritionRate || 0;
    const finalTransplantCount = body.transplant_count || body.transplantCount || 0;
    const finalTransplantDate = body.transplant_date || body.transplantDate || '';
    const finalIsHarvest = body.is_harvest ?? (body.isHarvest ? 1 : 0);
    const finalHarvestDate = body.harvest_date || body.harvestDate || '';
    const finalHarvestQuantity = body.harvest_quantity || 0;
    const finalPrintCount = body.print_count || 0;
    const finalTraceabilityCode = body.traceability_code || body.traceabilityCode || '';
    const finalPictures = body.pictures || '[]';
    const finalProductionPlanId = body.production_plan_id || body.productionPlanId || '';
    const finalProductionPlanCode = body.production_plan_code || body.productionPlanCode || '';

    const db = getDatabase();
    db.run(`
      INSERT INTO plantings (
        id, planting_code, source_type, source_id, source_name, crop_name, crop_variety, crop_code,
        area_id, area_name, root_name, greenhouse_name, planting_date, planting_quantity, planted_quantity,
        survival_quantity, survival_rate, growth_status, expected_harvest_date, status, remarks, create_by, create_time, update_time,
        soil_ph, soil_ec, attrition_rate, transplant_count, transplant_date, is_harvest, harvest_date,
        harvest_quantity, print_count, traceability_code, pictures, production_plan_id, production_plan_code
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      newId, finalPlantCode, finalSourceType, finalSourceId, finalSourceName,
      finalCropName, finalCropVariety, finalCropCode,
      finalAreaId, finalAreaName, finalRootName, finalGreenhouseName, finalPlantingDate,
      finalPlantingQuantity, finalPlantedQuantity,
      finalSurvivalQuantity, finalSurvivalRate, finalGrowthStatus, finalExpectedHarvestDate,
      finalStatus, finalRemarks, finalCreateBy, now, now,
      finalSoilPh, finalSoilEc, finalAttritionRate, finalTransplantCount, finalTransplantDate,
      finalIsHarvest, finalHarvestDate, finalHarvestQuantity, finalPrintCount, finalTraceabilityCode,
      finalPictures, finalProductionPlanId, finalProductionPlanCode
    ]);

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
      `UPDATE plantings SET is_harvest = 1, harvest_date = ?, harvest_quantity = ?, status = 'harvested', update_time = ? WHERE id = ?`,
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

    // 先删除所有现有数据
    db.run('DELETE FROM plantings');

    // 插入默认数据
    const defaultData = [
      ['PL001', 'ZZ2026-001-01', 'seedling', 'SD001', 'YM2026-001', '番茄', '红果番茄', '', '', '', '一棚', '01区', '2026-03-01', 40000, 40000, 38000, 95, '生长期', '2026-05-01', null, 0, 'planted', '长势良好', '李明辉', '2026-03-01 09:00:00', '2026-04-20 16:00:00'],
      ['PL002', 'ZZ2026-002-01', 'seed', 'SS003', 'ZZ2026-003', '黄瓜', '水果黄瓜', '', '', '', '一棚', '02区', '2026-03-15', 5000, 5000, 4850, 97, '已采收', '2026-04-15', '2026-04-15', 4800, 'harvested', '第一批采收完成', '王建国', '2026-03-15 10:00:00', '2026-04-15 18:00:00']
    ];

    for (const item of defaultData) {
      db.run(`
        INSERT INTO plantings (id, planting_code, source_type, source_id, source_name, crop_name, crop_variety, crop_code,
          area_id, area_name, root_name, greenhouse_name, planting_date, planting_quantity, planted_quantity,
          survival_quantity, survival_rate, growth_status, expected_harvest_date, actual_harvest_date,
          harvest_quantity, status, remarks, create_by, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, item);
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
    const total = execCount(db, countSql, params);

    sql += ' ORDER BY plan_date DESC, plan_time DESC';
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
