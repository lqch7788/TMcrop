/**
 * 领料出库 API 路由
 * 提供出库单的 CRUD 操作
 *
 * 数据表: material_executes
 * API前缀: /api/material-executes
 *
 * 2026-09-26 P0 重构（用户授权"修复所有P0代码缺陷"）：
 *  1. 出库扣库存下沉到后端事务：POST 扣减 / PUT 差额调整 / DELETE 恢复，
 *     全部 BEGIN/COMMIT 包裹 + 写 inventory_transaction 流水 + 库存不足 400 报错（fail loud）
 *  2. UPDATE 列名白名单（防 SQL 注入）
 *  3. 出库单号按当日 MAX+1 生成（修复硬编码 001 同日重号）+ 业务时间用本地时区（修复 UTC 错档）
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { fefoAllocate } from '../db/batchInventory';
import { nowLocalTimestamp } from '../lib/timeUtils';

const router = Router();

/** PUT 允许更新的列白名单（其余一律 400，防列名注入） */
const ALLOWED_UPDATE_COLUMNS = new Set([
  'code', 'date', 'applicant', 'warehouse_location', 'reviewer', 'operator',
  'production_batch_code', 'source_application_codes', 'execute_status',
  'execute_status_class', 'materials', 'create_by',
]);

/** 本地日期 YYYY-MM-DD（禁止 toISOString 的 UTC 日期，避免 0-8 点错档） */
function localDateStr(): string {
  const d = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}${pad(d.getMonth() + 1)}${pad(d.getDate())}`;
}

/** 生成出库单号：CK + YYYYMMDD + 3位当日流水（查询当日 MAX+1，禁止硬编码 001） */
function generateExecuteCode(db: any): string {
  const dateStr = localDateStr();
  const prefix = `CK${dateStr}`;
  const results = db.exec(
    `SELECT code FROM material_executes WHERE code LIKE ? ORDER BY code DESC LIMIT 1`,
    [`${prefix}%`]
  );
  let maxSerial = 0;
  if (results.length > 0 && results[0].values.length > 0) {
    const lastCode = String(results[0].values[0][0] || '');
    maxSerial = parseInt(lastCode.slice(prefix.length), 10) || 0;
  }
  return `${prefix}${String(maxSerial + 1).padStart(3, '0')}`;
}

/** 宽松解析 materials 列（兼容双重编码历史数据），保证返回数组 */
function parseMaterials(raw: unknown): any[] {
  let cur: unknown = raw;
  for (let i = 0; i < 3 && typeof cur === 'string'; i++) {
    try { cur = JSON.parse(cur as string); } catch { return []; }
  }
  return Array.isArray(cur) ? cur : [];
}

/** 解析物料行里的 batchNo 字符串（如 "B20260415(5袋),EQ20260125(2卷)"）→ 批次分配列表 */
function parseBatchAllocations(line: any): Array<{ code: string; batchNo: string; qty: number }> {
  const code = line.materialCode || line.code || '';
  const qty = Number(line.actualQuantity ?? line.actualQty ?? line.quantity ?? 0) || 0;
  if (!code || qty <= 0) return [];
  const batchStr = typeof line.batchNo === 'string' ? line.batchNo : '';
  const out: Array<{ code: string; batchNo: string; qty: number }> = [];
  const matches = batchStr.matchAll(/([^(,\s]+)\((\d+(?:\.\d+)?)[^)]*\)/g);
  for (const m of matches) out.push({ code, batchNo: m[1], qty: Number(m[2]) });
  if (out.length === 0) out.push({ code, batchNo: '', qty }); // 无批次细分 → 只动主表
  return out;
}

/** 写库存流水（审计：出库扣减/编辑调整/删除恢复） */
function writeStockTransaction(
  db: any,
  seq: number,
  transactionType: string,
  executeId: string | number,
  executeCode: string,
  materialCode: string,
  qty: number
): void {
  const now = nowLocalTimestamp();
  // 2026-09-26 修复：restore 与 deduct 各自从 seq=1 起号，同秒内会撞 UNIQUE(transaction_id)。
  // 加事务类型前缀 + 随机后缀保证全局唯一。
  const typeTag = transactionType === 'material_outbound' ? 'OUT' : 'RST';
  const id = `EXEC-${typeTag}-${now.replace(/[-: ]/g, '')}-${seq}-${Math.random().toString(36).substring(2, 8)}`;
  db.run(
    `INSERT INTO inventory_transaction
      (id, transaction_id, instance_id, stock_type, transaction_type, quantity,
       balance_before, balance_after, business_id, business_type, business_code,
       operator_id, operator_name, operate_date, remarks, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, id, materialCode, 'material', transactionType, qty,
      0, 0, String(executeId), 'material_execute', executeCode,
      'system', '领料出库', now, '领料出库库存流水', now,
    ]
  );
}

