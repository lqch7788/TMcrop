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
import { archiveDeletedDocument } from '../db/deletedDocumentsArchive';

const router = Router();

/** PUT 允许更新的列白名单（其余一律 400，防列名注入） */
const ALLOWED_UPDATE_COLUMNS = new Set([
  'code', 'date', 'applicant', 'warehouse_location', 'reviewer', 'operator',
  'production_batch_code', 'source_application_codes', 'execute_status',
  'execute_status_class', 'materials', 'create_by',
  // 2026-09-27 审计方案：作废原因写入 remarks（作废=改 cancelled + 备注原因）
  'remarks',
]);

/**
 * 2026-09-27 两步出库（用户决策：先建单待发料，仓库确认后扣库存）
 * 判断该状态类是否"已扣过库存"：
 *  - completed / partial → 已扣（编辑/删除需恢复）
 *  - pending_out（待出库）/ cancelled（已取消）→ 从未扣减（编辑/删除不得恢复，否则凭空增库存）
 */
function isDeductedClass(cls: unknown): boolean {
  return cls === 'completed' || cls === 'partial';
}

/** 按状态类派生中文状态文案 */
function statusTextByClass(cls: string): string {
  if (cls === 'completed') return '已出库';
  if (cls === 'partial') return '部分出库';
  if (cls === 'cancelled') return '已取消';
  return '待出库';
}

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

/** 解析物料行里的 batchNo 字符串（如 "B20260415(5袋),EQ20260125(2卷)"）→ 批次分配列表
 * 2026-09-27 审计修复：export 供退料路由复用（退料行复制自出库明细，batchNo 是 FEFO 显示串） */
export function parseBatchAllocations(line: any): Array<{ code: string; batchNo: string; qty: number }> {
  const code = line.materialCode || line.code || '';
  // 2026-09-27 修复：数量字段兼容出库行（actualQuantity）与退料行（returnQuantity）——
  // 此前退料行无 actualQuantity 字段恒返回空数组，退料批次解析形同虚设
  const qty = Number(line.actualQuantity ?? line.actualQty ?? line.returnQuantity ?? line.quantity ?? 0) || 0;
  if (!code || qty <= 0) return [];
  const batchStr = typeof line.batchNo === 'string' ? line.batchNo : '';
  const out: Array<{ code: string; batchNo: string; qty: number }> = [];
  const matches = batchStr.matchAll(/([^(,\s]+)\((\d+(?:\.\d+)?)[^)]*\)/g);
  for (const m of matches) out.push({ code, batchNo: m[1], qty: Number(m[2]) });
  if (out.length === 0) out.push({ code, batchNo: '', qty }); // 无批次细分 → 只动主表
  return out;
}

/**
 * 写库存流水（审计：出库扣减/编辑调整/删除恢复/退料入库）
 * 2026-09-27 审计修复：原实现 operator/balance/remarks 全部硬编码
 * （operator_id='system'、operator_name='领料出库'、balance 恒 0、文案固定），
 * 导致"谁领走的、变动前后余量"完全不可追溯。现全部由调用方传入。
 */
