/**
 * 病虫害字典 API 路由
 * V12.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 生成字典编码 KC-B-/KC-D-+4位流水号 */
function generateDictCode(db: any, dictType: string): string {
  const prefix = dictType === 'pest' ? 'KC-B-' : 'KC-D-';
  const allCodes = queryToObjects<{ dict_code: string }>(db,
    `SELECT dict_code FROM pest_disease_dict WHERE dict_type = ?`, [dictType],
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.dict_code || '';
    if (code.startsWith(prefix)) {
      const seq = parseInt(code.split('-').pop() || '0', 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `${prefix}${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/pest-disease-dict — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { dict_type, dict_name, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    if (dict_type) { conditions.push('dict_type = ?'); params.push(dict_type); }
    if (dict_name) { conditions.push("dict_name LIKE '%' || ? || '%'"); params.push(dict_name); }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM pest_disease_dict ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM pest_disease_dict ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pest-disease-dict — 新增 */
router.post('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body;
    if (!body.dict_name || !body.dict_type) {
      res.status(400).json({ success: false, error: '病虫害名称和类型为必填项' });
      return;
    }
    const code = generateDictCode(db, body.dict_type);
    const now = new Date().toISOString();
    const id = `pdd-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO pest_disease_dict (
      id, dict_code, dict_name, dict_type, target_crops, description, status, create_time
    ) VALUES (?,?,?,?,?,?,?,?)`,
      [id, code, body.dict_name, body.dict_type, body.target_crops || null,
       body.description || null, body.status || 'active', now]
    );

    const items = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE dict_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pest-disease-dict/:id — 详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/pest-disease-dict/:id — 更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '记录不存在' }); return; }

    db.run(`UPDATE pest_disease_dict SET dict_name=?, dict_type=?, target_crops=?,
      description=?, status=? WHERE id=?`,
      [body.dict_name ?? existing[0].dict_name, body.dict_type ?? existing[0].dict_type,
       body.target_crops ?? existing[0].target_crops, body.description ?? existing[0].description,
       body.status ?? existing[0].status, id]
    );
    const updated = queryToObjects(db, `SELECT * FROM pest_disease_dict WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pest-disease-dict/:id — 删除 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    db.run(`DELETE FROM pest_disease_dict WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: false, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pest-disease-dict/by-crop/:cropName — 根据作物获取适用病虫害 */
router.get('/by-crop/:cropName', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { cropName } = req.params;
    const items = queryToObjects(db,
      `SELECT * FROM pest_disease_dict WHERE target_crops LIKE ? ORDER BY dict_type, dict_name`,
      [`%${cropName}%`]
    );
    res.json({ success: true, data: items });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