/**
 * 扣减出库物料库存（事务内调用）：
 * - 有批次库存 → FEFO 扣批次 + 同步扣 materials 主表（与 /materials/batch-deduct 语义一致）
 * - 无批次行 → 仅扣主表（保留历史兜底行为）
 * - 库存不足 → 抛错（调用方 ROLLBACK + 400），不再静默部分扣
 * 返回 { allocations, stockSeq } 并把每行的 batchNo 显示串写回
 */
function deductExecuteStock(db: any, materials: any[], executeId: string | number, executeCode: string): { stockSeq: number } {
  let stockSeq = 0;
  for (const m of materials) {
    const code = m.materialCode || m.code || '';
    const qty = Number(m.actualQuantity ?? m.actualQty ?? m.quantity ?? 0) || 0;
    if (!code || qty <= 0) continue;

    const { allocations, fulfilled } = fefoAllocate(code, qty);
    const batchTotal = allocations.reduce((s, a) => s + a.quantity, 0);

    // 批次账：有批次行但不足 → 直接拒绝（fail loud）
    if (allocations.length > 0 && fulfilled < qty) {
      throw new Error(`物料 ${code} 批次库存不足：需要 ${qty}，批次可分配仅 ${batchTotal}`);
    }

    // 主表账：主表存在则需足量
    const mainRows = db.exec('SELECT quantity FROM materials WHERE code = ?', [code]);
    const mainQty = mainRows.length > 0 && mainRows[0].values.length > 0 ? Number(mainRows[0].values[0][0]) || 0 : null;
    if (mainQty !== null && mainQty < qty && allocations.length === 0) {
      throw new Error(`物料 ${code} 库存不足：需要 ${qty}，主表现有 ${mainQty}`);
    }

    // 扣批次
    for (const alloc of allocations) {
      db.run(
        `UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE material_code = ? AND batch_no = ? AND remaining_quantity >= ?`,
        [alloc.quantity, nowLocalTimestamp(), code, alloc.batchNo, alloc.quantity]
      );
    }
    // 扣主表
    if (mainQty !== null) {
      db.run(
        'UPDATE materials SET quantity = MAX(0, quantity - ?), lastUpdateTime = ? WHERE code = ?',
        [qty, nowLocalTimestamp(), code]
      );
    }

    // 把 FEFO 分配结果写成 batchNo 显示串（前端详情展示用），无批次时置空
    m.batchNo = allocations.length > 0
      ? allocations.map((a) => `${a.batchNo}(${a.quantity}${a.unit})`).join(',')
      : '';
    writeStockTransaction(db, ++stockSeq, 'material_outbound', executeId, executeCode, code, qty);
  }
  return { stockSeq };
}

