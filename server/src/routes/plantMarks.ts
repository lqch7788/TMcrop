/**
 * 种植标签标记管理 API 路由
 * plant_marks
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/** GET /marks/all — 标记列表 */
router.get('/all', (req: Request, res: Response) => {
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

/** POST /assign — 分配标记给标签 */
router.post('/assign', (req: Request, res: Response) => {
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
    saveDatabase();
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /marks — 创建标记 */
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

/** PUT /marks/:id — 更新标记 */
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

/** DELETE /marks/:id — 删除标记（软删除，设为不可用） */
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

export default router;
