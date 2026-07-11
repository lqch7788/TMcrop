/**
 * 药剂知识库 API 路由
 * V12.0 新增
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成药剂编码（2026-07-10 重构：取消 chemical/bio/physical 分类，统一 PC-XXXX 前缀，全表递增）
 * 保留 PC-C-/PC-B-/PC-P- 历史编码不动，仅对新生成的编码使用 PC- 前缀
 */
function generatePesticideCode(db: any): string {
  // 取全表所有编码，找到 PC-XXXX（4 位数字）格式的最大值
  const stmt = db.prepare('SELECT pesticide_code FROM pesticide_library');
  stmt.bind([]);
  const codes: string[] = [];
  while (stmt.step()) {
    const obj = stmt.getAsObject() as { pesticide_code?: string };
    if (obj.pesticide_code) {
      codes.push(obj.pesticide_code);
    }
  }
  stmt.free();

  let maxSeq = 0;
  for (const code of codes) {
    // 只匹配 PC-XXXX 格式（4 位数字），不匹配 PC-C-/PC-B-/PC-P-
    const match = code.match(/^PC-(\d{4,})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (seq > maxSeq) maxSeq = seq;
    }
  }
  return `PC-${String(maxSeq + 1).padStart(4, '0')}`;
}

/** GET /api/pesticide-library — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 2026-07-10：移除 control_type 过滤（已删除字段），pesticide_type 改 JSON 数组查询
    const { pesticide_type, pesticide_name, keyword, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    // pesticide_type 现在是 JSON 数组，用 json_each 展开后匹配 dictCode
    if (pesticide_type) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(pesticide_library.pesticide_type) WHERE json_each.value = ?)`);
      params.push(pesticide_type);
    }
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
    // 2026-07-10：取消 control_type 必填校验，药剂名称 + 药剂类型（pesticideType 数组）为必填
    if (!body.pesticide_name) {
      res.status(400).json({ success: false, error: '药剂名称为必填项' });
      return;
    }
    // pesticideType 支持两种格式：数组 ['insecticide','fungicide'] 或 JSON 字符串 '["insecticide"]'
    let pesticideTypeValue: string | null = null;
    if (Array.isArray(body.pesticideType) && body.pesticideType.length > 0) {
      pesticideTypeValue = JSON.stringify(body.pesticideType);
    } else if (typeof body.pesticideType === 'string' && body.pesticideType.trim()) {
      // 兼容旧的 snake_case 字段 pesticide_type
      if (body.pesticideType.trim().startsWith('[')) {
        pesticideTypeValue = body.pesticideType;
      } else {
        // 单值字符串也包装为数组
        pesticideTypeValue = JSON.stringify([body.pesticideType]);
      }
    } else if (body.pesticide_type) {
      // 兼容 snake_case 字段
      const v = body.pesticide_type;
      pesticideTypeValue = v.trim().startsWith('[') ? v : JSON.stringify([v]);
    }

    const code = generatePesticideCode(db);
    const now = new Date().toISOString();
    const id = `pl-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // 2026-07-10：移除 control_type 字段写入
    db.run(`INSERT INTO pesticide_library (
      id, pesticide_code, pesticide_name, function_desc, taboo_desc,
      target_pests, ingredient, mechanism, pesticide_type, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.pesticide_name, body.function_desc || null,
       body.taboo_desc || null, body.target_pests || null, body.ingredient || null,
       body.mechanism || null, pesticideTypeValue,
       body.status || 'active', now, now]
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

    // 2026-07-10：移除 control_type 字段；pesticideType 支持数组/字符串两种格式
    let pesticideTypeValue: string | null | undefined = undefined;
    if (Array.isArray(body.pesticideType)) {
      pesticideTypeValue = body.pesticideType.length > 0 ? JSON.stringify(body.pesticideType) : null;
    } else if (typeof body.pesticideType === 'string') {
      pesticideTypeValue = body.pesticideType.trim().startsWith('[') ? body.pesticideType : JSON.stringify([body.pesticideType]);
    } else if (body.pesticide_type !== undefined) {
      const v = body.pesticide_type;
      if (v === null) pesticideTypeValue = null;
      else pesticideTypeValue = typeof v === 'string' && v.trim().startsWith('[') ? v : JSON.stringify([v]);
    }

    const now = new Date().toISOString();
    db.run(`UPDATE pesticide_library SET pesticide_name=?, function_desc=?,
      taboo_desc=?, target_pests=?, ingredient=?, mechanism=?, pesticide_type=?, status=?, update_time=? WHERE id=?`,
      [body.pesticide_name ?? existing[0].pesticide_name,
       body.function_desc ?? existing[0].function_desc, body.taboo_desc ?? existing[0].taboo_desc,
       body.target_pests ?? existing[0].target_pests, body.ingredient ?? existing[0].ingredient,
       body.mechanism ?? existing[0].mechanism,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticide_type,
       body.status ?? existing[0].status, now, id]
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
      suggested_dosage, suggested_ratio, dosage_unit, mechanism, brand_name, remark, status, create_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [specId, id, body.spec_content || null, body.formulation || null, body.manufacturer || null,
       body.suggested_dosage || null, body.suggested_ratio || null, body.dosage_unit || null,
       body.mechanism || null, body.brand_name || null, body.remark || null, body.status || 'active', now]
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
      suggested_dosage=?, suggested_ratio=?, dosage_unit=?, mechanism=?, brand_name=?, remark=?, status=? WHERE id=?`,
      [body.spec_content ?? existing[0].spec_content, body.formulation ?? existing[0].formulation,
       body.manufacturer ?? existing[0].manufacturer, body.suggested_dosage ?? existing[0].suggested_dosage,
       body.suggested_ratio ?? existing[0].suggested_ratio, body.dosage_unit ?? existing[0].dosage_unit,
       body.mechanism ?? existing[0].mechanism, body.brand_name ?? existing[0].brand_name,
       body.remark ?? existing[0].remark, body.status ?? existing[0].status, specId]
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

/** GET /api/pesticide-library/:id/relations — 获取药剂关联的病虫害列表 */
router.get('/:id/relations', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;

    const rows = queryToObjects(db, `
      SELECT p.id, p.dict_code, p.dict_name, p.dict_type, p.target_crops, p.description
      FROM pest_disease_dict p
      JOIN pesticide_pest_relation r ON p.id = r.pest_id
      WHERE r.pesticide_id = ?
    `, [id]);

    res.json({ success: true, data: rows });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/pesticide-library/:id/relations — 批量更新关联 */
router.put('/:id/relations', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { pestIds } = req.body;

    if (!Array.isArray(pestIds)) {
      return res.status(400).json({ success: false, error: 'pestIds must be an array' });
    }

    const db = getDatabase();

    // 事务处理：使用原生 SQL 事务
    db.run('BEGIN TRANSACTION');
    try {
      // 删除旧关联
      db.run('DELETE FROM pesticide_pest_relation WHERE pesticide_id = ?', [id]);

      // 插入新关联
      for (const pestId of pestIds) {
        db.run(`
          INSERT INTO pesticide_pest_relation (id, pesticide_id, pest_id)
          VALUES (?, ?, ?)
        `, [`${id}_${pestId}`, id, pestId]);
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      throw e;
    }

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pesticide-library/:id/relations/:pestId — 删除单个关联 */
router.delete('/:id/relations/:pestId', (req: Request, res: Response) => {
  try {
    const { id, pestId } = req.params;
    const db = getDatabase();

    db.run('DELETE FROM pesticide_pest_relation WHERE pesticide_id = ? AND pest_id = ?', [id, pestId]);
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