/** 恢复出库物料库存（事务内调用）：按 batchNo 字符串还原批次 + 主表 */
function restoreExecuteStock(db: any, materials: any[], executeId: string | number, executeCode: string): void {
  let seq = 0;
  const mainTotals: Record<string, number> = {};
  for (const line of materials) {
    const allocs = parseBatchAllocations(line);
    for (const a of allocs) {
      if (a.batchNo) {
        // 有批次细分 → 逐批次恢复
        db.run(
          `UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE material_code = ? AND batch_no = ?`,
          [a.qty, nowLocalTimestamp(), a.code, a.batchNo]
        );
      }
      writeStockTransaction(db, ++seq, 'material_restore', executeId, executeCode, a.code, a.qty);
    }
    // 主表按行总量恢复（与扣减时"批次+主表同时扣"的语义镜像；无批次细分行 = 只恢复主表）
    const lineQty = allocs.reduce((s, a) => s + a.qty, 0);
    if (lineQty > 0) mainTotals[allocs[0].code] = (mainTotals[allocs[0].code] || 0) + lineQty;
  }
  // 统一恢复主表（主表行存在才恢复）
  for (const [code, qty] of Object.entries(mainTotals)) {
    const rows = db.exec('SELECT id FROM materials WHERE code = ?', [code]);
    if (rows.length === 0 || rows[0].values.length === 0) continue;
    db.run(
      'UPDATE materials SET quantity = quantity + ?, lastUpdateTime = ? WHERE code = ?',
      [qty, nowLocalTimestamp(), code]
    );
  }
}

/** 回写来源申请单的 dispatch_status（事务内调用，聚合已发数量判断 部分/全部 出库） */
function recalcDispatchStatus(db: any, sourceCodes: string[], now: string): void {
  for (const srcCode of sourceCodes) {
    const reqRows = db.exec('SELECT materials FROM material_requests WHERE request_code = ?', [srcCode]);
    if (reqRows.length === 0 || reqRows[0].values.length === 0) continue;
    const reqMaterials = parseMaterials(reqRows[0].values[0][0]);
    if (reqMaterials.length === 0) continue;

    // 聚合此来源申请单所有出库记录中的实发数量
    const dispatchedMap: Record<string, number> = {};
    const allExecs = db.exec('SELECT materials, source_application_codes FROM material_executes');
    if (allExecs.length > 0) {
      const execCols = allExecs[0].columns;
      const matIdx = execCols.indexOf('materials');
      const srcIdx = execCols.indexOf('source_application_codes');
      for (const row of allExecs[0].values) {
        const srcList = parseMaterials(row[srcIdx]);
        if (!srcList.includes(srcCode)) continue;
        for (const m of parseMaterials(row[matIdx])) {
          const key = m.materialCode || '';
          dispatchedMap[key] = (dispatchedMap[key] || 0) + (Number(m.actualQuantity) || 0);
        }
      }
    }

    let allFulfilled = true;
    let anyDispatched = false;
    for (const rm of reqMaterials) {
      const key = rm.materialCode || '';
      const requested = Number(rm.requestedQuantity) || 0;
      const dispatched = dispatchedMap[key] || 0;
      if (dispatched > 0) anyDispatched = true;
      if (dispatched < requested) allFulfilled = false;
    }

    if (anyDispatched) {
      db.run(
        'UPDATE material_requests SET dispatch_status = ?, update_time = ? WHERE request_code = ?',
        [allFulfilled ? 'complete' : 'partial', now, srcCode]
      );
    } else {
      db.run('UPDATE material_requests SET dispatch_status = NULL, update_time = ? WHERE request_code = ?', [now, srcCode]);
    }
  }
}

/** 查询列表 — GET /api/material-executes */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const results = db.exec('SELECT * FROM material_executes ORDER BY date DESC, create_time DESC');
    const resultSet = results.length > 0 ? results[0] : null;
    const columns: string[] = resultSet ? resultSet.columns : [];
    // values 是二维数组 [[行1_val1, 行1_val2, ...], [行2_val1, ...]]
    const items = resultSet
      ? resultSet.values.map((rowValues: any[]) => {
          const item: Record<string, unknown> = {};
          rowValues.forEach((val, i) => { item[columns[i]] = val; });
          // 解析 JSON 字段（兼容双重编码）
          if (item.source_application_codes) item.source_application_codes = parseMaterials(item.source_application_codes);
          if (item.materials) item.materials = parseMaterials(item.materials);
          return item;
        })
      : [];
    res.json({ success: true, data: items });
  } catch (error) {
    console.error('获取出库单列表失败:', error);
    res.status(500).json({ success: false, error: '获取出库单列表失败' });
  }
});

