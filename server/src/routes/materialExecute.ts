/**
 * 领料出库 API 路由
 * 提供出库单的 CRUD 操作
 *
 * 数据表: material_executes
 * API前缀: /api/material-executes
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

/** 查询列表 — GET /api/material-executes */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM material_executes ORDER BY date DESC, create_time DESC');
    const resultSet = results.length > 0 ? results[0] : null;
    const columns: string[] = resultSet ? resultSet.columns : [];
    // values 是二维数组 [[行1_val1, 行1_val2, ...], [行2_val1, ...]]
    const items = resultSet
      ? resultSet.values.map((rowValues: any[]) => {
          const item: Record<string, unknown> = {};
          rowValues.forEach((val, i) => { item[columns[i]] = val; });
          // 解析 JSON 字段
          if (item.source_application_codes) {
            try { item.source_application_codes = JSON.parse(item.source_application_codes as string); }
            catch { item.source_application_codes = []; }
          }
          if (item.materials) {
            try { item.materials = JSON.parse(item.materials as string); }
            catch { item.materials = []; }
          }
          return item;
        })
      : [];
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取出库单列表失败:', error);
    res.status(500).json({ success: false, error: '获取出库单列表失败' });
  }
});

/** 查询单个 — GET /api/material-executes/:id */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) item = stmt.getAsObject();
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }
    if (item.source_application_codes) {
      item.source_application_codes = JSON.parse(item.source_application_codes as string);
    }
    if (item.materials) {
      item.materials = JSON.parse(item.materials as string);
    }
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取出库单详情失败:', error);
    res.status(500).json({ success: false, error: '获取出库单详情失败' });
  }
});

/** 创建 — POST /api/material-executes */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const now = new Date().toISOString();

    const id = req.body.id || `CK${Date.now()}`;
    const code = req.body.code || `CK${new Date().toISOString().slice(0, 10).replace(/-/g, '')}001`;
    const date = req.body.date || now.substring(0, 10);
    const applicant = req.body.applicant || '';
    const warehouse_location = req.body.warehouse_location || '';
    const reviewer = req.body.reviewer || '';
    const operator = req.body.operator || '';
    const production_batch_code = req.body.production_batch_code || '';
    const source_application_codes = JSON.stringify(req.body.source_application_codes || []);
    const execute_status = req.body.execute_status || '已出库';
    const execute_status_class = req.body.execute_status_class || 'completed';
    const materials = JSON.stringify(req.body.materials || []);
    const create_by = req.body.create_by || '';

    db.run(`
      INSERT INTO material_executes (
        id, code, date, applicant, warehouse_location, reviewer, operator,
        production_batch_code, source_application_codes, execute_status,
        execute_status_class, materials, create_by, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, code, date, applicant, warehouse_location, reviewer, operator,
      production_batch_code, source_application_codes, execute_status,
      execute_status_class, materials, create_by, now, now,
    ]);

    saveDatabase();
    res.status(201).json({ success: true, data: { id, code } });
  } catch (error) {
    console.error('创建出库单失败:', error);
    res.status(500).json({ success: false, error: '创建出库单失败' });
  }
});

/** 更新 — PUT /api/material-executes/:id */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = new Date().toISOString();
    const db = getDatabase();

    // 查是否存在
    const stmt = db.prepare('SELECT id FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }
    stmt.free();

    // JSON 字段序列化
    const clean: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(updates)) {
      if (['source_application_codes', 'materials'].includes(k)) {
        clean[k] = JSON.stringify(v || []);
      } else {
        clean[k] = v;
      }
    }

    const fields = Object.keys(clean).map(k => `${k} = ?`).join(', ');
    const values: any[] = [...Object.values(clean), now, id];

    if (fields.length > 0) {
      db.run(`UPDATE material_executes SET ${fields}, update_time = ? WHERE id = ?`, values);
      saveDatabase();
    }

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新出库单失败:', error);
    res.status(500).json({ success: false, error: '更新出库单失败' });
  }
});

/** 删除 — DELETE /api/material-executes/:id */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const stmt = db.prepare('SELECT id FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }
    stmt.free();

    db.run('DELETE FROM material_executes WHERE id = ?', [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除出库单失败:', error);
    res.status(500).json({ success: false, error: '删除出库单失败' });
  }
});

export default router;
