/**
 * 肥料库（扁平化）API 路由
 * 2026-07-12：所有路由直接操作 fertilizer_specs，不再有 fertilizer_library 主表
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/** 生成编码 FG+年月日-4位流水号 */
function generateFertilizerCode(db: any): string {
  const today = new Date();
  const datePrefix = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;
  const prefix = `FG${datePrefix}`;
  const allCodes = queryToObjects<{ fertilizerCode: string }>(db,
    `SELECT fertilizer_code FROM fertilizer_specs`,
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

/** GET /api/fertilizer-specs — 分页查询 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { fertilizer_type, keyword, page = '1', limit = '10000' } = req.query as Record<string, string>;
    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(10000, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];
    if (fertilizer_type) { conditions.push('fertilizer_type = ?'); params.push(fertilizer_type); }
    if (keyword) { conditions.push("(fertilizer_name LIKE '%' || ? || '%' OR brand_name LIKE '%' || ? || '%')"); params.push(keyword, keyword); }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM fertilizer_specs ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM fertilizer_specs ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/fertilizer-specs — 新增 spec */
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
    const id = `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO fertilizer_specs (
      id, fertilizer_code, fertilizer_name, fertilizer_type, application_timing,
      function_desc, taboo_desc, shelf_life, storage_condition, supplier_info,
      brand_name, spec_content, manufacturer, suggested_dosage, suggested_ratio, dosage_unit,
      remark, unit_price, batch_number, production_date, expiration_date, stock_quantity,
      status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.fertilizer_name, body.fertilizer_type || null, body.application_timing || null,
       body.function_desc || null, body.taboo_desc || null, body.shelf_life || null,
       body.storage_condition || null, body.supplier_info || null,
       body.brand_name || '主品牌', body.spec_content || null, body.manufacturer || null,
       body.suggested_dosage || null, body.suggested_ratio || null,
       body.dosage_unit || 'kg/亩', body.remark || null,
       Number(body.unit_price) || 0, body.batch_number || null,
       body.production_date || null, body.expiration_date || null,
       Number(body.stock_quantity) || 0,
       body.status || 'active', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE fertilizer_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/fertilizer-specs/:id */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }
    res.json({ success: true, data: items[0] });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** PUT /api/fertilizer-specs/:id */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const body = req.body;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }

    db.run(`UPDATE fertilizer_specs SET
      fertilizer_name=?, fertilizer_type=?, application_timing=?,
      function_desc=?, taboo_desc=?, shelf_life=?, storage_condition=?, supplier_info=?,
      brand_name=?, spec_content=?, manufacturer=?, suggested_dosage=?, suggested_ratio=?, dosage_unit=?,
      remark=?, unit_price=?, batch_number=?, production_date=?, expiration_date=?, stock_quantity=?,
      status=?, update_time=? WHERE id=?`,
      [body.fertilizer_name ?? existing[0].fertilizer_name,
       body.fertilizer_type ?? existing[0].fertilizer_type,
       body.application_timing ?? existing[0].application_timing,
       body.function_desc ?? existing[0].function_desc,
       body.taboo_desc ?? existing[0].taboo_desc,
       body.shelf_life ?? existing[0].shelf_life,
       body.storage_condition ?? existing[0].storage_condition,
       body.supplier_info ?? existing[0].supplier_info,
       body.brand_name ?? existing[0].brand_name,
       body.spec_content ?? existing[0].spec_content,
       body.manufacturer ?? existing[0].manufacturer,
       body.suggested_dosage ?? existing[0].suggested_dosage,
       body.suggested_ratio ?? existing[0].suggested_ratio,
       body.dosage_unit ?? existing[0].dosage_unit,
       body.remark ?? existing[0].remark,
       body.unit_price != null ? Number(body.unit_price) : (existing[0].unit_price || 0),
       body.batch_number ?? existing[0].batch_number,
       body.production_date ?? existing[0].production_date,
       body.expiration_date ?? existing[0].expiration_date,
       body.stock_quantity != null ? Number(body.stock_quantity) : (existing[0].stock_quantity || 0),
       body.status ?? existing[0].status,
       new Date().toISOString(), id]
    );
    const updated = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/fertilizer-specs/:id */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT id FROM fertilizer_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }
    db.run(`DELETE FROM fertilizer_specs WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