/** 查询单个 — GET /api/material-executes/:id */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    let item: Record<string, unknown> | null = null;
    if (stmt.step()) item = stmt.getAsObject();
    stmt.free();

    if (!item || Object.keys(item).length === 0) {
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }
    // 2026-09-26：JSON.parse 加防护（兼容双重编码历史数据，不再裸抛）
    if (item.source_application_codes) item.source_application_codes = parseMaterials(item.source_application_codes);
    if (item.materials) item.materials = parseMaterials(item.materials);
    res.json({ success: true, data: item });
  } catch (error) {
    console.error('获取出库单详情失败:', error);
    res.status(500).json({ success: false, error: '获取出库单详情失败' });
  }
});

/** 创建 — POST /api/material-executes（事务内：插入 + 扣库存 + 流水 + 回写派单状态） */
router.post('/', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const dateStr = localDateStr();
    let code = req.body.code || '';
    // 前端传的 code 可能重复（如删除后序号复用），后端再次验重；为空则按当日 MAX+1 生成
    if (code) {
      const dupRows = db.exec('SELECT id FROM material_executes WHERE code = ?', [code]);
      if (dupRows.length > 0 && dupRows[0].values.length > 0) {
        code = generateExecuteCode(db);
      }
    } else {
      code = generateExecuteCode(db);
    }

    const id = req.body.id || `CK${Date.now()}`;
    const now = nowLocalTimestamp();
    const applicant = req.body.applicant || '';
    const warehouse_location = req.body.warehouse_location || '';
    const reviewer = req.body.reviewer || '';
    const operator = req.body.operator || '';
    const production_batch_code = req.body.production_batch_code || '';
    const sourceCodes: string[] = Array.isArray(req.body.source_application_codes)
      ? req.body.source_application_codes
      : parseMaterials(req.body.source_application_codes);
    const source_application_codes = JSON.stringify(sourceCodes);
    const execute_status = req.body.execute_status || '已出库';
    const execute_status_class = req.body.execute_status_class || 'completed';
    const materials: any[] = Array.isArray(req.body.materials)
      ? req.body.materials
      : parseMaterials(req.body.materials);
    const create_by = req.body.create_by || '';

    // 事务开始：扣库存（先）→ INSERT（带 batchNo 显示串）→ 回写派单状态，全有或全无
    db.run('BEGIN');
    try {
      // 扣库存（失败抛错 → ROLLBACK）；同时把每行 batchNo 显示串写入 materials
      deductExecuteStock(db, materials, id, code);

      db.run(`
        INSERT INTO material_executes (
          id, code, date, applicant, warehouse_location, reviewer, operator,
          production_batch_code, source_application_codes, execute_status,
          execute_status_class, materials, create_by, create_time, update_time
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        id, code, req.body.date || dateStr, applicant, warehouse_location, reviewer, operator,
        production_batch_code, source_application_codes, execute_status,
        execute_status_class, JSON.stringify(materials), create_by, now, now,
      ]);

      // 回写来源申请单 dispatch_status
      recalcDispatchStatus(db, sourceCodes, now);

      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[领料出库] 创建失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '创建出库单失败' });
    }

    saveDatabase();
    res.status(201).json({ success: true, data: { id, code } });
  } catch (error) {
    console.error('创建出库单失败:', error);
    res.status(500).json({ success: false, error: '创建出库单失败' });
  }
});

/** 更新 — PUT /api/material-executes/:id（事务内：差额调整库存） */
router.put('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const updates = req.body;
    const now = nowLocalTimestamp();

    // 查是否存在
    const stmt = db.prepare('SELECT * FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    let oldRow: Record<string, unknown> | null = null;
    if (stmt.step()) oldRow = stmt.getAsObject();
    stmt.free();

    if (!oldRow || Object.keys(oldRow).length === 0) {
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }

    // 2026-09-26 P0 修复（SQL 注入）：列名白名单
    const updateKeys = Object.keys(updates).filter((k) => ALLOWED_UPDATE_COLUMNS.has(k));
    const illegalKeys = Object.keys(updates).filter((k) => !ALLOWED_UPDATE_COLUMNS.has(k));
    if (illegalKeys.length > 0) {
      return res.status(400).json({ success: false, error: `包含非法更新字段: ${illegalKeys.join(', ')}` });
    }
    if (updateKeys.length === 0) {
      return res.status(400).json({ success: false, error: '没有需要更新的字段' });
    }

    // JSON 字段序列化
    const clean: Record<string, unknown> = {};
    for (const k of updateKeys) {
      if (['source_application_codes', 'materials'].includes(k)) {
        clean[k] = JSON.stringify(updates[k] ?? []);
      } else {
        clean[k] = updates[k];
      }
    }

    // 物料变化 → 先恢复旧出库库存，再按新明细扣减（事务内，全有或全无）
    const materialsChanged = clean.materials !== undefined;
    db.run('BEGIN');
    try {
      if (materialsChanged) {
        const oldMaterials = parseMaterials(oldRow.materials);
        restoreExecuteStock(db, oldMaterials, id, String(oldRow.code || ''));
        const newMaterials = parseMaterials(clean.materials);
        deductExecuteStock(db, newMaterials, id, String(oldRow.code || ''));
        // 新明细回写 batchNo 显示串
        clean.materials = JSON.stringify(newMaterials);
      }

      const fields = updateKeys.map((k) => `${k} = ?`).join(', ');
      const values: any[] = Object.keys(clean).map((k) => clean[k]);
      values.push(now, id);
      db.run(`UPDATE material_executes SET ${fields}, update_time = ? WHERE id = ?`, values);

      // 来源单变化 → 重算 dispatch_status
      if (clean.source_application_codes !== undefined) {
        recalcDispatchStatus(db, parseMaterials(clean.source_application_codes), now);
      }

      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[领料出库] 更新失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '更新出库单失败' });
    }

    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('更新出库单失败:', error);
    res.status(500).json({ success: false, error: '更新出库单失败' });
  }
});

/** 删除 — DELETE /api/material-executes/:id（事务内：恢复库存 + 删除 + 重算派单状态） */
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const now = nowLocalTimestamp();

    // 删除前读取整行（来源单号 + 物料明细，用于恢复库存与重算 dispatch_status）
    const preStmt = db.prepare('SELECT code, source_application_codes, materials FROM material_executes WHERE id = ?');
    preStmt.bind([id]);
    let oldCode = '';
    let sourceCodes: string[] = [];
    let oldMaterials: any[] = [];
    if (preStmt.step()) {
      const row = preStmt.getAsObject();
      oldCode = String(row.code || '');
      sourceCodes = parseMaterials(row.source_application_codes);
      oldMaterials = parseMaterials(row.materials);
    }
    preStmt.free();

    db.run('BEGIN');
    try {
      // 恢复库存（删除出库单 = 撤销出库）
      restoreExecuteStock(db, oldMaterials, id, oldCode);
      db.run('DELETE FROM material_executes WHERE id = ?', [id]);
      if (sourceCodes.length > 0) {
        recalcDispatchStatus(db, sourceCodes, now);
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[领料出库] 删除失败已回滚:', e);
      return res.status(500).json({ success: false, error: e instanceof Error ? e.message : '删除出库单失败' });
    }

    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除出库单失败:', error);
    res.status(500).json({ success: false, error: '删除出库单失败' });
  }
});

export default router;