export function writeStockTransaction(
  db: any,
  seq: number,
  transactionType: string,
  executeId: string | number,
  executeCode: string,
  materialCode: string,
  qty: number,
  opts?: {
    operatorId?: string;
    operatorName?: string;
    balanceBefore?: number;
    balanceAfter?: number;
    remark?: string;
    businessType?: string;
  }
): void {
  const now = nowLocalTimestamp();
  // 2026-09-26 修复：restore 与 deduct 各自从 seq=1 起号，同秒内会撞 UNIQUE(transaction_id)。
  // 加事务类型前缀 + 随机后缀保证全局唯一。
  const typeTagMap: Record<string, string> = {
    material_outbound: 'OUT',
    material_restore: 'RST',
    material_return_in: 'RTN',
    material_return_undo: 'RTU',
    // 2026-09-27 审计修复：物料入库流水（此前入库完全不写流水，追溯链断裂）
    material_inbound: 'INB',
    material_reverse_inbound: 'RIB',
  };
  const typeTag = typeTagMap[transactionType] || 'TXN';
  const id = `EXEC-${typeTag}-${now.replace(/[-: ]/g, '')}-${seq}-${Math.random().toString(36).substring(2, 8)}`;
  db.run(
    `INSERT INTO inventory_transaction
      (id, transaction_id, instance_id, stock_type, transaction_type, quantity,
       balance_before, balance_after, business_id, business_type, business_code,
       operator_id, operator_name, operate_date, remarks, create_time)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
      id, id, materialCode, 'material', transactionType, qty,
      Number(opts?.balanceBefore) || 0, Number(opts?.balanceAfter) || 0,
      String(executeId), opts?.businessType || 'material_execute', executeCode,
      opts?.operatorId || 'system', opts?.operatorName || '仓库',
      // 2026-09-29：默认备注改为中性文案。此前硬编码"领料出库库存流水"，
      // 入库/冲销路径若未显式传 remark 会写成语义错误（显示"领料出库"）的记录。
      now, opts?.remark || `库存变动（${transactionType}）`, now,
    ]
  );
}

/**
 * 扣减出库物料库存（事务内调用）：
 * - 行内带 applicationCode 时，以申请单实际申请量为权威回填 requestedQuantity（防改大绕过超发校验）
 * - 无批次行 → 用主表量自动建"默认批次"再走 FEFO（防两本账漂移）
 * - 批次/主表任一不足 → 抛错（fail loud，调用方 ROLLBACK）
 * - 流水补齐操作人/变动前后余额/备注
 * 返回 { stockSeq } 并把每行的 batchNo 显示串写回
 */
function deductExecuteStock(
  db: any,
  materials: any[],
  executeId: string | number,
  executeCode: string,
  operatorInfo?: { applicant?: string; operator?: string }
): { stockSeq: number } {
  let stockSeq = 0;
  for (const m of materials) {
    const code = m.materialCode || m.code || '';
    const qty = Number(m.actualQuantity ?? m.actualQty ?? m.quantity ?? 0) || 0;
    if (!code || qty <= 0) continue;

    // 2026-09-27 审计修复（P0-7）：requestedQuantity 在编辑弹窗可被任意改大，
    // 超发校验形同虚设。行内带 applicationCode 时以申请单实际申请量为权威覆盖。
    const appCode = String(m.applicationCode || '');
    if (appCode) {
      const appRows = db.exec('SELECT materials FROM material_requests WHERE request_code = ?', [appCode]);
      if (appRows.length > 0 && appRows[0].values.length > 0) {
        const appMats = parseMaterials(appRows[0].values[0][0]);
        const match = appMats.find((x: any) => (x.materialCode || x.code) === code);
        const authoritative = Number(match?.requestedQuantity) || 0;
        if (authoritative > 0) m.requestedQuantity = authoritative;
      }
    }

    // 2026-09-27 超发校验：实发量不得超过申请量，防错账
    const requestedQty = Number(m.requestedQuantity) || 0;
    if (requestedQty > 0 && qty > requestedQty) {
      throw new Error(`物料 ${code} 实发 ${qty} 超过申请量 ${requestedQty}，不允许超发`);
    }

    // 主表账：存在则必须足量（2026-09-27 审计修复：此前仅在无批次时校验且 UPDATE 用
    // MAX(0,...) 静默截断——主表与批次账可各自漂移且无告警）
    // 2026-09-27 修复：主表行按 code 唯一（总量行），SELECT/UPDATE 用主键锁定单行——
    // 此前 WHERE code 会把同编码的所有批次行全部扣减（结构性炸弹，见 P1-7）
    const mainRows = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    const mainQty = mainRows.length > 0 && mainRows[0].values.length > 0 ? Number(mainRows[0].values[0][1]) || 0 : null;
    const mainId = mainRows.length > 0 && mainRows[0].values.length > 0 ? mainRows[0].values[0][0] : null;
    if (mainQty !== null && mainQty < qty) {
      throw new Error(`物料 ${code} 库存不足：需要 ${qty}，主表现有 ${mainQty}`);
    }

    // 2026-09-27 审计修复（P0-1 两本账）：物料没有任何批次行时，
    // 先用主表量建"默认批次"再走 FEFO，避免"只扣主表不扣批次"造成两账长期漂移
    if (mainQty !== null && mainQty > 0) {
      const cntRows = db.exec('SELECT COUNT(*) FROM batch_inventory WHERE material_code = ?', [code]);
      const hasBatches = cntRows.length > 0 && Number(cntRows[0].values[0][0]) > 0;
      if (!hasBatches) {
        db.run(
          `INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, create_time, update_time)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [`bi-default-${code}-${Date.now()}`, code, m.materialName || '', '默认批次', '', '', m.unit || '', mainQty, mainQty, nowLocalTimestamp(), nowLocalTimestamp()]
        );
      }
    }

    const { allocations, fulfilled } = fefoAllocate(code, qty);
    const batchTotal = allocations.reduce((s, a) => s + a.quantity, 0);

    // 批次账：有批次行但不足 → 直接拒绝（fail loud）
    if (allocations.length > 0 && fulfilled < qty) {
      throw new Error(`物料 ${code} 批次库存不足：需要 ${qty}，批次可分配仅 ${batchTotal}`);
    }

    // 扣批次（校验实际生效行数：0 行 = 账目异常，暴露而非静默）
    for (const alloc of allocations) {
      db.run(
        `UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, update_time = ? WHERE material_code = ? AND batch_no = ? AND remaining_quantity >= ?`,
        [alloc.quantity, nowLocalTimestamp(), code, alloc.batchNo, alloc.quantity]
      );
      if (db.getRowsModified() === 0) {
        throw new Error(`物料 ${code} 批次 ${alloc.batchNo} 扣减失败（批次余量不足或已变更）`);
      }
    }
    // 扣主表（按主键锁定单行，防同 code 多行被连坐扣减）
    if (mainQty !== null && mainId !== null) {
      db.run(
        'UPDATE materials SET quantity = quantity - ?, lastUpdateTime = ? WHERE id = ?',
        [qty, nowLocalTimestamp(), mainId]
      );
    }

    // 把 FEFO 分配结果写成 batchNo 显示串（前端详情展示用），无批次时置空
    m.batchNo = allocations.length > 0
      ? allocations.map((a) => `${a.batchNo}(${a.quantity}${a.unit})`).join(',')
      : '';

    // 流水：补操作人/余额/备注（2026-09-27 审计修复：此前全部硬编码不可追溯）
    const operatorName = String(operatorInfo?.operator || '').trim() || String(operatorInfo?.applicant || '').trim() || '仓库';
    writeStockTransaction(db, ++stockSeq, 'material_outbound', executeId, executeCode, code, qty, {
      operatorName,
      balanceBefore: mainQty ?? 0,
      balanceAfter: mainQty !== null ? mainQty - qty : 0,
      remark: `领料出库 ${executeCode}｜领用人 ${operatorInfo?.applicant || '-'}`,
    });
  }
  return { stockSeq };
}

