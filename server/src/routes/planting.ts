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
    let baseSql = `SELECT
      id,
      planting_code AS plantCode,
      source_type AS sourceType,
      source_id AS sourceId,
      source_name AS sourceCode,
      '' AS cropCode,
      crop_name AS cropName,
      crop_variety AS cropVariety,
      '' AS areaId,
      area_name AS areaName,
      '' AS rootName,
      planting_quantity AS plantingCount,
      planting_date AS plantingDate,
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
      greenhouse_name AS greenhouseName,
      planted_quantity AS plantedQuantity,
      survival_quantity AS survivalQuantity,
      survival_rate AS survivalRate,
      growth_status AS growthStatus,
      expected_harvest_date AS expectedHarvestDate,
      actual_harvest_date AS actualHarvestDate,
      harvest_quantity AS harvestQuantity,
      status,
      remarks,
      '' AS productionPlanId,
      '' AS productionPlanCode,
      create_by AS createBy,
      create_time AS createTime,
      update_time AS updateTime
    FROM plantings WHERE 1=1`;
    const params: any[] = [];

    if (crop_name) {
      baseSql += ' AND crop_name LIKE ?';
      params.push(`%${crop_name}%`);
    }

    if (status) {
      baseSql += ' AND status = ?';
      params.push(status);
    }

    // 保存原始SQL用于count查询
    const countSql = baseSql;

    baseSql += ' ORDER BY create_time DESC';

    // 获取总数
    const total = execCount(db, countSql, params);

    // 添加分页
    const offset = (Number(page) - 1) * Number(limit);
    baseSql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    // 获取数据列表
    const items = queryToObjects(db, baseSql, params);

    res.json({ success: true, data: items, meta: { total, page: Number(page), limit: Number(limit) } });
  } catch (error) {
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

export default router;
