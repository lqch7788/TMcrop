/**
 * 物料管理 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import * as materialsDb from '../db/materials';
// （2026-09-27 重构：入库的 主表/批次账/流水 逻辑已抽到 services/materialInboundStock.service.ts）
// 2026-09-27 审计修复：入库写库存流水（复用出库侧的 writeStockTransaction）+
// 入库撤销回收库存（reverseInboundStock，与出库恢复同模式）
import { applyInboundStock, reverseInboundStock, createMaterialInboundApproval, parseInboundMaterials } from '../services/materialInboundStock.service';

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
      dataStatus: material.dataStatus || '启用',
      remarks: material.remarks || ''
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
      id = materialsDb.createInboundRecord({
        code: inboundCode,
        inboundDate: record.inboundDate,
        supplier: record.supplier,
        operator: record.operator,
        status,
        materials: matList,
      }, { persist: false });

      if (willSync) {
        // 主表累加 + 批次账 + 流水（逻辑统一在 materialInboundStock.service.ts，与审批联动共用）
        applyInboundStock(db, {
          inboundId: id,
          inboundCode,
          materials: matList,
          operatorName: String(record.operator || '').trim() || '仓库',
          fallbackSupplier: record.supplier,
        });
      }

      // 2026-09-27：待审核单同事务创建审批记录 → 出现在"物料审批 → 物料入库"tab，
      // 审批通过后由 approvalLinkage 回写 completed 并触发库存入账（此前该链路整体缺失）
      if (status === 'pending' && matList.length > 0) {
        createMaterialInboundApproval(db, {
          inboundId: id,
          inboundCode,
          materials: matList,
          operator: record.operator,
          supplier: record.supplier,
        });
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

    // 2026-09-27 兼容处理：剔除无害的客户端元数据——
    // id（主键由 URL 路径确定，body 携带是 REST 客户端常见行为）、
    // voidedDate（作废时间由服务端在状态转 voided 时补写，不接受客户端传值）。
    // 此前未剔除导致前端提交 {...record} 时 400"包含非法更新字段"，编辑保存与作废全部失败。
    delete updates.id;
    delete updates.voidedDate;

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
    // 2026-09-27：冲销单不可修改（红字凭证不可变更；其明细的 quantity 已表示"实际冲回量"，
    // 若被当作普通单改状态/改明细会触发错误的库存回收）
    if (String((oldRecord as any).recordType || 'inbound') === 'reversal') {
      return res.status(400).json({ success: false, error: '冲销单不可修改（红字单为不可变更凭证，如需纠正请对新单操作）' });
    }
    const oldStatus = String(oldRecord.status || 'pending');
    const newStatus = String(updates.status ?? oldStatus);
    const materialsChanged = updates.materials !== undefined;
    const oldMaterials = parseInboundMaterials(oldRecord.materials);
    const newMaterials = materialsChanged
      ? (Array.isArray(updates.materials) ? updates.materials : parseInboundMaterials(updates.materials))
      : oldMaterials;
    const operatorName = String(updates.operator ?? oldRecord.operator ?? '').trim() || '仓库';

    // 2026-09-27：作废时间由服务端补写（白名单校验已通过，此处为服务端内部字段，用于审计追溯）
    if (newStatus === 'voided' && !oldRecord.voidedDate) {
      updates.voidedDate = new Date().toISOString();
    }

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
      // 2) 新账要入 → 仅当"从未入账变入账"（pending→completed）或"已入账单的明细发生变化"时重新入账。
      //    2026-09-27 修复：此前无条件 apply —— 对已完成单做非明细更新（如只改供应商/操作员）会
      //    重复入账（实测：PUT {status:'completed'} 到已完成单 → 库存 +8 一次，账实虚增）
      const needsApply = newStatus === 'completed' && (oldStatus !== 'completed' || materialsChanged);
      if (needsApply && newMaterials.length > 0) {
        // 单头供应商兜底：更新时优先用新值，其次沿用旧单头（与 POST /inbound 同口径）；
        // 逻辑统一在 materialInboundStock.service.ts，与审批联动共用
        applyInboundStock(db, {
          inboundId: id,
          inboundCode: String(updates.code || oldRecord.code || ''),
          materials: newMaterials,
          operatorName,
          fallbackSupplier: String(updates.supplier ?? oldRecord.supplier ?? ''),
        });
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

// ==================== 入库冲销（红字单，2026-09-27）====================
// 背景：已完成入库单的货被部分/全部领用后无法作废（库存不足以全额回收）。
// ERP 标准做法：原单不可改写（审计），另开红字冲销单抵消；
// 冲销量 = min(明细入库量, 该批次当前剩余量)——已消耗部分不可冲回（防负库存）。

/**
 * 计算原单每条明细的实际可冲回量（预览与创建共用，保证口径一致）
 *
 * 批次剩余优先按"该单产生的批次"（batch_inventory.inbound_record_id）聚合——
 * 历史批次命名有 DEFAULT-{code}-{id} 与"默认批次"两种口径，按名字查会漏匹配；
 * 名字匹配仅作兜底。
 */
