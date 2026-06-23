/**
 * 种植标签管理 API 路由
 * plant_labels — 标签 CRUD + 批量入库 + 扫码查询
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

/** POST /generate-batch — 批量生成标签（育苗/种植标签打印，生产域名兼容） */
router.post('/generate-batch', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { seedling_id, planting_id, count, crop_name, area_name, start_date } = req.body;

    if (!count || count <= 0) {
      res.status(400).json({ success: false, error: 'count 必须大于 0' });
      return;
    }

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
        `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, quantity, create_time)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [labelNumber, planting_id || null, seedling_id || null, area_name || null, start_date || null, 1, now]
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
    saveDatabase();
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET / — 标签列表（支持 planting_id / seedling_id 筛选 + 分页） */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { planting_id, seedling_id, page = '1', limit = '100' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
    const conditions: string[] = [];
    const params: any[] = [];

    if (planting_id) { conditions.push('planting_id = ?'); params.push(planting_id); }
    if (seedling_id) { conditions.push('seedling_id = ?'); params.push(seedling_id); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = db.exec(`SELECT COUNT(*) as cnt FROM plant_labels ${whereClause}`, params)[0]?.values[0]?.[0] ?? 0;
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM plant_labels ${whereClause} ORDER BY id DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({
      success: true,
      data: items,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(total) / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /query-by-label — 按标签编号/名称/区域查询植株信息 */
router.get('/query-by-label', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { label_code, area_name, plant_name, planting_id, page = '1', limit = '100' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(limit, 10) || 100));
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

    res.json({
      success: true,
      data: items,
      meta: { total, page: pageNum, limit: limitNum, totalPages: Math.ceil(Number(total) / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /by-number/:labelNumber — 扫码查询（必须在 /:id 之前注册） */
router.get('/by-number/:labelNumber', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labelNumber } = req.params;
    const label = queryToObjects(db,
      `SELECT * FROM plant_labels WHERE label_number = ?`, [labelNumber]
    );
    if (label.length === 0) {
      res.status(404).json({ success: false, error: '标签不存在' });
      return;
    }
    const resumes = queryToObjects(db,
      `SELECT * FROM plant_label_resume WHERE label_id = ? ORDER BY operation_date DESC LIMIT 20`,
      [label[0].id]
    );
    res.json({ success: true, data: { label: label[0], resumes } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /:id — 单条标签 */
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

/** DELETE /:id — 删除标签（同时删除履历） */
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

/**
 * POST /batch-create — 前端批量入库（保留前端编号规则 + quantity 字段）
 * 批量多行 VALUES 语法（5000 条 < 1s）
 */
router.post('/batch-create', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { labels } = req.body;
    if (!Array.isArray(labels) || labels.length === 0) {
      res.status(400).json({ success: false, error: 'labels 数组为必填项' });
      return;
    }

    const now = new Date().toISOString().replace('T', ' ').slice(0, 19);
    const rows: string[] = [];
    const params: any[] = [];
    for (const item of labels) {
      if (!item.labelNumber) continue;
      rows.push('(?, ?, ?, ?, ?, ?, ?)');
      params.push(
        item.labelNumber,
        item.plantingId || null,
        item.seedlingId || null,
        item.moveInAreaName || null,
        item.moveInDate || null,
        item.quantity ?? 1,
        now
      );
    }

    if (rows.length === 0) {
      res.status(400).json({ success: false, error: '没有有效标签' });
      return;
    }

    db.run(
      `INSERT INTO plant_labels (label_number, planting_id, seedling_id, move_in_area_name, move_in_date, quantity, create_time)
       VALUES ${rows.join(', ')}`,
      params
    );

    // 多行 INSERT 后无法用 last_insert_rowid，用 MAX(id) 推算
    const maxResult = db.exec('SELECT MAX(id) as max_id FROM plant_labels');
    const maxId = Number(maxResult[0]?.values[0]?.[0]) || 0;
    const insertedIds: number[] = [];
    for (let i = rows.length - 1; i >= 0; i--) {
      insertedIds.push(maxId - i);
    }

    res.status(201).json({
      success: true,
      data: { inserted: rows.length, insertedIds },
    });
    saveDatabase();
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
