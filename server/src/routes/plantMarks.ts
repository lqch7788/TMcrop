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

/**
 * POST /assign — 分配标记给标签（2026-08-17：支持 mark_ids 数组，主+次标记）
 * Body: { mark_ids: [12,15,20], label_ids: [1,2,3] } 或向后兼容 { mark_id: 12, label_ids: [1,2,3] }
 * - mark_ids 写入 plant_labels.mark_ids（CSV 字符串）
 * - 为每个标签 + 每个 mark_id 插入一条 plant_label_resume (operation_type='mark')
 */
router.post('/assign', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { mark_id, mark_ids: markIdsArr, label_ids } = req.body;

    // 兼容旧单 mark_id 与新 mark_ids 数组
    let markIds: number[] = [];
    if (Array.isArray(markIdsArr) && markIdsArr.length > 0) {
      markIds = markIdsArr.map((x) => Number(x)).filter((x) => x > 0);
    } else if (mark_id) {
      markIds = [Number(mark_id)];
    }
    if (markIds.length === 0 || !Array.isArray(label_ids) || label_ids.length === 0) {
      res.status(400).json({ success: false, error: 'mark_ids 数组（或 mark_id）与 label_ids 数组为必填项' });
      return;
    }

    // 校验 mark_ids 全部存在（优先从 plant_marks 软兼容；Phase 1.3 后切到字典表）
    const markIdList = markIds.join(',');
    const marks = queryToObjects(db,
      `SELECT id, name, color FROM plant_marks WHERE id IN (${markIdList})`
    );
    if (marks.length !== markIds.length) {
      res.status(404).json({ success: false, error: '部分 mark_id 不存在' });
      return;
    }
    const markCsv = markIds.join(',');
    const firstMark = marks[0];

    const now = new Date().toISOString().split('T')[0];
    let count = 0;
    for (const labelId of label_ids) {
      // 写入 plant_labels.mark_ids（覆盖式）
      db.run(`UPDATE plant_labels SET mark_ids = ? WHERE id = ?`, [markCsv, labelId]);
      // 写履历（每个 mark 写一行）
      for (const m of marks) {
        db.run(
          `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date)
           VALUES (?, 'mark', ?, ?, ?, ?)`,
          [labelId, m.id, m.name, m.color, now]
        );
      }
      count++;
    }

    res.status(201).json({
      success: true,
      data: { mark_ids: markIds, mark_csv: markCsv, label_count: count },
    });
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