function computeReversibleItems(db: any, inboundRecordId: number, matList: any[]): Array<any> {
  return matList.map((m: any) => {
    const code = String(m.code || m.materialCode || '').trim();
    const qty = Number(m.quantity) || 0;
    // 批次号与 upsertBatchInventory / reverseInboundStock 同口径（空 → 默认批次）
    const batchNo = String(m.batchNo || '').trim() || '默认批次';
    let batchRemain = 0;
    if (code) {
      const byRecord = db.exec(
        'SELECT IFNULL(SUM(remaining_quantity), 0) FROM batch_inventory WHERE material_code = ? AND inbound_record_id = ?',
        [code, inboundRecordId]
      );
      batchRemain = byRecord.length > 0 && byRecord[0].values.length > 0 ? Number(byRecord[0].values[0][0]) || 0 : 0;
      if (batchRemain === 0) {
        // 兜底：按批次名匹配（老数据未写 inbound_record_id 的场景）
        const byName = db.exec(
          'SELECT remaining_quantity FROM batch_inventory WHERE material_code = ? AND batch_no = ?',
          [code, batchNo]
        );
        batchRemain = byName.length > 0 && byName[0].values.length > 0 ? Number(byName[0].values[0][0]) || 0 : 0;
      }
    }
    const reversible = Math.max(0, Math.min(qty, batchRemain));
    return { code, name: m.name || '', unit: m.unit || '', batchNo, quantity: qty, batchRemain, reversible };
  });
}

/**
 * 冲销预览：返回原单每条明细的原入库量、批次剩余、可冲回量
 */
router.get('/inbound/:id/reversal-preview', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const record = materialsDb.getInboundRecordById(id);
    if (!record) return res.status(404).json({ error: '入库记录不存在' });
    if (String(record.status) !== 'completed') {
      return res.status(400).json({ success: false, error: '仅"已完成"入库单可冲销（待审核单未入账，直接删除即可）' });
    }
    if (String((record as any).recordType || 'inbound') === 'reversal') {
      return res.status(400).json({ success: false, error: '冲销单不可再次冲销' });
    }
    const db = getDatabase();
    const items = computeReversibleItems(db, id, parseInboundMaterials(record.materials));
    const totalReversible = items.reduce((s: number, x: any) => s + x.reversible, 0);
    // 2026-09-27：已被冲销的单给出明确标记（前端禁用"确认冲销"）
    const existReversal = db.exec(
      "SELECT code FROM inbound_records WHERE reversalOf = ? AND recordType = 'reversal' LIMIT 1",
      [id]
    );
    const existingReversalCode = existReversal.length > 0 && existReversal[0].values.length > 0
      ? String(existReversal[0].values[0][0]) : '';
    res.json({
      success: true,
      data: {
        recordId: id, recordCode: record.code, supplier: record.supplier,
        items, totalReversible,
        alreadyReversed: !!existingReversalCode,
        existingReversalCode,
      },
    });
  } catch (error) {
    console.error('冲销预览失败:', error);
    res.status(500).json({ success: false, error: '冲销预览失败' });
  }
});

/**
 * 创建冲销单（直接生效）：原单保留，生成红字单并回收"实际可冲回量"。
 * 完全消耗的单可冲量为 0 → 生成 0 量冲销单（仅完成冲销标记，不动库存）。
 */
