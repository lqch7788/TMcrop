/**
 * 种植季记录路由 — 基地空间架构 V1.0
 * 挂载于 /api/planting-records
 */

import { Router } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

/** 获取种植季记录列表 GET /api/planting-records */
router.get('/', (req, res) => {
  try {
    const db = getDatabase();
    const { facility_oid, block_oid, season_code, status, year } = req.query;
    const conditions: string[] = ['pr.deleted_at IS NULL'];
    const params: any[] = [];

    if (facility_oid) { conditions.push('pr.facility_oid = ?'); params.push(facility_oid); }
    if (block_oid) { conditions.push('pr.block_oid = ?'); params.push(block_oid); }
    if (season_code) { conditions.push('pr.season_code = ?'); params.push(season_code); }
    if (status) { conditions.push('pr.status = ?'); params.push(status); }
    if (year) { conditions.push("pr.season_code LIKE ?"); params.push(`${year}%`); }

    const result = db.exec(`
      SELECT pr.*, g.name as facility_name, g.code as facility_code
      FROM planting_records pr
      LEFT JOIN greenhouses g ON pr.facility_oid = g.oid
      WHERE ${conditions.join(' AND ')}
      ORDER BY pr.season_code DESC
    `, params);

    if (result.length === 0) return res.json({ success: true, data: [] });

    const columns = result[0].columns;
    const records = result[0].values.map(row => {
      const obj: any = {};
      columns.forEach((col, i) => { obj[col] = row[i]; });
      return obj;
    });
    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取种植季记录失败:', error);
    res.status(500).json({ success: false, error: '获取种植季记录失败' });
  }
});

/** 获取单条记录 GET /api/planting-records/:oid */
router.get('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const result = db.exec('SELECT * FROM planting_records WHERE oid = ? AND deleted_at IS NULL', [req.params.oid]);
    if (result.length === 0 || result[0].values.length === 0) {
      return res.status(404).json({ success: false, error: '记录不存在' });
    }
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取种植季详情失败:', error);
    res.status(500).json({ success: false, error: '获取种植季详情失败' });
  }
});

