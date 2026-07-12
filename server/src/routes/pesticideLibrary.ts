/**
 * 药剂库（扁平化）API 路由
 * 2026-07-12：V2 扁平化重构，旧版 pesticide_library + pesticide_specs 双表合并为单表 pesticide_specs
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';

const router = Router();

/**
 * 生成药剂编码（PC-XXXX 格式，全表递增）
 */
function generatePesticideCode(db: any): string {
  const allCodes = queryToObjects<{ pesticideCode: string }>(db,
    `SELECT pesticide_code FROM pesticide_specs`,
  );
  let maxSeq = 0;
  for (const row of allCodes) {
    const code = row.pesticideCode || '';
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
    const { pesticide_type, keyword, pesticide_name, manufacturer, stock_low, stock_high, page = '1', limit = '20' } = req.query as Record<string, string>;

    const pageNum = Math.max(1, parseInt(page, 10) || 1);
    const limitNum = Math.min(100, Math.max(1, parseInt(limit, 10) || 20));
    const conditions: string[] = [];
    const params: any[] = [];

    // pesticide_type JSON 数组搜索
    if (pesticide_type) {
      conditions.push(`EXISTS (SELECT 1 FROM json_each(pesticide_specs.pesticide_type) WHERE json_each.value = ?)`);
      params.push(pesticide_type);
    }
    // 关键字搜索（药剂名称）
    const nameFilter = keyword || pesticide_name;
    if (nameFilter) {
      conditions.push("pesticide_name LIKE '%' || ? || '%'");
      params.push(nameFilter);
    }
    // 生产厂家
    if (manufacturer) {
      conditions.push("manufacturer LIKE '%' || ? || '%'");
      params.push(manufacturer);
    }
    // 库存范围
    if (stock_low) {
      conditions.push('stock_quantity <= ?');
      params.push(Number(stock_low));
    }
    if (stock_high) {
      conditions.push('stock_quantity >= ?');
      params.push(Number(stock_high));
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM pesticide_specs ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM pesticide_specs ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );

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
    if (!body.pesticide_name) {
      res.status(400).json({ success: false, error: '药剂名称为必填项' });
      return;
    }

    // pesticide_type 支持数组或 JSON 字符串
    let pesticideTypeValue: string | null = null;
    if (Array.isArray(body.pesticide_type) && body.pesticide_type.length > 0) {
      pesticideTypeValue = JSON.stringify(body.pesticide_type);
    } else if (Array.isArray(body.pesticideType) && body.pesticideType.length > 0) {
      pesticideTypeValue = JSON.stringify(body.pesticideType);
    } else if (typeof body.pesticide_type === 'string' && body.pesticide_type.trim()) {
      pesticideTypeValue = body.pesticide_type.trim().startsWith('[') ? body.pesticide_type : JSON.stringify([body.pesticide_type]);
    } else if (typeof body.pesticideType === 'string' && body.pesticideType.trim()) {
      pesticideTypeValue = body.pesticideType.trim().startsWith('[') ? body.pesticideType : JSON.stringify([body.pesticideType]);
    }

    const code = generatePesticideCode(db);
    const now = new Date().toISOString();
    const id = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO pesticide_specs (
      id, pesticide_code, pesticide_name, pesticide_type, ingredient, mechanism,
      function_desc, taboo_desc, target_pests, spec_content, formulation, manufacturer,
      brand_name, suggested_dosage, suggested_ratio, dosage_unit, remark,
      stock_quantity, stock_unit, unit_price, batch_number, production_date,
      expiration_date, package_spec, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.pesticide_name, pesticideTypeValue,
       body.ingredient || null, body.mechanism || null,
       body.function_desc || null, body.taboo_desc || null, body.target_pests || null,
       body.spec_content || null, body.formulation || null, body.manufacturer || null,
       body.brand_name || null, body.suggested_dosage || null, body.suggested_ratio || null,
       body.dosage_unit || null, body.remark || null,
       Number(body.stock_quantity) || 0, body.stock_unit || 'kg', Number(body.unit_price) || 0,
       body.batch_number || null, body.production_date || null, body.expiration_date || null,
       body.package_spec || null, body.status || 'active', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE pesticide_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** GET /api/pesticide-library/:id — 获取药剂详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    if (items.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }
    res.json({ success: true, data: items[0] });
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
    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }

    // pesticide_type 处理（数组或 JSON 字符串）
    let pesticideTypeValue: string | null | undefined = undefined;
    if (Array.isArray(body.pesticide_type)) {
      pesticideTypeValue = body.pesticide_type.length > 0 ? JSON.stringify(body.pesticide_type) : null;
    } else if (Array.isArray(body.pesticideType)) {
      pesticideTypeValue = body.pesticideType.length > 0 ? JSON.stringify(body.pesticideType) : null;
    } else if (typeof body.pesticide_type === 'string') {
      pesticideTypeValue = body.pesticide_type.trim().startsWith('[') ? body.pesticide_type : JSON.stringify([body.pesticide_type]);
    } else if (typeof body.pesticideType === 'string') {
      pesticideTypeValue = body.pesticideType.trim().startsWith('[') ? body.pesticideType : JSON.stringify([body.pesticideType]);
    }

    const now = new Date().toISOString();

    db.run(`UPDATE pesticide_specs SET
      pesticide_name=?, pesticide_type=?, ingredient=?, mechanism=?,
      function_desc=?, taboo_desc=?, target_pests=?, spec_content=?, formulation=?, manufacturer=?,
      brand_name=?, suggested_dosage=?, suggested_ratio=?, dosage_unit=?, remark=?,
      stock_quantity=?, stock_unit=?, unit_price=?, batch_number=?, production_date=?,
      expiration_date=?, package_spec=?, status=?, update_time=? WHERE id=?`,
      [body.pesticide_name ?? existing[0].pesticide_name,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticide_type,
       body.ingredient ?? existing[0].ingredient,
       body.mechanism ?? existing[0].mechanism,
       body.function_desc ?? existing[0].function_desc,
       body.taboo_desc ?? existing[0].taboo_desc,
       body.target_pests ?? existing[0].target_pests,
       body.spec_content ?? existing[0].spec_content,
       body.formulation ?? existing[0].formulation,
       body.manufacturer ?? existing[0].manufacturer,
       body.brand_name ?? existing[0].brand_name,
       body.suggested_dosage ?? existing[0].suggested_dosage,
       body.suggested_ratio ?? existing[0].suggested_ratio,
       body.dosage_unit ?? existing[0].dosage_unit,
       body.remark ?? existing[0].remark,
       body.stock_quantity != null ? Number(body.stock_quantity) : (existing[0].stock_quantity || 0),
       body.stock_unit ?? existing[0].stock_unit ?? 'kg',
       body.unit_price != null ? Number(body.unit_price) : (existing[0].unit_price || 0),
       body.batch_number ?? existing[0].batch_number,
       body.production_date ?? existing[0].production_date,
       body.expiration_date ?? existing[0].expiration_date,
       body.package_spec ?? existing[0].package_spec,
       body.status ?? existing[0].status,
       now, id]
    );

    const updated = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** DELETE /api/pesticide-library/:id — 删除药剂 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const existing = queryToObjects<Record<string, any>>(db, `SELECT id FROM pesticide_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }
    db.run(`DELETE FROM pesticide_specs WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

/** POST /api/pesticide-library/:id/stock-in — 入库增加库存 */
router.post('/:id/stock-in', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { quantity, remark } = req.body as { quantity?: number; remark?: string };

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: '入库数量必须大于 0' });
      return;
    }

    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '药剂不存在' }); return; }

    const now = new Date().toISOString();
    const spec = existing[0];

    // 原子更新库存
    db.run(`UPDATE pesticide_specs SET stock_quantity = stock_quantity + ?, update_time = ? WHERE id = ?`, [quantity, now, id]);

    // 写入库审计记录
    const recordId = `psi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.run(`INSERT INTO pesticide_stock_in_records (
      id, spec_id, pesticide_code, pesticide_name, quantity, remark, create_time
    ) VALUES (?,?,?,?,?,?,?)`,
      [recordId, id, spec.pesticideCode, spec.pesticideName, quantity, remark || null, now]
    );

    const updated = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    saveDatabase();
    const result = updated[0] || {};
    result.newStock = spec.stockQuantity + quantity;
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
