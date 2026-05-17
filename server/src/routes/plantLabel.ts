/**
 * 种植标签管理 API 路由
 * plant_labels + plant_label_resume + plant_marks
 */
import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

// ==================== 标记 (plant_marks) — 必须放在 /:id 之前 ====================

/** GET /api/plant-labels/marks/all — 标记列表 */
router.get('/marks/all', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      `SELECT * FROM plant_marks WHERE is_use = 1 ORDER BY sort_order, id`
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/plant-labels/marks/assign — 分配标记给标签 */
router.post('/marks/assign', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { mark_id, label_ids } = req.body;
    if (!mark_id || !Array.isArray(label_ids) || label_ids.length === 0) {
      res.status(400).json({ success: false, error: 'mark_id 和 label_ids 数组为必填项' });
      return;
    }

    const mark = queryToObjects(db, `SELECT * FROM plant_marks WHERE id = ?`, [mark_id]);
    if (mark.length === 0) { res.status(404).json({ success: false, error: '标记不存在' }); return; }

    const now = new Date().toISOString().split('T')[0];
    let count = 0;
    for (const labelId of label_ids) {
      db.run(`INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
        VALUES (?, 'mark', ?, ?, ?, ?)`,
        [labelId, mark_id, mark[0].name, mark[0].color, now]
      );
      count++;
    }

    res.status(201).json({ success: true, data: { mark_id, mark_name: mark[0].name, assigned_count: count } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/plant-labels/marks — 创建标记 */
router.post('/marks', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { name, color, icon, parent_id, mark_aid, sort_order } = req.body;
    if (!name) { res.status(400).json({ success: false, error: 'name 为必填项' }); return; }
    db.run(`INSERT INTO plant_marks (name, color, icon, parent_id, mark_aid, sort_order) VALUES (?,?,?,?,?,?)`,
      [name, color || null, icon || null, parent_id || 0, mark_aid || '', sort_order || 0]
    );
    const id = db.exec('SELECT last_insert_rowid()')[0]?.values[0]?.[0];
    const items = queryToObjects(db, `SELECT * FROM plant_marks WHERE id = ?`, [id]);
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/plant-labels/marks/:id — 更新标记 */
router.put('/marks/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const exist = queryToObjects(db, `SELECT * FROM plant_marks WHERE id = ?`, [id]);
    if (exist.length === 0) { res.status(404).json({ success: false, error: '标记不存在' }); return; }
    const { name, color, icon, parent_id, mark_aid, sort_order, is_use } = req.body;
    db.run(`UPDATE plant_marks SET name=?, color=?, icon=?, parent_id=?, mark_aid=?, sort_order=?, is_use=? WHERE id=?`,
      [name ?? exist[0].name, color ?? exist[0].color, icon ?? exist[0].icon,
       parent_id ?? exist[0].parent_id, mark_aid ?? exist[0].mark_aid,
       sort_order ?? exist[0].sort_order, is_use ?? exist[0].is_use, id]
    );
    const items = queryToObjects(db, `SELECT * FROM plant_marks WHERE id = ?`, [id]);
    res.json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/plant-labels/marks/:id — 删除标记（软删除，设为不可用） */
router.delete('/marks/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.run(`UPDATE plant_marks SET is_use = 0 WHERE id = ?`, [id]);
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 标签 (plant_labels) ====================

/** POST /api/plant-labels/generate-batch — 批量生成标签（育苗/种植标签打印） */
router.post('/generate-batch', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { seedling_id, planting_id, count, crop_name, area_name, start_date } = req.body;

    if (!count || count <= 0) {
      res.status(400).json({ success: false, error: 'count 必须大于 0' });
      return;
    }

    // 获取当前已打印的标签数量（按育苗或种植ID统计）
    let existingCount = 0;
    if (seedling_id) {
      const cntResult = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE seedling_id = ?', [String(seedling_id)]);
      existingCount = Number(cntResult[0]?.values[0]?.[0]) || 0;
    } else if (planting_id) {
      const cntResult = db.exec('SELECT COUNT(*) as cnt FROM plant_labels WHERE planting_id = ?', [String(planting_id)]);
      existingCount = Number(cntResult[0]?.values[0]?.[0]) || 0;
    }

    const labels: any[] = [];
    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);

    for (let i = 0; i < count; i++) {
      const seq = existingCount + i + 1;
      const labelNumber = `${crop_name || 'LABEL'}-${String(seq).padStart(6, '0')}`;

      db.run(
        `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, create_time)
         VALUES (?, ?, ?, ?, ?, ?)`,
        [labelNumber, planting_id || null, seedling_id || null, area_name || null, start_date || null, now]
      );

      labels.push({
        labelNumber,
        qrContent: labelNumber,
        cropName: crop_name || '',
        areaName: area_name || '',
        startDate: start_date || '',
        seq,
      });
    }

    res.status(201).json({
      success: true,
      data: { labels, totalPrinted: existingCount + count },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/plant-labels — 标签列表（支持按 planting_id 筛选） */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { planting_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (planting_id) { conditions.push('planting_id = ?'); params.push(planting_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.exec(`SELECT COUNT(*) as cnt FROM plant_labels ${whereClause}`, params)[0]?.values[0]?.[0] ?? 0;
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM plant_labels ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/plant-labels/query-by-label — 按标签编号/名称/区域查询植株信息 */
router.get('/query-by-label', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { label_code, area_name, plant_name, planting_id, page = '1', limit = '20' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (label_code) { conditions.push('label_code LIKE ?'); params.push(`%${label_code}%`); }
    if (area_name) {
      conditions.push('(move_in_area_name LIKE ? OR move_out_area_name LIKE ?)');
      params.push(`%${area_name}%`, `%${area_name}%`);
    }
    if (plant_name) { conditions.push('plant_name LIKE ?'); params.push(`%${plant_name}%`); }
    if (planting_id) { conditions.push('planting_id = ?'); params.push(planting_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.exec(`SELECT COUNT(*) as cnt FROM plant_labels ${whereClause}`, params)[0]?.values[0]?.[0] ?? 0;
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM plant_labels ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== 标签履历 (plant_label_resume) ====================

/** GET /api/plant-labels/:id/resumes — 获取标签履历 */
router.get('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC`,
      [req.params.id]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/plant-labels/:id/resumes — 新增标签履历（移入/移出/标记） */
router.post('/:id/resumes', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const labelId = parseInt(req.params.id, 10);
    const { operation_type, from_area_name, to_area_name, mark_id, mark_name, mark_color, operation_date, operator_name } = req.body;

    if (!operation_type || !operation_date) {
      res.status(400).json({ success: false, error: 'operation_type 和 operation_date 为必填项' });
      return;
    }

    const label = queryToObjects(db, `SELECT * FROM plant_labels WHERE id = ?`, [labelId]);
    if (label.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }

    if (operation_type === 'move_in') {
      db.run(`UPDATE plant_labels SET move_in_area_name = ?, move_in_date = ? WHERE id = ?`,
        [to_area_name || '', operation_date, labelId]);
    } else if (operation_type === 'move_out') {
      db.run(`UPDATE plant_labels SET move_out_area_name = ?, move_out_date = ? WHERE id = ?`,
        [to_area_name || '', operation_date, labelId]);
    }

    db.run(`INSERT INTO plant_label_resume (label_id, operation_type, from_area_name, to_area_name, mark_id, mark_name, mark_color, operation_date, operator_name)
      VALUES (?,?,?,?,?,?,?,?,?)`,
      [labelId, operation_type, from_area_name || null, to_area_name || null, mark_id || null,
       mark_name || null, mark_color || null, operation_date, operator_name || null]
    );

    res.status(201).json({ success: true, data: { labelId, operation_type, operation_date } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

// ==================== /:id 路由 — 必须放在最后 ====================

/** GET /api/plant-labels/:id — 单条标签 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const items = queryToObjects(db, `SELECT * FROM plant_labels WHERE id = ?`, [req.params.id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/plant-labels/:id — 删除标签（同时删除履历） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const exist = queryToObjects(db, `SELECT id FROM plant_labels WHERE id = ?`, [id]);
    if (exist.length === 0) { res.status(404).json({ success: false, error: '标签不存在' }); return; }
    db.run(`DELETE FROM plant_label_resume WHERE label_id = ?`, [id]);
    db.run(`DELETE FROM plant_labels WHERE id = ?`, [id]);
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