/**
 * 恢复出库物料库存（事务内调用）：按 batchNo 字符串还原批次 + 主表
 * 2026-09-27 审计修复：流水补操作人与恢复原因；批次行不存在时告警（不再静默写流水）。
 * 说明：恢复流水 balance 保持 0——其语义是冲销对应出库流水，余额链权威在 outbound 侧。
 */
function restoreExecuteStock(
  db: any,
  materials: any[],
  executeId: string | number,
  executeCode: string,
  operatorInfo?: { applicant?: string; operator?: string; reason?: string }
): void {
  let seq = 0;
  const mainTotals: Record<string, number> = {};
  const operatorName = String(operatorInfo?.operator || '').trim() || String(operatorInfo?.applicant || '').trim() || '仓库';
  const reason = operatorInfo?.reason || '出库单编辑或删除恢复';
  for (const line of materials) {
    const allocs = parseBatchAllocations(line);
    for (const a of allocs) {
      if (a.batchNo) {
        // 有批次细分 → 逐批次恢复
        db.run(
          `UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = ? WHERE material_code = ? AND batch_no = ?`,
          [a.qty, nowLocalTimestamp(), a.code, a.batchNo]
        );
        if (db.getRowsModified() === 0) {
          console.warn(`[领料出库] 恢复批次未命中：物料 ${a.code} 批次 ${a.batchNo} 不存在（出库单 ${executeCode}）`);
        }
      }
      writeStockTransaction(db, ++seq, 'material_restore', executeId, executeCode, a.code, a.qty, {
        operatorName,
        remark: `${reason} ${executeCode}`,
      });
    }
    // 主表按行总量恢复（与扣减时"批次+主表同时扣"的语义镜像；无批次细分行 = 只恢复主表）
    const lineQty = allocs.reduce((s, a) => s + a.qty, 0);
    if (lineQty > 0) mainTotals[allocs[0].code] = (mainTotals[allocs[0].code] || 0) + lineQty;
  }
  // 统一恢复主表（主表行存在才恢复；按主键锁定单行，防同 code 多行被连坐恢复）
  for (const [code, qty] of Object.entries(mainTotals)) {
    const rows = db.exec('SELECT id FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    if (rows.length === 0 || rows[0].values.length === 0) continue;
    db.run(
      'UPDATE materials SET quantity = quantity + ?, lastUpdateTime = ? WHERE id = ?',
      [qty, nowLocalTimestamp(), rows[0].values[0][0]]
    );
  }
}

/** 回写来源申请单的 dispatch_status（事务内调用，聚合已发数量判断 部分/全部 出库） */
export function recalcDispatchStatus(db: any, sourceCodes: string[], now: string): void {
  for (const srcCode of sourceCodes) {
    const reqRows = db.exec('SELECT materials FROM material_requests WHERE request_code = ?', [srcCode]);
    if (reqRows.length === 0 || reqRows[0].values.length === 0) continue;
    const reqMaterials = parseMaterials(reqRows[0].values[0][0]);
    if (reqMaterials.length === 0) continue;

    // 聚合此来源申请单所有出库记录中的实发数量
    // 2026-09-27 两步出库：只统计"已扣库存"的单据（completed/partial）——
    // 待出库单（pending_out）尚未发料，计入会让申请单误显示"部分出库"
    const dispatchedMap: Record<string, number> = {};
    const allExecs = db.exec('SELECT materials, source_application_codes, execute_status_class FROM material_executes');
    if (allExecs.length > 0) {
      const execCols = allExecs[0].columns;
      const matIdx = execCols.indexOf('materials');
      const srcIdx = execCols.indexOf('source_application_codes');
      const clsIdx = execCols.indexOf('execute_status_class');
      for (const row of allExecs[0].values) {
        if (!isDeductedClass(row[clsIdx])) continue;
        const srcList = parseMaterials(row[srcIdx]);
        if (!srcList.includes(srcCode)) continue;
        for (const m of parseMaterials(row[matIdx])) {
          // 2026-09-27 审计修复：按行归属——只累加 applicationCode 指向本申请单的行。
          // 此前多来源混单时把整单物料同时计入所有来源单，同一批物料被重复累加，
          // 可能把不该完成的申请单误判成 complete（行级来源缺失时回退整单口径，兼容旧数据）
          const lineSrc = String(m.applicationCode || '');
          if (lineSrc && lineSrc !== srcCode) continue;
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
      // 2026-09-29 审计修复：撤单/改单后重算时不得清除人工"结案"标记。
      // 'closed' 是申请单的人工终态（materialRequest.ts 的结案 API），
      // 原实现无条件写 NULL → 已结案的申请单在出库单被改动后静默"复活"为未出库。
      db.run(
        "UPDATE material_requests SET dispatch_status = NULL, update_time = ? WHERE request_code = ? AND IFNULL(dispatch_status, '') <> 'closed'",
        [now, srcCode]
      );
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

/**
 * 出库单操作历史 — GET /api/material-executes/:id/logs
 * 2026-09-27 审计修复：出库单此前无操作历史入口（申请单有），
 * 谁建的、谁确认发料、谁改过完全不可见。复用 operation_logs 四路匹配：
 * resource_id（数字 id）/ 路径含 id / 路径含 code（DELETE 场景）/ 请求体含 code（POST 场景）
 */
router.get('/:id/logs', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    // 先解析出库单编码（日志里 DELETE 用 code 作为路径）
    let code = '';
    const row = db.exec('SELECT code FROM material_executes WHERE id = ?', [id]);
    if (row.length > 0 && row[0].values.length > 0) code = String(row[0].values[0][0] || '');

    const results = db.exec(
      `SELECT id, username, action, module, resource_type, description, created_at
       FROM operation_logs
       WHERE resource_id = ?
          OR description LIKE ?
          OR description LIKE ?
          OR (description LIKE ? AND new_value LIKE ?)
       ORDER BY created_at DESC LIMIT 50`,
      [id, `%/material-executes/${id}%`, code ? `%/material-executes/${code}%` : `%__NOMATCH__%`, '%/material-executes%', code ? `%"code":"${code}"%` : '%__NOMATCH__%']
    );
    const logs: Record<string, unknown>[] = [];
    if (results.length > 0) {
      const cols = results[0].columns;
      for (const r of results[0].values) {
        const item: Record<string, unknown> = {};
        r.forEach((v: unknown, i: number) => { item[cols[i]] = v; });
        logs.push(item);
      }
    }
    res.json({ success: true, data: logs });
  } catch (error) {
    console.error('获取出库单操作历史失败:', error);
    res.status(500).json({ success: false, error: '获取出库单操作历史失败' });
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
    // 2026-09-27 两步出库（用户决策）：默认建"待出库"单（不扣库存），
    // 仓库确认发料时调 POST /:id/confirm 才扣库存；如需一步直达可显式传 completed/partial
    const execute_status_class = req.body.execute_status_class || 'pending_out';
    const execute_status = req.body.execute_status || statusTextByClass(execute_status_class);
    const materials: any[] = Array.isArray(req.body.materials)
      ? req.body.materials
      : parseMaterials(req.body.materials);
    const create_by = req.body.create_by || '';
    const willDeduct = isDeductedClass(execute_status_class);

    // 事务开始：扣库存（仅已完成/部分出库时）→ INSERT → 回写派单状态，全有或全无
    db.run('BEGIN');
    try {
      if (willDeduct) {
        // 扣库存（失败抛错 → ROLLBACK）；同时把每行 batchNo 显示串写入 materials
        deductExecuteStock(db, materials, id, code, { applicant, operator });
      }

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

/**
 * 确认发料 — POST /api/material-executes/:id/confirm
 * 2026-09-27 两步出库（用户决策）：待出库单 → 仓库确认 → 事务内扣库存 + 置状态 + 回写派单状态
 */
router.post('/:id/confirm', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const now = nowLocalTimestamp();

    const stmt = db.prepare('SELECT * FROM material_executes WHERE id = ?');
    stmt.bind([id]);
    let row: Record<string, unknown> | null = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();

    if (!row || Object.keys(row).length === 0) {
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }
    if (row.execute_status_class !== 'pending_out') {
      return res.status(400).json({ success: false, error: `当前状态（${row.execute_status || row.execute_status_class}）不是待出库，无法确认发料` });
    }

    const materials = parseMaterials(row.materials);
    if (materials.length === 0) {
      return res.status(400).json({ success: false, error: '出库单无物料明细，无法确认发料' });
    }

    // 状态判定：全部足额 → 已出库；否则部分出库
    const isPartial = materials.some((m: any) => {
      const req = Number(m.requestedQuantity) || 0;
      const act = Number(m.actualQuantity ?? m.actualQty ?? m.quantity ?? 0) || 0;
      return req > 0 && act < req;
    });
    const newClass = isPartial ? 'partial' : 'completed';
    const newStatus = statusTextByClass(newClass);
    const sourceCodes = parseMaterials(row.source_application_codes);

    db.run('BEGIN');
    try {
      // 扣库存（失败抛错 → ROLLBACK）；同时回写 batchNo 显示串
      deductExecuteStock(db, materials, id, String(row.code || ''), {
        applicant: String(row.applicant || ''),
        operator: String(req.body.operator || row.operator || ''),
      });

      db.run(
        'UPDATE material_executes SET execute_status = ?, execute_status_class = ?, materials = ?, operator = ?, update_time = ? WHERE id = ?',
        [newStatus, newClass, JSON.stringify(materials), req.body.operator || row.operator || '', now, id]
      );

      recalcDispatchStatus(db, sourceCodes, now);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[领料出库] 确认发料失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '确认发料失败' });
    }

    saveDatabase();
    res.json({ success: true, data: { id, executeStatus: newStatus, executeStatusClass: newClass } });
  } catch (error) {
    console.error('确认发料失败:', error);
    res.status(500).json({ success: false, error: '确认发料失败' });
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

    // 2026-09-27 审计修复：放开"已完成出库不允许编辑"限制——原限制导致发错数量只能整单删除重建。
    // 编辑已完成单时下方事务会"先按旧明细恢复库存、再按新明细扣减"（净差额调整，全程事务内），
    // 库存不足时整体回滚（400），安全性与新建单一致。
    const oldRowWasCompleted = oldRow.execute_status_class === 'completed';
    if (oldRowWasCompleted) {
      console.log(`[领料出库] 编辑已完成出库单 ${oldRow.code}：将按新旧明细差额调整库存`);
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

    // 2026-09-27 两步出库：库存调整改为"状态感知"——
    // 旧状态已扣库存才恢复；新状态会扣库存才扣减；待出库↔已出库的状态切换也正确调整库存
    const oldDeducted = isDeductedClass(oldRow.execute_status_class);
    const newClass = (clean.execute_status_class as string | undefined) ?? String(oldRow.execute_status_class || 'pending_out');
    const newDeducted = isDeductedClass(newClass);
    const materialsChanged = clean.materials !== undefined;
    const statusChanged = clean.execute_status_class !== undefined && clean.execute_status_class !== oldRow.execute_status_class;

    // 流水操作人信息（新旧行取并）
    const infoApplicant = String((clean.applicant as string) ?? oldRow.applicant ?? '');
    const infoOperator = String((clean.operator as string) ?? oldRow.operator ?? '');

    db.run('BEGIN');
    try {
      if (materialsChanged || statusChanged) {
        // 1) 旧账已扣 → 先恢复
        if (oldDeducted) {
          restoreExecuteStock(db, parseMaterials(oldRow.materials), id, String(oldRow.code || ''), {
            applicant: infoApplicant, operator: infoOperator, reason: '出库单编辑恢复',
          });
        }
        // 2) 新账要扣 → 再扣减（含状态升级为已出库/部分出库的场景）
        if (newDeducted) {
          const newMaterials = materialsChanged ? parseMaterials(clean.materials) : parseMaterials(oldRow.materials);
          deductExecuteStock(db, newMaterials, id, String(oldRow.code || ''), { applicant: infoApplicant, operator: infoOperator });
          // 新明细回写 batchNo 显示串（仅当本次改了明细）
          if (materialsChanged) clean.materials = JSON.stringify(newMaterials);
        }
      }
      // 状态文案与状态类保持一致（前端可能只传其一）
      // 2026-09-27 审计修复：补写 clean 时必须同步 updateKeys——
      // 否则 fields（按 updateKeys 生成）与 values（按 clean 键生成）数量不一致，
      // 只传 execute_status_class 时 db.run 参数越界报 "column index out of range"（实测）
      if (clean.execute_status_class !== undefined && clean.execute_status === undefined) {
        clean.execute_status = statusTextByClass(String(clean.execute_status_class));
        updateKeys.push('execute_status');
      }

      const fields = updateKeys.map((k) => `${k} = ?`).join(', ');
      const values: any[] = Object.keys(clean).map((k) => clean[k]);
      values.push(now, id);
      db.run(`UPDATE material_executes SET ${fields}, update_time = ? WHERE id = ?`, values);

      // 来源单变化 / 物料变化 / 状态变化 → 重算 dispatch_status
      // （2026-09-27：状态从待出库→已出库也改变了"已发量"，必须重算）
      if (clean.source_application_codes !== undefined || materialsChanged || statusChanged) {
        // 2026-09-27 审计修复：新旧来源单取并集重算——此前只算新集合，
        // 被移除的旧申请单 dispatch_status 永久残留（误显示"部分出库"且因删除保护永久不可删）
        const oldCodes = parseMaterials(oldRow.source_application_codes);
        const newCodes = clean.source_application_codes !== undefined
          ? parseMaterials(clean.source_application_codes)
          : oldCodes;
        recalcDispatchStatus(db, Array.from(new Set([...oldCodes, ...newCodes])), now);
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

/**
 * 删除 — DELETE /api/material-executes/:id
 * 2026-09-27 审计方案（追溯保护，三层）：
 *  ① 已发料单据（completed/partial）**禁止物理删除** → 引导使用【作废】（cancelled，单据本体保留）
 *  ② 允许删除的仅剩待出库单（pending_out，未扣库存、无业务影响）
 *  ③ 删除前整行快照写入 deleted_documents_archive（永久留存，可按单号追溯；日志 180 天会被清理）
 */
router.delete('/:id', (req: Request, res: Response) => {
  const db = getDatabase();
  try {
    const { id } = req.params;
    const now = nowLocalTimestamp();

    // 读取整行（快照 + 重算 dispatch_status 用）
    const preStmt = db.prepare('SELECT * FROM material_executes WHERE id = ?');
    preStmt.bind([id]);
    let oldRow: Record<string, unknown> | null = null;
    if (preStmt.step()) oldRow = preStmt.getAsObject();
    preStmt.free();
    if (!oldRow || Object.keys(oldRow).length === 0) {
      return res.status(404).json({ success: false, error: '出库单不存在' });
    }

    const oldCode = String(oldRow.code || '');
    const oldClass = String(oldRow.execute_status_class || '');
    const sourceCodes = parseMaterials(oldRow.source_application_codes);

    // ① 已发料 → 拒绝删除（追溯链保护）
    if (isDeductedClass(oldClass)) {
      return res.status(400).json({
        success: false,
        error: '已出库单据不允许删除（会丢失领料追溯记录）。请使用【作废】：库存自动恢复、单据保留可查询',
      });
    }

    // ②③ 待出库单：归档快照 + 删除（同一事务）
    const reqUser = (req as unknown as { user?: { name?: string; username?: string } }).user || {};
    const deletedBy = String(reqUser.name || reqUser.username || '');
    // 2026-09-27 修复：reason 必须是"有意义的字符串"——过滤事件对象被 toString 的
    // "[object Object]" 等脏值（前端已防御，此处兜底防直调 API 绕过）
    const rawReason = String((req.query.reason as string) || '');
    const reason = rawReason === '[object Object]' ? '' : rawReason;
    const snapshot: Record<string, unknown> = {
      ...oldRow,
      source_application_codes: sourceCodes,
      materials: parseMaterials(oldRow.materials),
    };

    db.run('BEGIN');
    try {
      archiveDeletedDocument({
        docType: 'material_execute',
        docId: String(oldRow.id || id),
        docCode: oldCode,
        snapshot,
        deletedBy,
        reason,
      });
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
    res.json({ success: true, data: { id, archived: true } });
  } catch (error) {
    console.error('删除出库单失败:', error);
    res.status(500).json({ success: false, error: '删除出库单失败' });
  }
});

export default router;
