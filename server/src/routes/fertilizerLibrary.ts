/**
 * 肥料知识库 API 路由
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 生成肥料编码 FG+年月日-4位流水号 */
function generateFertilizerCode(db: any): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `FG${datePrefix}`;

  const allCodes = queryToObjects<{ fertilizerCode: string }>(db,
    `SELECT fertilizer_code FROM fertilizer_library`,
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.fertilizerCode || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/fertilizer-library — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { fertilizer_type, keyword, page = '1', limit = '10000' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (fertilizer_type) { conditions.push('fertilizer_type = ?'); params.push(fertilizer_type); }
    if (keyword) { conditions.push("fertilizer_name LIKE '%' || ? || '%'"); params.push(keyword); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM fertilizer_library ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM fertilizer_library ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // 为每个肥料查询对应的规格数据
    for (const item of items) {
      const specs = queryToObjects(db,
        `SELECT * FROM fertilizer_specs WHERE fertilizer_id = ? ORDER BY create_time DESC`,
        [item.id]
      );
      item.specs = specs;
    }

    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer-library/generate-code */
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const code = generateFertilizerCode(db);
    res.json({ success: true, data: { code } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer-library — 新增肥料 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    if (!body.fertilizer_name) {
      res.status(400).json({ success: false, error: '肥料名称为必填项' });
      return;
    }
    const code = generateFertilizerCode(db);
    const now = new Date().toISOString();
    const id = `fl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO fertilizer_library (
      id, fertilizer_code, fertilizer_name, fertilizer_type, application_timing,
      function_desc, taboo_desc, shelf_life, storage_condition, supplier_info,
      status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.fertilizer_name, body.fertilizer_type || null, body.application_timing || null,
       body.function_desc || null, body.taboo_desc || null, body.shelf_life || null,
       body.storage_condition || null, body.supplier_info || null,
       body.status || 'active', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM fertilizer_library WHERE fertilizer_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer-library/:id — 获取肥料详情（含规格） */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const fertilizer = queryToObjects(db, `SELECT * FROM fertilizer_library WHERE id = ?`, [id]);
    if (fertilizer.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }
    const specs = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE fertilizer_id = ? ORDER BY create_time DESC`, [id]);
    res.json({ success: true, data: { ...fertilizer[0], specs } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/fertilizer-library/:id — 更新肥料 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_library WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }

    const now = new Date().toISOString();
    db.run(`UPDATE fertilizer_library SET
      fertilizer_name=?, fertilizer_type=?, application_timing=?,
      function_desc=?, taboo_desc=?, shelf_life=?, storage_condition=?, supplier_info=?,
      status=?, update_time=? WHERE id=?`,
      [body.fertilizer_name ?? existing[0].fertilizer_name,
       body.fertilizer_type ?? existing[0].fertilizer_type,
       body.application_timing ?? existing[0].application_timing,
       body.function_desc ?? existing[0].function_desc,
       body.taboo_desc ?? existing[0].taboo_desc,
       body.shelf_life ?? existing[0].shelf_life,
       body.storage_condition ?? existing[0].storage_condition,
       body.supplier_info ?? existing[0].supplier_info,
       body.status ?? existing[0].status, now, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM fertilizer_library WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/fertilizer-library/:id — 删除肥料（含规格） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_library WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }
    db.run(`DELETE FROM fertilizer_specs WHERE fertilizer_id = ?`, [id]);
    db.run(`DELETE FROM fertilizer_library WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer-library/:id/specs — 新增规格 */
router.post('/:id/specs', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();
    const specId = `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO fertilizer_specs (
      id, fertilizer_id, brand_name, spec_content, manufacturer,
      suggested_dosage, suggested_ratio, dosage_unit, remark, unit_price, status, create_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [specId, id, body.brand_name || null, body.spec_content || null, body.manufacturer || null,
       body.suggested_dosage || null, body.suggested_ratio || null,
       body.dosage_unit || null, body.remark || null,
       Number(body.unit_price) || 0,  // 2026-07-12：单价（施肥时自动取）
       body.status || 'active', now]
    );

    const specs = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.status(201).json({ success: true, data: specs[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/fertilizer-library/specs/:specId — 更新规格 */
router.put('/specs/:specId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { specId } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [specId]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '规格不存在' }); return; }

    db.run(`UPDATE fertilizer_specs SET brand_name=?, spec_content=?, manufacturer=?,
      suggested_dosage=?, suggested_ratio=?, dosage_unit=?, remark=?, unit_price=?, status=? WHERE id=?`,
      [body.brand_name ?? existing[0].brand_name,
       body.spec_content ?? existing[0].spec_content,
       body.manufacturer ?? existing[0].manufacturer,
       body.suggested_dosage ?? existing[0].suggested_dosage,
       body.suggested_ratio ?? existing[0].suggested_ratio,
       body.dosage_unit ?? existing[0].dosage_unit,
       body.remark ?? existing[0].remark,
       body.unit_price != null ? Number(body.unit_price) : (existing[0].unit_price || 0),  // 2026-07-12
       body.status ?? existing[0].status, specId]
    );
    const updated = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/fertilizer-library/specs/:specId — 删除规格 */
router.delete('/specs/:specId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { specId } = req.params;
    db.run(`DELETE FROM fertilizer_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.json({ success: true, data: { id: specId } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer-library/specs — 查询所有规格 */
router.get('/specs', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { fertilizer_id } = req.query as Record<string, string>;
    let sql = `SELECT fs.*, fl.fertilizer_name FROM fertilizer_specs fs
               LEFT JOIN fertilizer_library fl ON fs.fertilizer_id = fl.id`;
    const params: any[] = [];
    if (fertilizer_id) {
      sql += ` WHERE fs.fertilizer_id = ?`;
      params.push(fertilizer_id);
    }
    sql += ` ORDER BY fs.create_time DESC`;
    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
