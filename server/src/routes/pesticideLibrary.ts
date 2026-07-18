/**
 * 药剂库（扁平化）API 路由
 * 2026-07-12：V2 扁平化重构，旧版 pesticide_library + pesticide_specs 双表合并为单表 pesticide_specs
 */
import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { queryToObjects, execCount } from '../utils/queryHelper';
// 2026-07-18 P2-M8：统一 LIMIT 常量
import { MAX_LIST_LIMIT } from '../lib/constants';

const router = Router();

/**
 * 2026-07-18 P3-L4 修复：本地时间戳（替换 toISOString，避免 UTC 跨天错位 bug）
 */
function nowLocalTimestamp(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}:${pad(d.getSeconds())}`;
}

/**
 * 2026-07-18 P2-H13 修复：saveDatabase 错误处理（磁盘写失败时仅警告，不阻断 HTTP 200）
 * - sql.js 是内存数据库，写入即对前端可见，saveDatabase 只是落盘
 * - 落盘失败时数据已在内存中，前端操作已生效，不应返回 500 误导用户
 */
function trySaveDatabase(): void {
  try {
    saveDatabase();
  } catch (e) {
    console.warn('[pesticideLibrary] saveDatabase 失败（数据已在内存中，重启前有效）:', (e as Error)?.message || e);
  }
}

/**
 * 2026-07-18 P2-M6 修复：从 req.body 同时取 camelCase / snake_case
 * - 与 POST 路径对称（POST 已支持两种命名）
 * - PUT 之前只取 camelCase，导致 snake_case 客户端发来的更新丢失字段
 */
function pickBody(body: any, camelKey: string, snakeKey: string): any {
  if (body == null) return undefined;
  if (body[camelKey] !== undefined) return body[camelKey];
  if (body[snakeKey] !== undefined) return body[snakeKey];
  return undefined;
}

/**
 * 生成药剂编码（PC-XXXX 格式，全表递增）
 */
function generatePesticideCode(db: any): string {
  // 2026-07-17：MAX + LIKE PC-% 走索引扫描（替代全表拉到 JS 端过滤）
  // UNIQUE 约束保护并发；写入端 caller 捕获 UNIQUE 错误后重试
  const maxRow = queryToObjects<{ pesticide_code: string | null }>(db,
    `SELECT MAX(pesticide_code) AS pesticide_code FROM pesticide_specs WHERE pesticide_code LIKE ?`,
    ['PC-%']
  );
  let maxSeq = 0;
  const currentMax = maxRow[0]?.pesticide_code;
  if (currentMax) {
    const match = currentMax.match(/^PC-(\d{4,})$/);
    if (match) {
      const seq = parseInt(match[1], 10);
      if (!isNaN(seq)) maxSeq = seq;
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
    // 2026-07-17：解除 100 条硬上限（前端 fetchItems 传 limit=10000 想拿全表做统计用，原 Math.min(100, ...) 导致统计永远 ≤100）
    // 上限提到 MAX_LIST_LIMIT 与前端保持一致；如需分页改为前端传 limit + page
    const limitNum = Math.min(MAX_LIST_LIMIT, Math.max(1, parseInt(limit, 10) || 20));
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

    // 2026-07-18 P2-M7 修复：UNIQUE 冲突重试（与 generateRecordCodeWithRetry 一致）
    // - 并发 INSERT 时同 code 可能冲突，重生成 code 后再试
    let code = generatePesticideCode(db);
    const now = nowLocalTimestamp();
    let id = `ps-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    const tryInsert = (codeToUse: string): boolean => {
      try {
        db.run(`INSERT INTO pesticide_specs (
          id, pesticide_code, pesticide_name, pesticide_type, ingredient, mechanism,
          function_desc, taboo_desc, target_pests, spec_content, formulation, manufacturer,
          brand_name, suggested_dosage, suggested_ratio, dosage_unit, remark,
          stock_quantity, stock_unit, unit_price, batch_number, production_date,
          expiration_date, package_spec, status, create_time, update_time
        ) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)`,
          [id, codeToUse, body.pesticide_name, pesticideTypeValue,
           body.ingredient || null, body.mechanism || null,
           body.function_desc || null, body.taboo_desc || null, body.target_pests || null,
           body.spec_content || null, body.formulation || null, body.manufacturer || null,
           body.brand_name || null, body.suggested_dosage || null, body.suggested_ratio || null,
           body.dosage_unit || null, body.remark || null,
           Number(body.stock_quantity) || 0, body.stock_unit || 'kg', Number(body.unit_price) || 0,
           body.batch_number || null, body.production_date || null, body.expiration_date || null,
           body.package_spec || null, body.status || 'active', now, now]
        );
        return true;
      } catch (e: any) {
        if (e.message?.includes('UNIQUE constraint failed') && e.message?.includes('pesticide_code')) {
          return false; // 需要重试
        }
        throw e; // 其他错误向上抛
      }
    };

    let inserted = tryInsert(code);
    let attempts = 0;
    while (!inserted && attempts < 5) {
      code = generatePesticideCode(db);
      attempts++;
      inserted = tryInsert(code);
    }
    if (!inserted) {
      throw new Error('药剂编码生成冲突重试 5 次仍失败');
    }

    const items = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE pesticide_code = ?`, [code]);
    trySaveDatabase();
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
    // 2026-07-18 P2-M6 修复：用 pickBody 同时取 camelCase / snake_case
    const pesticideTypeRaw = pickBody(body, 'pesticideType', 'pesticide_type');
    if (Array.isArray(pesticideTypeRaw)) {
      pesticideTypeValue = pesticideTypeRaw.length > 0 ? JSON.stringify(pesticideTypeRaw) : null;
    } else if (typeof pesticideTypeRaw === 'string') {
      pesticideTypeValue = pesticideTypeRaw.trim().startsWith('[') ? pesticideTypeRaw : JSON.stringify([pesticideTypeRaw]);
    }

    const now = nowLocalTimestamp();

    db.run(`UPDATE pesticide_specs SET
      pesticide_name=?, pesticide_type=?, ingredient=?, mechanism=?,
      function_desc=?, taboo_desc=?, target_pests=?, spec_content=?, formulation=?, manufacturer=?,
      brand_name=?, suggested_dosage=?, suggested_ratio=?, dosage_unit=?, remark=?,
      stock_quantity=?, stock_unit=?, unit_price=?, batch_number=?, production_date=?,
      expiration_date=?, package_spec=?, status=?, update_time=? WHERE id=?`,
      [body.pesticideName ?? existing[0].pesticideName,
       pesticideTypeValue !== undefined ? pesticideTypeValue : existing[0].pesticideTypes ?? existing[0].pesticide_type,
       body.ingredient ?? existing[0].ingredient,
       body.mechanism ?? existing[0].mechanism,
       body.functionDesc ?? existing[0].functionDesc ?? existing[0].function_desc,
       body.tabooDesc ?? existing[0].tabooDesc ?? existing[0].taboo_desc,
       body.targetPests ?? existing[0].targetPests ?? existing[0].target_pests,
       body.specContent ?? existing[0].specContent ?? existing[0].spec_content,
       body.formulation ?? existing[0].formulation,
       body.manufacturer ?? existing[0].manufacturer,
       body.brandName ?? existing[0].brandName ?? existing[0].brand_name,
       body.suggestedDosage ?? existing[0].suggestedDosage ?? existing[0].suggested_dosage,
       body.suggestedRatio ?? existing[0].suggestedRatio ?? existing[0].suggested_ratio,
       body.dosageUnit ?? existing[0].dosageUnit ?? existing[0].dosage_unit,
       body.remark ?? existing[0].remark,
       body.stockQuantity != null ? Number(body.stockQuantity) : (existing[0].stockQuantity ?? existing[0].stock_quantity ?? 0),
       body.stockUnit ?? existing[0].stockUnit ?? existing[0].stock_unit ?? 'kg',
       body.unitPrice != null ? Number(body.unitPrice) : (existing[0].unitPrice ?? existing[0].unit_price ?? 0),
       body.batchNumber ?? existing[0].batchNumber ?? existing[0].batch_number,
       body.productionDate ?? existing[0].productionDate ?? existing[0].production_date,
       body.expirationDate ?? existing[0].expirationDate ?? existing[0].expiration_date,
       body.packageSpec ?? existing[0].packageSpec ?? existing[0].package_spec,
       body.status ?? existing[0].status,
       now, id]
    );

    const updated = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    trySaveDatabase();
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
    trySaveDatabase();
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

    const now = nowLocalTimestamp();
    const spec = existing[0];

    // 2026-07-18 P0-C7 修复：库存更新 + 审计写入包事务，INSERT 失败时 ROLLBACK
    db.exec('BEGIN');
    try {
      // 原子更新库存
      db.run(`UPDATE pesticide_specs SET stock_quantity = stock_quantity + ?, update_time = ? WHERE id = ?`, [quantity, now, id]);

      // 写入库审计记录
      const recordId = `psi-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      db.run(`INSERT INTO pesticide_stock_in_records (
        id, spec_id, pesticide_code, pesticide_name, quantity, remark, create_time
      ) VALUES (?,?,?,?,?,?,?)`,
        [recordId, id, spec.pesticideCode, spec.pesticideName, quantity, remark || null, now]
      );

      db.exec('COMMIT');
    } catch (innerErr) {
      db.exec('ROLLBACK');
      throw innerErr;
    }

    const updated = queryToObjects(db, `SELECT * FROM pesticide_specs WHERE id = ?`, [id]);
    trySaveDatabase();
    const result = updated[0] || {};
    result.newStock = spec.stockQuantity + quantity;
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