router.post('/inbound/:id/reversal', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const reason = String(req.body?.reason || '').trim();
    const record = materialsDb.getInboundRecordById(id);
    if (!record) return res.status(404).json({ error: '入库记录不存在' });
    if (String(record.status) !== 'completed') {
      return res.status(400).json({ success: false, error: '仅"已完成"入库单可冲销' });
    }
    if (String((record as any).recordType || 'inbound') === 'reversal') {
      return res.status(400).json({ success: false, error: '冲销单不可再次冲销' });
    }

    const db = getDatabase();
    // 2026-09-27：已冲销的单不可重复冲销（防生成多张冲销单造成审计混乱）
    const existReversal = db.exec(
      "SELECT code FROM inbound_records WHERE reversalOf = ? AND recordType = 'reversal' LIMIT 1",
      [id]
    );
    if (existReversal.length > 0 && existReversal[0].values.length > 0) {
      return res.status(400).json({
        success: false,
        error: `该入库单已被冲销（冲销单 ${existReversal[0].values[0][0]}），不可重复冲销`,
      });
    }
    const matList = parseInboundMaterials(record.materials);
    const reversibleItems = computeReversibleItems(db, id, matList);
    const totalReversible = reversibleItems.reduce((s: number, x: any) => s + x.reversible, 0);

    const originalCode = String(record.code || '');
    const reversalCode = `${originalCode}-CX`;
    const operatorName = String(req.body?.operator || (record as any).operator || '').trim() || '仓库';
    // 2026-09-27：冲销单保留原单**全部**明细（含已全部消耗的 0 冲回项）——
    // 此前只存"可冲量>0"的项，完全消耗的单变成空壳（列表显示"0 种物料"，看不出冲了什么）。
    // quantity=实际冲回量（入账口径，0 表示该行无可回收库存）；
    // originalQuantity/batchRemain 为展示快照（原入库量、冲销时批次剩余）。
    const reversalMaterials = reversibleItems.map((x: any) => ({
      code: x.code,
      name: x.name,
      unit: x.unit,
      batchNo: x.batchNo,
      quantity: x.reversible,
      originalQuantity: x.quantity,
      batchRemain: x.batchRemain,
    }));
    // 入账只处理有可冲量的行
    const itemsToReverse = reversalMaterials.filter((x: any) => x.quantity > 0);

    db.run('BEGIN');
    let reversalId = 0;
    try {
      // 1) 冲销单本体（recordType='reversal'，关联原单；明细存实际可冲量）
      reversalId = materialsDb.createInboundRecord({
        code: reversalCode,
        inboundDate: new Date().toISOString().slice(0, 10),
        supplier: (record as any).supplier,
        operator: operatorName,
        status: 'completed',
        materials: reversalMaterials,
      } as any, { persist: false });
      // createInboundRecord 不写扩展列，用 UPDATE 补 recordType/reversalOf/reversalReason
      db.run(
        "UPDATE inbound_records SET recordType = 'reversal', reversalOf = ?, reversalReason = ? WHERE id = ?",
        [id, reason, reversalId]
      );

      // 2) 红冲：按可冲量回收主表 + 批次账 + 写 material_reverse_inbound 流水
      // （reverseInboundStock 会校验余量；可冲量已 = min(入库量, 批次剩余)，必然足够）
      if (itemsToReverse.length > 0) {
        reverseInboundStock(db, itemsToReverse, reversalId, reversalCode, operatorName);
      }
      db.run('COMMIT');
    } catch (e) {
      db.run('ROLLBACK');
      console.error('[入库冲销] 失败已回滚:', e);
      return res.status(400).json({ success: false, error: e instanceof Error ? e.message : '冲销失败' });
    }
    saveDatabase();

    const created = materialsDb.getInboundRecordById(reversalId);
    res.status(201).json({
      success: true,
      message: totalReversible > 0
        ? `冲销完成：回收 ${totalReversible} 件（原单 ${originalCode}）`
        : `冲销标记完成：原单 ${originalCode} 的货已全部领用，无可回收库存`,
      data: { ...created, materials: parseInboundMaterials(created?.materials) },
    });
  } catch (error) {
    console.error('创建冲销单失败:', error);
    res.status(500).json({ success: false, error: '创建冲销单失败' });
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
  'lastUpdateTime', 'dataStatus', 'remarks',
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
