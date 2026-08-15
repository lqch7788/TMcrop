/**
 * 肥料库（扁平化）API 路由
 * 2026-07-12：所有路由直接操作 fertilizer_specs，不再有 fertilizer_library 主表
 * 2026-07-27 审核修复 C-6：所有 catch 统一走 handleError 脱敏 helper，避免泄露 SQL/堆栈
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
import { BusinessError } from '../services/fertilizer.service';
// 2026-08-15 审核修复：统一本地时间戳（toISOString 是 UTC，中国时区显示少 8 小时 — utc-timezone-id-bug 教训）
import { nowLocalTimestamp } from '../lib/timeUtils';

const router = Router();

/**
 * 统一错误处理（2026-07-27 审核修复 C-6）
 * - BusinessError → 透传 status + message + code
 * - 其他 Error → 500 + 脱敏的「操作失败」文本，详细堆栈写 console.error
 * - 避免前端 toast 直接展示 SQL/堆栈给用户
 */
function handleError(res: Response, error: unknown, logTag: string, fallback: string): void {
  console.error(`[fertilizerSpecs:${logTag}]`, error);
  if (error instanceof BusinessError) {
    res.status(error.httpStatus).json({ success: false, error: error.message, code: error.code });
    return;
  }
  res.status(500).json({ success: false, error: fallback });
}

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
    if (keyword) {
      // 关键字模糊匹配：肥料名称 / 品牌 / 肥料编码 / 生产厂家 / 成分含量
      // 修复"按编码或厂家搜不到"的 bug（用户常常用编码搜索）
      conditions.push(
        "(fertilizer_name LIKE '%' || ? || '%' " +
        "OR brand_name LIKE '%' || ? || '%' " +
        "OR fertilizer_code LIKE '%' || ? || '%' " +
        "OR manufacturer LIKE '%' || ? || '%' " +
        "OR spec_content LIKE '%' || ? || '%')"
      );
      params.push(keyword, keyword, keyword, keyword, keyword);
    }
    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';
    const total = execCount(db, `SELECT * FROM fertilizer_specs ${whereClause}`, params);
    const offset = (pageNum - 1) * limitNum;
    const items = queryToObjects(db,
      `SELECT * FROM fertilizer_specs ${whereClause} ORDER BY create_time DESC LIMIT ? OFFSET ?`,
      [...params, limitNum, offset]
    );
    res.json({ success: true, data: items, meta: { total, page: pageNum, limit: limitNum } });
  } catch (error) {
    handleError(res, error, 'op', '操作失败');
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
    const now = nowLocalTimestamp();
    const id = `fs-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    db.run(`INSERT INTO fertilizer_specs (
      id, fertilizer_code, fertilizer_name, fertilizer_type, application_timing,
      function_desc, taboo_desc, shelf_life, storage_condition, supplier_info,
      brand_name, spec_content, manufacturer, suggested_dosage, suggested_ratio, dosage_unit,
      remark, unit_price, batch_number, production_date, expiration_date, stock_quantity,
      package_spec, stock_unit, status, create_time, update_time
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
      [id, code, body.fertilizer_name, body.fertilizer_type || null, body.application_timing || null,
       body.function_desc || null, body.taboo_desc || null, body.shelf_life || null,
       body.storage_condition || null, body.supplier_info || null,
       body.brand_name || '主品牌', body.spec_content || null, body.manufacturer || null,
       body.suggested_dosage || null, body.suggested_ratio || null,
       body.dosage_unit || 'kg/亩', body.remark || null,
       Number(body.unit_price) || 0, body.batch_number || null,
       body.production_date || null, body.expiration_date || null,
       Number(body.stock_quantity) || 0, body.package_spec || null,
       body.stock_unit || 'kg', body.status || 'active', now, now]
    );

    const items = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE fertilizer_code = ?`, [code]);
    saveDatabase();
    res.status(201).json({ success: true, data: items[0] || null });
  } catch (error) {
    handleError(res, error, 'create', '新增失败');
  }
});

/** POST /api/fertilizer-specs/:id/stock-in — 入库增加库存 */
router.post('/:id/stock-in', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const { quantity, remark, unitPrice, operatorId, operatorName, source } = req.body as {
      quantity?: number; remark?: string;
      unitPrice?: number; operatorId?: string; operatorName?: string; source?: string;
    };

    if (!quantity || quantity <= 0) {
      res.status(400).json({ success: false, error: '入库数量必须大于 0' });
      return;
    }

    const existing = queryToObjects<Record<string, any>>(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    if (existing.length === 0) { res.status(404).json({ success: false, error: '肥料不存在' }); return; }

    const now = nowLocalTimestamp();
    const spec = existing[0];

    // 原子更新库存（避免并发读-改-写竞态）
    db.run(`UPDATE fertilizer_specs SET stock_quantity = stock_quantity + ?, update_time = ? WHERE id = ?`, [quantity, now, id]);

    // 写入库记录（审计追溯）—— 2026-07-27 补全 unit_price/operator/source 字段
    const recordId = `fsi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
    db.run(`INSERT INTO fertilizer_stock_in_records (
      id, spec_id, fertilizer_code, fertilizer_name, quantity, remark, create_time,
      unit_price, operator_id, operator_name, source
    ) VALUES (?,?,?,?,?,?,?,?,?,?,?)`,
      [
        recordId, id, spec.fertilizerCode, spec.fertilizerName, quantity, remark || null, now,
        unitPrice ?? null,
        operatorId ?? null,
        operatorName ?? null,
        source || 'manual',
      ]
    );

    const updated = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    saveDatabase();
    const result = updated[0] || {};
    result.newStock = spec.stockQuantity + quantity;
    res.json({ success: true, data: result });
  } catch (error) {
    handleError(res, error, 'stock-in', '入库失败');
  }
});

/** GET /api/fertilizer-specs/:id/stock-in-records — 查询某肥料的所有入库记录（按时间倒序） */
router.get('/:id/stock-in-records', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const { id } = req.params;
    const items = queryToObjects(
      db,
      `SELECT id, spec_id, fertilizer_code, fertilizer_name, quantity, remark,
              create_time, unit_price, operator_id, operator_name, source
         FROM fertilizer_stock_in_records
        WHERE spec_id = ?
        ORDER BY create_time DESC, id DESC`,
      [id],
    );
    res.json({ success: true, data: items });
  } catch (error) {
    handleError(res, error, 'stock-in-records', '查询入库记录失败');
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
    handleError(res, error, 'get', '查询失败');
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
      package_spec=?, stock_unit=?,
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
       body.package_spec ?? existing[0].package_spec,
       body.stock_unit ?? existing[0].stock_unit ?? 'kg',
       body.status ?? existing[0].status,
       nowLocalTimestamp(), id]
    );
    const updated = queryToObjects(db, `SELECT * FROM fertilizer_specs WHERE id = ?`, [id]);
    saveDatabase();
    res.json({ success: true, data: updated[0] || null });
  } catch (error) {
    handleError(res, error, 'update', '更新失败');
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
    handleError(res, error, 'delete', '删除失败');
  }
});

export default router;