/** 创建种植季记录 POST /api/planting-records（自动生成 seasonCode） */
router.post('/', (req, res) => {
  try {
    const db = getDatabase();
    const { facility_oid, block_oid, crop_variety_oid, crop_name, variety_name, start_date, notes } = req.body;

    if (!facility_oid || !crop_name) {
      return res.status(400).json({ success: false, error: '所属设施和作物名称不能为空' });
    }

    // 自动生成种植季编码: YYYY + S + 序号(3位)
    const year = start_date ? start_date.substring(0, 4) : String(new Date().getFullYear());
    const countResult = db.exec(
      "SELECT COUNT(*) as cnt FROM planting_records WHERE facility_oid = ? AND season_code LIKE ? AND deleted_at IS NULL",
      [facility_oid, `${year}%`]
    );
    const cnt = Number(countResult[0]?.values[0]?.[0] || 0) + 1;
    const seasonCode = `${year}S${String(cnt).padStart(3, '0')}`;

    const oid = `pr_${Date.now()}`;
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO planting_records (oid, facility_oid, block_oid, season_code, crop_variety_oid, crop_name, variety_name, start_date, status, notes, created_at, updated_at)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'planting', ?, ?, ?)
    `, [oid, facility_oid, block_oid || '', seasonCode, crop_variety_oid || '', crop_name, variety_name || '', start_date || now, notes || '', now, now]);

    // 同步更新 greenhouses 表的 current_* 字段
    db.run('UPDATE greenhouses SET current_crop = ?, current_variety = ?, current_season_code = ?, updated_at = ? WHERE oid = ?',
      [crop_name, variety_name || '', seasonCode, now, facility_oid]);

    const result = db.exec('SELECT * FROM planting_records WHERE oid = ?', [oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record, message: '种植季创建成功' });
  } catch (error) {
    console.error('创建种植季记录失败:', error);
    res.status(500).json({ success: false, error: '创建种植季记录失败' });
  }
});

/** 更新种植季记录 PUT /api/planting-records/:oid */
router.put('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    const { crop_variety_oid, crop_name, variety_name, start_date, end_date, status, yield_amount, yield_unit, quality_grade, notes } = req.body;

    const setClauses: string[] = [];
    const values: any[] = [];
    const fields: Record<string, any> = {
      crop_variety_oid, crop_name, variety_name, start_date, end_date,
      status, yield_amount, yield_unit, quality_grade, notes,
    };
    Object.entries(fields).forEach(([col, val]) => {
      if (val !== undefined) {
        setClauses.push(`${col} = ?`);
        values.push(val);
      }
    });
    if (setClauses.length === 0) {
      return res.status(400).json({ success: false, error: '没有提供需要更新的字段' });
    }
    setClauses.push('updated_at = ?');
    values.push(new Date().toISOString());
    values.push(req.params.oid);
    db.run(`UPDATE planting_records SET ${setClauses.join(', ')} WHERE oid = ? AND deleted_at IS NULL`, values);

    // 同步设施表的 current_* 字段（若状态变更为 planting）
    if (status === 'planting') {
      const pr = db.exec('SELECT facility_oid, crop_name, variety_name, season_code FROM planting_records WHERE oid = ?', [req.params.oid]);
      if (pr.length > 0 && pr[0].values.length > 0) {
        const row = pr[0].values[0];
        db.run('UPDATE greenhouses SET current_crop = ?, current_variety = ?, current_season_code = ?, updated_at = ? WHERE oid = ?',
          [row[1], row[2] || '', row[3], new Date().toISOString(), row[0]]);
      }
    }

    const result = db.exec('SELECT * FROM planting_records WHERE oid = ?', [req.params.oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record, message: '种植季记录更新成功' });
  } catch (error) {
    console.error('更新种植季记录失败:', error);
    res.status(500).json({ success: false, error: '更新种植季记录失败' });
  }
});

/** 结束种植季 PUT /api/planting-records/:oid/end */
router.put('/:oid/end', (req, res) => {
  try {
    const db = getDatabase();
    const { end_date, yield_amount, yield_unit, quality_grade, notes } = req.body;
    if (!end_date) {
      return res.status(400).json({ success: false, error: '结束日期不能为空' });
    }
    const now = new Date().toISOString();
    db.run(`
      UPDATE planting_records SET status = 'harvested', end_date = ?, yield_amount = ?, yield_unit = ?, quality_grade = ?, notes = COALESCE(?, notes), updated_at = ?
      WHERE oid = ? AND deleted_at IS NULL
    `, [end_date, yield_amount || 0, yield_unit || 'kg', quality_grade || '', notes || '', now, req.params.oid]);

    // 更新设施表的 current_* 字段为空（种植季已结束）
    const pr = db.exec('SELECT facility_oid FROM planting_records WHERE oid = ?', [req.params.oid]);
    if (pr.length > 0 && pr[0].values.length > 0) {
      const facilityOid = pr[0].values[0][0] as string;
      db.run('UPDATE greenhouses SET current_crop = NULL, current_variety = NULL, current_season_code = NULL, updated_at = ? WHERE oid = ?', [now, facilityOid]);
    }

    const result = db.exec('SELECT * FROM planting_records WHERE oid = ?', [req.params.oid]);
    const columns = result[0].columns;
    const record: any = {};
    columns.forEach((col, i) => { record[col] = result[0].values[0][i]; });
    res.json({ success: true, data: record, message: '种植季已结束' });
  } catch (error) {
    console.error('结束种植季失败:', error);
    res.status(500).json({ success: false, error: '结束种植季失败' });
  }
});

/** 删除种植季记录（软删除） DELETE /api/planting-records/:oid */
router.delete('/:oid', (req, res) => {
  try {
    const db = getDatabase();
    db.run('UPDATE planting_records SET deleted_at = ?, updated_at = ? WHERE oid = ?', [new Date().toISOString(), new Date().toISOString(), req.params.oid]);
    res.json({ success: true, message: '种植季记录已删除' });
  } catch (error) {
    console.error('删除种植季记录失败:', error);
    res.status(500).json({ success: false, error: '删除种植季记录失败' });
  }
});

export default router;
