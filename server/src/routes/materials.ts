/**
 * 物料管理 API 路由
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import * as materialsDb from '../db/materials';
import { upsertBatchInventory } from '../db/batchInventory';

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
 * 创建入库记录
 */
router.post('/inbound', (req: Request, res: Response) => {
  try {
    const record = req.body;
    const id = materialsDb.createInboundRecord({
      code: record.code,
      inboundDate: record.inboundDate,
      supplier: record.supplier,
      operator: record.operator,
      status: record.status || 'pending',
      materials: record.materials || []
    });
    // 入库即完成 → 自动同步物料库存 + 批次库存（FEFO）
    if (record.status === 'completed' && record.materials?.length > 0) {
      materialsDb.syncInboundToMaterials(record.materials);
      // V14.0: 写入批次库存表（按 material_code + batch_no 追踪剩余量）
      upsertBatchInventory(record.materials, id);
    }
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
 */
router.put('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    // materials 数组需序列化为 JSON 字符串存入 TEXT 列
    if (updates.materials) {
      // 深拷贝避免修改原引用
      const sanitized = { ...updates, materials: JSON.stringify(updates.materials) };
      // 判断状态是否转为 completed：先查旧记录
      if (updates.status === 'completed') {
        const oldRecord = materialsDb.getInboundRecordById(id);
        const wasCompleted = oldRecord?.status === 'completed';
        if (!wasCompleted) {
          // pending → completed：触发库存同步 + 批次库存（FEFO）
          materialsDb.syncInboundToMaterials(updates.materials);
          upsertBatchInventory(updates.materials, id);
        }
      }
      materialsDb.updateInboundRecord(id, sanitized);
    } else {
      materialsDb.updateInboundRecord(id, updates);
    }
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
 */
router.delete('/inbound/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
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
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const id = parseInt(req.params.id);
    const updates = req.body;
    updates.lastUpdateTime = new Date().toISOString();
    materialsDb.updateMaterial(id, updates);
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
