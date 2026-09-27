/**
 * 物料管理 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import * as materialsDb from '../db/materials';
import { upsertBatchInventory } from '../db/batchInventory';
// 2026-09-27 审计修复：入库写库存流水（复用出库侧的 writeStockTransaction）+
// 入库撤销回收库存（reverseInboundStock，与出库恢复同模式）
import { writeStockTransaction } from './materialExecute';
import { nowLocalTimestamp } from '../lib/timeUtils';

const router = Router();

// ==================== 物料管理 ====================

/**
 * 获取所有物料
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const materials = materialsDb.getAllMaterials();
    res.json(materials);
  } catch (error) {
    console.error('获取物料列表失败:', error);
    res.status(500).json({ error: '获取物料列表失败' });
  }
});

/**
 * 创建物料
 * 修复：返回完整物料记录（不仅是 id），符合 MEMORY.md "后端 POST/PUT 必须返回完整记录" 铁律
 */
router.post('/', (req: Request, res: Response) => {
  try {
    const material = req.body;
    const id = materialsDb.createMaterial({
      code: material.code,
      name: material.name,
      category: material.category,
      specification: material.specification,
      unit: material.unit,
      quantity: material.quantity || 0,
      minStock: material.minStock || 0,
      maxStock: material.maxStock || 0,
      price: material.price || '',
      supplier: material.supplier || '',
      location: material.location || '',
      barcode: material.barcode || '',
      batchNo: material.batchNo || '',
      productionDate: material.productionDate || '',
      expiryDate: material.expiryDate || '',
      lastUpdateTime: new Date().toISOString(),
      dataStatus: material.dataStatus || '启用'
    });
    // INSERT 后立即 SELECT 完整记录返回
    const created = materialsDb.getMaterialById(id);
    if (!created) {
      // 极端兜底：刚 INSERT 完查不到，返回至少带 id 的对象
      return res.status(201).json({ id });
    }
    res.status(201).json(created);
  } catch (error) {
    console.error('创建物料失败:', error);
    res.status(500).json({ error: '创建物料失败' });
  }
});

// ==================== 入库记录管理 ====================
// 注意：入库记录路由必须在 /:id 路由之前定义，避免 /inbound 被 :id 匹配

/**
 * 获取所有入库记录
 */
