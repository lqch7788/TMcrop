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
 * POST /assign — 分配标记给标签
 * 2026-08-19：标记改为字典驱动（plant_mark_status 分类），mark_ids 是字典字符串 id 数组
 * Body: { mark_ids: ['pm-mark_growth_excellent', ...], label_ids: [1,2,3] }
 *       向后兼容旧 { mark_id: 12, label_ids: [1,2,3] }（数字 plant_marks.id）
 * - mark_ids 写入 plant_labels.mark_ids（CSV 字符串，保留原顺序）
 * - 每个 label 合并写 1 条 plant_label_resume (operation_type='mark')：
 *   mark_name 用「、」拼接多个字典 label（前端展示按 string 用）；
 *   mark_color 取第一个（主标记的颜色，iAGS 主+次 设计）；
 *   mark_id 写 NULL（INTEGER 列装不下 TEXT id）；
 *   CSV 在 plant_labels.mark_ids 是 source of truth
 */
router.post('/assign', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { mark_id, mark_ids: markIdsArr, label_ids } = req.body;

    // 解析输入 id：统一为字符串数组
    const inputIds: string[] = [];
    if (Array.isArray(markIdsArr) && markIdsArr.length > 0) {
      inputIds.push(...markIdsArr.map((x) => String(x)).filter(Boolean));
    } else if (mark_id !== undefined && mark_id !== null && mark_id !== '') {
      inputIds.push(String(mark_id));
    }
    if (inputIds.length === 0 || !Array.isArray(label_ids) || label_ids.length === 0) {
      res.status(400).json({ success: false, error: 'mark_ids 数组（或 mark_id）与 label_ids 数组为必填项' });
      return;
    }

    // 2026-08-19：标记操作支持多张照片（JSON 数组字符串），单张时也用 JSON 包装以保持存储一致
    const imageBase64 = typeof req.body?.image_base64 === 'string' && req.body.image_base64
      ? req.body.image_base64
      : null;

    // 字典驱动：从 dictionaries 找（category_code = 'plant_mark_status'，active）
    // 用占位符防 SQL 注入（不能用 IN ('a,b,c') 字符串拼接）
    // 注意：queryToObjects 自动 snake_case → camelCase，所以返回的键是 id/dictLabel/color
    const placeholders = inputIds.map(() => '?').join(',');
    const dictRows = queryToObjects(
      db,
      `SELECT id, dict_label, color
       FROM dictionaries
       WHERE category_code = 'plant_mark_status' AND status = 'active' AND id IN (${placeholders})`,
      inputIds
    );
    if (dictRows.length !== inputIds.length) {
      const foundIds = new Set(dictRows.map((r) => String(r.id)));
      const missing = inputIds.filter((id) => !foundIds.has(id));
      res.status(404).json({ success: false, error: `部分 mark_id 不存在: ${missing.join(', ')}` });
      return;
    }

    // 保持原 inputIds 顺序（前端按勾选顺序展示，履历也要一致）
    const dictMap = new Map(dictRows.map((r) => [String(r.id), r]));
    const orderedMarks = inputIds.map((id) => dictMap.get(id)!);

    // mark_ids CSV：直接用原始字符串 id 串（与 plant_labels.mark_ids TEXT 列兼容）
    const markCsv = inputIds.join(',');
    const now = new Date().toISOString().split('T')[0];

    let count = 0;
    // 多选合并：mark_name 用「、」拼接多个字典 label，mark_color 取第一个（主标记）
    const markName = orderedMarks.map((m) => m.dictLabel).filter(Boolean).join('、');
    const markColor = orderedMarks[0]?.color || null;
    for (const labelId of label_ids) {
      // 覆盖式写入 plant_labels.mark_ids
      db.run(`UPDATE plant_labels SET mark_ids = ? WHERE id = ?`, [markCsv, labelId]);
      // 每个 label 合并写 1 条 mark 履历（mark_id 列 INTEGER 装不下 TEXT → 写 NULL）
      db.run(
        `INSERT INTO plant_label_resume (label_id, operation_type, mark_id, mark_name, mark_color, operation_date, image_base64)
         VALUES (?, 'mark', NULL, ?, ?, ?, ?)`,
        [labelId, markName, markColor, now, imageBase64]
      );
      count++;
    }

    res.status(201).json({
      success: true,
      data: { mark_ids: inputIds, mark_csv: markCsv, label_count: count },
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
