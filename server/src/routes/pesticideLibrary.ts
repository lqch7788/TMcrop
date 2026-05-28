/**
 * 药剂知识库 API 路由
 * V12.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 生成药剂编码 PC+类型标识+4位流水号 */
function generatePesticideCode(db: any, controlType: string): string {
  const typeMap: Record<string, string> = { chemical: 'C', bio: 'B', physical: 'P' };
  const prefix = `PC-${typeMap[controlType] || 'X'}`;
  const allCodes = queryToObjects<{ pesticide_code: string }>(db,
    `SELECT pesticide_code FROM pesticide_library WHERE control_type = ?`, [controlType],
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.pesticide_code || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/pesticide-library — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { control_type, pesticide_name, keyword, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (control_type) { conditions.push('control_type = ?'); params.push(control_type); }
    // 支持 keyword 或 pesticide_name 参数
    const nameFilter = keyword || pesticide_name;
    if (nameFilter) { conditions.push("pesticide_name LIKE '%' || ? || '%'"); params.push(nameFilter); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM pesticide_library ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM pesticide_library ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

    // 为每个药剂查询对应的规格数据
    for (const item of items) {
      const specs = queryToObjects(db,
        `SELECT * FROM pesticide_specs WHERE pesticide_id = ? ORDER BY create_time DESC`,
        [item.id]
      );
      item.specs = specs;
    }

    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pesticide-library — 新增药剂 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    if (!body.pesticide_name || !body.control_type) {
      res.status(400).json({ success: false, error: '药剂名称和防治类型为必填项' });
      return;
    }
    const code = generatePesticideCode(db, body.control_type);
    const now = new Date().toISOString();
    const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO pesticide_library (
      id, pesticide_code, pesticide_name, control_type, function_desc, taboo_desc,
      target_pests, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.pesticide_name, body.control_type, body.function_desc || null,
       body.taboo_desc || null, body.target_pests || null, body.status || 'active', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM pesticide_library WHERE pesticide_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pesticide-library/:id — 获取药剂详情（含规格） */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const pesticide = queryToObjects(db, `SELECT * FROM pesticide_library WHERE id = ?`, [id]);
    if (pesticide.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }
    const specs = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE pesticide_id = ? ORDER BY create_time DESC`, [id]);
    res.json({ success: true, data: { ...pesticide[0], specs } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/pesticide-library/:id — 更新药剂 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_library WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }

    const now = new Date().toISOString();
    db.run(`UPDATE pesticide_library SET pesticide_name=?, control_type=?, function_desc=?,
      taboo_desc=?, target_pests=?, status=?, update_time=? WHERE id=?`,
      [body.pesticide_name ?? existing[0].pesticide_name, body.control_type ?? existing[0].control_type,
       body.function_desc ?? existing[0].function_desc, body.taboo_desc ?? existing[0].taboo_desc,
       body.target_pests ?? existing[0].target_pests, body.status ?? existing[0].status, now, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM pesticide_library WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pesticide-library/:id — 删除药剂（含规格） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_library WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }
    db.run(`DELETE FROM pesticide_specs WHERE pesticide_id = ?`, [id]);
    db.run(`DELETE FROM pesticide_library WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pesticide-library/:id/specs — 新增规格 */
router.post('/:id/specs', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const now = new Date().toISOString();
    const specId = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO pesticide_specs (
      id, pesticide_id, spec_content, formulation, manufacturer,
      suggested_dosage, suggested_ratio, dosage_unit, mechanism, brand_name, status, create_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [specId, id, body.spec_content || null, body.formulation || null, body.manufacturer || null,
       body.suggested_dosage || null, body.suggested_ratio || null, body.dosage_unit || null,
       body.mechanism || null, body.brand_name || null, body.status || 'active', now]
    );

    const specs = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.status(201).json({ success: true, data: specs[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/pesticide-library/specs/:specId — 更新规格 */
router.put('/specs/:specId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { specId } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [specId]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '规格不存在' }); return; }

    db.run(`UPDATE pesticide_specs SET spec_content=?, formulation=?, manufacturer=?,
      suggested_dosage=?, suggested_ratio=?, dosage_unit=?, mechanism=?, brand_name=?, status=? WHERE id=?`,
      [body.spec_content ?? existing[0].spec_content, body.formulation ?? existing[0].formulation,
       body.manufacturer ?? existing[0].manufacturer, body.suggested_dosage ?? existing[0].suggested_dosage,
       body.suggested_ratio ?? existing[0].suggested_ratio, body.dosage_unit ?? existing[0].dosage_unit,
       body.mechanism ?? existing[0].mechanism, body.brand_name ?? existing[0].brand_name,
       body.status ?? existing[0].status, specId]
    );
    const updated = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pesticide-library/specs/:specId — 删除规格 */
router.delete('/specs/:specId', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { specId } = req.params;
    db.run(`DELETE FROM pesticide_specs WHERE id = ?`, [specId]);
    saveDatabase();
    res.json({ success: true, data: { id: specId } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pesticide-library/specs — 查询所有规格 */
router.get('/specs', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { pesticide_id } = req.query as Record<string, string>;
    let sql = `SELECT ps.*, pl.pesticide_name FROM pesticide_specs ps
               LEFT JOIN pesticide_library pl ON ps.pesticide_id = pl.id`;
    const params: any[] = [];
    if (pesticide_id) {
      sql += ` WHERE ps.pesticide_id = ?`;
      params.push(pesticide_id);
    }
    sql += ` ORDER BY ps.create_time DESC`;
    const items = queryToObjects(db, sql, params);
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