router.get('/inbound', (req: Request, res: Response) => {
  try {
    const records = materialsDb.getAllInboundRecords();
    // 解析 materials JSON 字段，并兼容旧字段名 materialCode→code, materialName→name
    const parsedRecords = records.map(record => ({
      ...record,
      materials: record.materials ? JSON.parse(record.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    }));
    res.json(parsedRecords);
  } catch (error) {
    console.error('获取入库记录失败:', error);
    res.status(500).json({ error: '获取入库记录失败' });
  }
});

/**
 * 回收入库单的库存（事务内调用）：
 * - 主表按 code 锁定单行回收（防同 code 多行连坐）
 * - 批次账按 (code, batchNo) 回收；批次余量不足 → 抛错回滚（fail loud）
 * - 写 material_reverse_inbound 流水（操作人/余额/备注可追溯）
 * 2026-09-27 审计修复：此前已完成入库单删除/回退状态完全不回收库存（虚增）。
 */
function reverseInboundStock(
  db: any,
  materials: any[],
  inboundId: string | number,
  inboundCode: string,
  operatorName: string
): void {
  const now = nowLocalTimestamp();
  let seq = 0;
  for (const m of materials) {
    const code = String(m.code || m.materialCode || '').trim();
    const qty = Number(m.quantity) || 0;
    if (!code || qty <= 0) continue;
    // 批次号与 upsertBatchInventory 同口径（空 → 默认批次）
    const batchNo = String(m.batchNo || '').trim() || '默认批次';

    // 主表回收（按 code 锁定单行）
    const mainRows = db.exec('SELECT id, quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
    if (mainRows.length > 0 && mainRows[0].values.length > 0) {
      const mainId = mainRows[0].values[0][0];
      const mainQty = Number(mainRows[0].values[0][1]) || 0;
      if (mainQty < qty) {
        throw new Error(`物料 ${code} 当前库存 ${mainQty} 不足以回收入库量 ${qty}（库存已被后续使用），无法撤销入库`);
      }
      db.run('UPDATE materials SET quantity = quantity - ?, lastUpdateTime = ? WHERE id = ?', [qty, now, mainId]);
    }

    // 批次账回收（按 code + batchNo 匹配；未命中显式告警而非静默）
    // total_quantity 与 remaining 同步扣回（与 upsertBatchInventory 累加对称）
    const batchRows = db.exec('SELECT id, remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?', [code, batchNo]);
    if (batchRows.length > 0 && batchRows[0].values.length > 0) {
      const batchId = batchRows[0].values[0][0];
      const batchRemain = Number(batchRows[0].values[0][1]) || 0;
      if (batchRemain < qty) {
        throw new Error(`物料 ${code} 批次 ${batchNo} 余量 ${batchRemain} 不足以回收入库量 ${qty}`);
      }
      db.run(
        'UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, total_quantity = total_quantity - ?, update_time = ? WHERE id = ?',
        [qty, qty, now, batchId]
      );
    } else {
      console.warn(`[物料入库] 回收批次未命中：物料 ${code} 批次 ${batchNo}（入库单 ${inboundCode}）`);
    }

    writeStockTransaction(db, ++seq, 'material_reverse_inbound', inboundId, inboundCode, code, qty, {
      operatorName,
      remark: `入库单撤销回收 ${inboundCode}`,
      businessType: 'material_inbound',
    });
  }
}

/** 解析入库单明细（兼容双重 JSON 编码与旧字段名 materialCode/code） */
function parseInboundMaterials(raw: unknown): any[] {
  let cur: unknown = raw;
  for (let i = 0; i < 3 && typeof cur === 'string'; i++) {
    try { cur = JSON.parse(cur as string); } catch { return []; }
  }
  return Array.isArray(cur) ? cur : [];
}

/**
 * 创建入库记录
 */
router.post('/inbound', (req: Request, res: Response) => {
  try {
    const record = req.body;
    const db = getDatabase();
    const matList = Array.isArray(record.materials) ? record.materials : [];
    const inboundCode = String(record.code || '');
    const status = record.status || 'completed';
    // 入库即完成 → 自动同步物料库存 + 批次库存（FEFO）
    const willSync = status === 'completed' && matList.length > 0;

    // 2026-09-27 审计修复：整个流程放进事务（此前落库/同步/批次三步骤无事务，
    // 任一失败会出现"入库单在、库存没加"的断裂）+ 写 material_inbound 库存流水
    // （此前入库完全不写流水，物料详情的"库存流水"永远看不到入库记录）
    db.run('BEGIN');
    let id = 0;
    try {
      // 流水余额：入库前主表余量（按 code 取单行）
      const beforeMap = new Map<string, number>();
      if (willSync) {
        for (const m of matList) {
          const code = String(m.code || m.materialCode || '').trim();
          if (!code || beforeMap.has(code)) continue;
          const r = db.exec('SELECT quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
          beforeMap.set(code, r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0);
        }
      }

      id = materialsDb.createInboundRecord({
        code: inboundCode,
        inboundDate: record.inboundDate,
        supplier: record.supplier,
        operator: record.operator,
        status,
        materials: matList,
      }, { persist: false });

      if (willSync) {
        // 主表 + 批次账同步（persist:false——事务内禁止 saveDatabase，COMMIT 后统一落盘）
        materialsDb.syncInboundToMaterials(matList, { persist: false });
        upsertBatchInventory(matList, id);
        // 库存流水（操作人/变动前后余额/关联单号）
        let seq = 0;
        const operatorName = String(record.operator || '').trim() || '仓库';
        for (const m of matList) {
          const code = String(m.code || m.materialCode || '').trim();
          const qty = Number(m.quantity) || 0;
          if (!code || qty <= 0) continue;
          writeStockTransaction(db, ++seq, 'material_inbound', id, inboundCode, code, qty, {
            operatorName,
            balanceBefore: beforeMap.get(code) ?? 0,
            balanceAfter: (beforeMap.get(code) ?? 0) + qty,
            remark: `物料入库 ${inboundCode}｜入库人 ${operatorName}`,
            businessType: 'material_inbound',
          });
        }
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[物料入库] 创建失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '创建入库记录失败' });
    }
    saveDatabase();
    // 返回完整记录（含解析后的 materials 数组，兼容旧字段名）
    const created = materialsDb.getInboundRecordById(id);
    res.status(201).json({
      ...created,
      materials: created?.materials ? JSON.parse(created.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('创建入库记录失败:', error);
    res.status(500).json({ error: '创建入库记录失败' });
  }
});

/**
 * 根据ID获取入库记录
 */
router.get('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const record = materialsDb.getInboundRecordById(id);
    if (!record) {
      return res.status(404).json({ error: '入库记录不存在' });
    }
    res.json({
      ...record,
      materials: record.materials ? JSON.parse(record.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('获取入库记录详情失败:', error);
    res.status(500).json({ error: '获取入库记录详情失败' });
  }
});

/**
 * 更新入库记录
 * 2026-09-27 审计修复：状态感知的库存联动（与出库单 PUT 同模式）——
 *  - 旧状态已完成 → 先回收入库库存（completed→pending/voided 或编辑已完成的明细）
 *  - 新状态已完成 → 按新明细同步主表 + 批次账 + 流水
 * 全程事务内，任一环节失败整体回滚（此前 pending→completed 单向、反向不回收=虚增库存）
 */
router.put('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    const db = getDatabase();

    // 2026-09-27 安全修复：列名白名单（此前 updateInboundRecord 动态拼接任意列名）
    const ALLOWED_COLUMNS = new Set(['code', 'inboundDate', 'supplier', 'operator', 'status', 'materials']);
    const illegalKeys = Object.keys(updates).filter(k => !ALLOWED_COLUMNS.has(k));
    if (illegalKeys.length > 0) {
      return res.status(400).json({ success: false, error: `包含非法更新字段: ${illegalKeys.join(', ')}` });
    }

    const oldRecord = materialsDb.getInboundRecordById(id);
    if (!oldRecord) {
      return res.status(404).json({ error: '入库记录不存在' });
    }
    const oldStatus = String(oldRecord.status || 'pending');
    const newStatus = String(updates.status ?? oldStatus);
    const materialsChanged = updates.materials !== undefined;
    const oldMaterials = parseInboundMaterials(oldRecord.materials);
    const newMaterials = materialsChanged
      ? (Array.isArray(updates.materials) ? updates.materials : parseInboundMaterials(updates.materials))
      : oldMaterials;
    const operatorName = String(updates.operator ?? oldRecord.operator ?? '').trim() || '仓库';

    const fields = Object.keys(updates).map(k => `${k} = ?`).join(', ');
    const values: any[] = Object.keys(updates).map(k =>
      k === 'materials' ? JSON.stringify(newMaterials) : updates[k]
    );

    db.run('BEGIN');
    try {
      // 1) 旧账已入 → 先回收（状态退出 completed 或已完成单改了明细）
      if (oldStatus === 'completed' && (newStatus !== 'completed' || materialsChanged)) {
        reverseInboundStock(db, oldMaterials, id, String(oldRecord.code || ''), operatorName);
      }
      // 2) 新账要入 → 按新明细同步 + 流水（pending→completed 或已完成单改明细后重新入账）
      if (newStatus === 'completed' && newMaterials.length > 0) {
        const beforeMap = new Map<string, number>();
        for (const m of newMaterials) {
          const code = String(m.code || m.materialCode || '').trim();
          if (!code || beforeMap.has(code)) continue;
          const r = db.exec('SELECT quantity FROM materials WHERE code = ? ORDER BY id ASC LIMIT 1', [code]);
          beforeMap.set(code, r.length > 0 && r[0].values.length > 0 ? Number(r[0].values[0][0]) || 0 : 0);
        }
        materialsDb.syncInboundToMaterials(newMaterials, { persist: false });
        upsertBatchInventory(newMaterials, id);
        let seq = 0;
        for (const m of newMaterials) {
          const code = String(m.code || m.materialCode || '').trim();
          const qty = Number(m.quantity) || 0;
          if (!code || qty <= 0) continue;
          writeStockTransaction(db, ++seq, 'material_inbound', id, String(updates.code || oldRecord.code || ''), code, qty, {
            operatorName,
            balanceBefore: beforeMap.get(code) ?? 0,
            balanceAfter: (beforeMap.get(code) ?? 0) + qty,
            remark: `物料入库（更新） ${String(updates.code || oldRecord.code || '')}｜操作人 ${operatorName}`,
            businessType: 'material_inbound',
          });
        }
      }
      // 3) 更新入库单本体
      values.push(id);
      db.run(`UPDATE inbound_records SET ${fields} WHERE id = ?`, values);
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[物料入库] 更新失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '更新入库记录失败' });
    }
    saveDatabase();
    // 返回更新后的完整记录（兼容旧字段名）
    const updated = materialsDb.getInboundRecordById(id);
    res.json({
      ...updated,
      materials: updated?.materials ? JSON.parse(updated.materials).map((m: any) => ({
        ...m,
        code: m.code || m.materialCode || '',
        name: m.name || m.materialName || '',
      })) : []
    });
  } catch (error) {
    console.error('更新入库记录失败:', error);
    res.status(500).json({ error: '更新入库记录失败' });
  }
});

// ==================== V14.0: 批次库存 & FEFO ====================

/**
 * FEFO 自动分配 — POST /api/materials/batch-allocate
 * Body: { materialCode, quantity }
 * 返回分配方案（按过期日期升序，早过期优先扣）
 */
router.post('/batch-allocate', (req: Request, res: Response) => {
  try {
    const { materialCode, quantity } = req.body;
    if (!materialCode || !quantity || quantity <= 0) {
      return res.status(400).json({ success: false, error: '请提供有效的物料编码和数量' });
    }
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT batch_no, expiry_date, remaining_quantity, unit
       FROM batch_inventory
       WHERE material_code = ? AND remaining_quantity > 0
       ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC, create_time ASC`
    );
    stmt.bind([materialCode]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    const allocations: Array<{ batchNo: string; expiryDate: string; quantity: number; unit: string }> = [];
    let remaining = quantity;
    for (const row of rows) {
      if (remaining <= 0) break;
      const take = Math.min(row.remaining_quantity as number, remaining);
      allocations.push({ batchNo: row.batch_no as string, expiryDate: (row.expiry_date as string) || '', quantity: take, unit: (row.unit as string) || '' });
      remaining -= take;
    }
    res.json({ success: true, data: { allocations, fulfilled: quantity - remaining } });
  } catch (error) {
    console.error('FEFO 分配失败:', error);
    res.status(500).json({ success: false, error: 'FEFO 分配失败' });
  }
});

/**
 * 扣减批次库存 — POST /api/materials/batch-deduct
 * 同时更新 materials 主表 quantity（物料库存列表显示此字段）
 */
router.post('/batch-deduct', (req: Request, res: Response) => {
  try {
    const { allocations } = req.body;
    if (!Array.isArray(allocations) || allocations.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的扣减分配方案' });
    }
    const db = getDatabase();
    const stmt = db.prepare(
      `UPDATE batch_inventory SET remaining_quantity = remaining_quantity - ?, update_time = datetime('now','localtime')
       WHERE material_code = ? AND batch_no = ? AND remaining_quantity >= ?`
    );
    for (const alloc of allocations) {
      stmt.bind([alloc.quantity, alloc.materialCode, alloc.batchNo, alloc.quantity]);
      stmt.step();
      stmt.reset();
    }
    stmt.free();

    // 同步扣减 materials 主表 quantity（按 materialCode 汇总）
    const totalPerMaterial: Record<string, number> = {};
    for (const alloc of allocations) {
      totalPerMaterial[alloc.materialCode] = (totalPerMaterial[alloc.materialCode] || 0) + alloc.quantity;
    }
    const matStmt = db.prepare(
      `UPDATE materials SET quantity = MAX(0, quantity - ?), lastUpdateTime = datetime('now','localtime') WHERE code = ?`
    );
    for (const [code, qty] of Object.entries(totalPerMaterial)) {
      matStmt.bind([qty, code]);
      matStmt.step();
      matStmt.reset();
    }
    matStmt.free();

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('批次库存扣减失败:', error);
    res.status(500).json({ success: false, error: '批次库存扣减失败' });
  }
});

/**
 * 恢复批次库存（退料用） — POST /api/materials/batch-restore
 * 同时恢复 materials 主表 quantity
 */
router.post('/batch-restore', (req: Request, res: Response) => {
  try {
    const { returns } = req.body;
    if (!Array.isArray(returns) || returns.length === 0) {
      return res.status(400).json({ success: false, error: '请提供有效的退料数据' });
    }
    const db = getDatabase();
    const stmt = db.prepare(
      `UPDATE batch_inventory SET remaining_quantity = remaining_quantity + ?, update_time = datetime('now','localtime')
       WHERE material_code = ? AND batch_no = ?`
    );
    for (const ret of returns) {
      stmt.bind([ret.quantity, ret.materialCode, ret.batchNo]);
      stmt.step();
      stmt.reset();
    }
    stmt.free();

    // 同步恢复 materials 主表 quantity
    const totalPerMaterial: Record<string, number> = {};
    for (const ret of returns) {
      totalPerMaterial[ret.materialCode] = (totalPerMaterial[ret.materialCode] || 0) + ret.quantity;
    }
    const matStmt = db.prepare(
      `UPDATE materials SET quantity = quantity + ?, lastUpdateTime = datetime('now','localtime') WHERE code = ?`
    );
    for (const [code, qty] of Object.entries(totalPerMaterial)) {
      matStmt.bind([qty, code]);
      matStmt.step();
      matStmt.reset();
    }
    matStmt.free();

    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('批次库存恢复失败:', error);
    res.status(500).json({ success: false, error: '批次库存恢复失败' });
  }
});

/**
 * 强制回填批次库存（从 inbound_records 同步到 batch_inventory）— POST /api/materials/seed-batches
 */
router.post('/seed-batches', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const inboundRows = db.exec("SELECT id, materials FROM inbound_records WHERE status = 'completed'");
    let count = 0;
    if (inboundRows.length > 0) {
      const checkStmt = db.prepare('SELECT id FROM batch_inventory WHERE material_code = ? AND batch_no = ?');
      const insertStmt = db.prepare(
        'INSERT INTO batch_inventory (id, material_code, material_name, batch_no, production_date, expiry_date, unit, total_quantity, remaining_quantity, inbound_record_id) VALUES (?,?,?,?,?,?,?,?,?,?)'
      );
      for (const row of inboundRows[0].values) {
        const recordId = row[0], materialsJson = row[1] as string;
        if (!materialsJson) continue;
        try {
          const materials = JSON.parse(materialsJson);
          for (const m of materials) {
            const code = (m.code || m.materialCode || '').trim();
            const batchNo = (m.batchNo || '').trim() || `DEFAULT-${code}-${recordId}`;
            const qty = m.quantity || 0;
            if (!code || qty <= 0) continue;
            checkStmt.bind([code, batchNo]);
            if (checkStmt.step()) { checkStmt.reset(); continue; }
            checkStmt.reset();
            const biId = `bi-${code}-${batchNo}-${Date.now()}-${Math.random().toString(36).slice(2,6)}`;
            insertStmt.bind([biId, code, m.name || m.materialName || '', batchNo, m.productionDate || '', m.expiryDate || '', m.unit || '', qty, qty, recordId]);
            insertStmt.step();
            insertStmt.reset();
            count++;
          }
        } catch { /* JSON parse error */ }
      }
      checkStmt.free();
      insertStmt.free();
    }
    saveDatabase();
    res.json({ success: true, data: { seeded: count } });
  } catch (error) {
    console.error('回填批次库存失败:', error);
    res.status(500).json({ success: false, error: '回填批次库存失败' });
  }
});

/**
 * 清理重复批次 + 重设 remaining=total — POST /api/materials/cleanup-batches
 */
router.post('/cleanup-batches', (_req: Request, res: Response) => {
  try {
    const db = getDatabase();
    // 删除重复（保留 rowid 最小）
    const dups = db.exec("SELECT material_code, batch_no, COUNT(*) as cnt, MIN(rowid) as keep_rid FROM batch_inventory GROUP BY material_code, batch_no HAVING cnt > 1");
    let removed = 0;
    if (dups.length > 0) {
      for (const row of dups[0].values) {
        removed += (row[2] as number) - 1;
        db.run('DELETE FROM batch_inventory WHERE material_code = ? AND batch_no = ? AND rowid != ?', [row[0], row[1], row[3]]);
      }
    }
    // 重设 remaining = total（修正之前扣减测试的副作用）
    db.run('UPDATE batch_inventory SET remaining_quantity = total_quantity WHERE remaining_quantity != total_quantity');
    saveDatabase();
    const cnt = db.exec('SELECT COUNT(*) FROM batch_inventory');
    res.json({ success: true, data: { removed, total: cnt[0]?.values[0]?.[0] || 0 } });
  } catch (e) {
    res.status(500).json({ success: false, error: (e as Error).message });
  }
});

/**
 * 查询物料批次库存 — GET /api/materials/batches/:code
 */
router.get('/batches/:code', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    const db = getDatabase();
    const stmt = db.prepare(
      `SELECT * FROM batch_inventory WHERE material_code = ? ORDER BY CASE WHEN expiry_date IS NULL OR expiry_date = '' THEN 1 ELSE 0 END, expiry_date ASC`
    );
    stmt.bind([code]);
    const rows: any[] = [];
    while (stmt.step()) rows.push(stmt.getAsObject());
    stmt.free();
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('查询批次库存失败:', error);
    res.status(500).json({ success: false, error: '查询批次库存失败' });
  }
});

/**
 * 删除入库记录
 * 2026-09-27 审计修复：已完成的入库单禁止删除（会破坏库存追溯链、虚增库存）——
 * 已完成单的撤销方式：编辑弹窗把状态改为 pending/voided（PUT 状态感知自动回收库存）。
 * 非完成态单从未同步过库存，可直接删除。
 */
router.delete('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const old = materialsDb.getInboundRecordById(id);
    if (!old) {
      return res.status(404).json({ error: '入库记录不存在' });
    }
    if (String(old.status || '') === 'completed') {
      return res.status(400).json({
        success: false,
        error: '已完成的入库单不允许删除（会破坏库存追溯）。请先作废/退回：库存自动回收、单据保留可查',
      });
    }
    materialsDb.deleteInboundRecord(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除入库记录失败:', error);
    res.status(500).json({ error: '删除入库记录失败' });
  }
});

// ==================== 特定 ID 路由（在入库记录路由之后）===================

/**
 * 根据ID获取物料
 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const material = materialsDb.getMaterialById(id);
    if (!material) {
      return res.status(404).json({ error: '物料不存在' });
    }
    res.json(material);
  } catch (error) {
    console.error('获取物料详情失败:', error);
    res.status(500).json({ error: '获取物料详情失败' });
  }
});

/**
 * 更新物料
 * 2026-09-27 修复：列白名单——前端编辑弹窗回传完整对象（GET 响应经 v0.3 迁移
 * 带 tenant_id 列 → camelCaseResponse 转 tenantId），原样生成 SET tenantId = ?
 * 撞上不存在的列（camelCaseRequest 未回转换）→ 500 编辑保存失效（浏览器实测复现）。
 * 白名单只放 materials 表业务列，忽略 tenantId 及一切未知字段。
 */
const MATERIAL_UPDATE_COLUMNS = new Set([
  'code', 'name', 'category', 'specification', 'unit', 'quantity', 'minStock', 'maxStock',
  'price', 'supplier', 'location', 'barcode', 'batchNo', 'productionDate', 'expiryDate',
  'lastUpdateTime', 'dataStatus',
]);

router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    // 只保留白名单内的字段（id/tenantId 等一律剔除）
    const updates: Record<string, unknown> = {};
    for (const [k, v] of Object.entries(req.body || {})) {
      if (MATERIAL_UPDATE_COLUMNS.has(k)) updates[k] = v;
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ success: false, error: '没有可更新的字段' });
    }
    updates.lastUpdateTime = new Date().toISOString();
    materialsDb.updateMaterial(id, updates as Record<string, any>);
    res.json({ success: true });
  } catch (error) {
    console.error('更新物料失败:', error);
    res.status(500).json({ error: '更新物料失败' });
  }
});

/**
 * 删除物料
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    materialsDb.deleteMaterial(id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除物料失败:', error);
    res.status(500).json({ error: '删除物料失败' });
  }
});

/**
 * 查询物料出库记录 — GET /api/materials/:code/outbound-history
 * 返回所有包含此物料编码的出库单明细（含来源申请单的区域/用途信息）
 */
router.get('/:code/outbound-history', (req: Request, res: Response) => {
  try {
    const { code } = req.params;
    console.log(`[outbound-history] 查询物料: ${code}`);
    const db = getDatabase();

    // 读取所有出库记录
    const execResults = db.exec('SELECT * FROM material_executes ORDER BY date DESC, create_time DESC');
    const history: any[] = [];

    if (execResults.length > 0) {
      const cols = execResults[0].columns;
      console.log(`[outbound-history] material_executes 列: ${cols.join(', ')}, 行数: ${execResults[0].values.length}`);

      for (const row of execResults[0].values) {
        try {
          const exec: Record<string, unknown> = {};
          cols.forEach((c: string, i: number) => { exec[c] = row[i]; });

          // 解析 materials JSON（可能已是数组，兼容处理）
          let materials: any[] = [];
          const rawMaterials = exec.materials;
          if (Array.isArray(rawMaterials)) {
            materials = rawMaterials;
          } else if (typeof rawMaterials === 'string' && rawMaterials.trim()) {
            try { materials = JSON.parse(rawMaterials); } catch { materials = []; }
          }

          const matched = materials.filter((m: any) => m && m.materialCode === code);
          if (matched.length === 0) continue;

          // 解析来源申请单
          let sourceApps: any[] = [];
          const rawSrc = exec.source_application_codes;
          if (Array.isArray(rawSrc)) {
            sourceApps = rawSrc;
          } else if (typeof rawSrc === 'string' && rawSrc.trim()) {
            try { sourceApps = JSON.parse(rawSrc); } catch { sourceApps = []; }
          }

          // 获取区域/用途信息
          const areaInfo: string[] = [];
          for (const srcCode of sourceApps) {
            try {
              const reqStmt = db.prepare('SELECT plant_area, applicant_name, department_name FROM material_requests WHERE request_code = ?');
              reqStmt.bind([String(srcCode)]);
              if (reqStmt.step()) {
                const req = reqStmt.getAsObject();
                let areas: any[] = [];
                const rawArea = req.plant_area;
                if (Array.isArray(rawArea)) {
                  areas = rawArea;
                } else if (typeof rawArea === 'string' && rawArea.trim().startsWith('[')) {
                  try { areas = JSON.parse(rawArea); } catch { areas = []; }
                }
                const areaNames = areas.filter((a: any) => a && a.cropName).map((a: any) =>
                  a.type === 'custom' ? a.cropName : `${a.cropName}·${a.area || ''}`
                ).join('; ');
                if (areaNames) areaInfo.push(areaNames);
                if (req.applicant_name) exec._srcApplicant = req.applicant_name as string;
                if (req.department_name) exec._srcDepartment = req.department_name as string;
              }
              reqStmt.free();
            } catch (innerErr) {
              console.warn(`[outbound-history] 处理来源单 ${srcCode} 失败:`, innerErr);
            }
          }

          for (const m of matched) {
            if (!m) continue;
            history.push({
              executeCode: exec.code || '',
              executeDate: exec.date || '',
              executeStatus: exec.execute_status || '',
              applicant: exec._srcApplicant || exec.applicant || '',
              department: exec._srcDepartment || '',
              operator: exec.operator || '',
              warehouseLocation: exec.warehouse_location || '',
              materialCode: m.materialCode || code,
              materialName: m.materialName || '',
              quantity: Number(m.actualQuantity) || Number(m.requestedQuantity) || 0,
              unit: m.unit || '',
              sourceApplicationCodes: sourceApps,
              areaInfo: areaInfo.join('; ') || '-',
              batchNo: m.batchNo || '',
              applicationCode: m.applicationCode || '',
            });
          }
        } catch (rowErr) {
          console.warn('[outbound-history] 处理出库记录行失败:', rowErr);
        }
      }
    }

    console.log(`[outbound-history] 找到 ${history.length} 条记录`);
    res.json({ success: true, data: history });
  } catch (error) {
    console.error('查询物料出库记录失败:', error);
    res.status(500).json({ success: false, error: `查询物料出库记录失败: ${(error as Error).message}` });
  }
});

export default router;
