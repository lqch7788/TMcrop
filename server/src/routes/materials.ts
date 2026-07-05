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
    saveDatabase();
    res.json({ success: true });
  } catch (error) {
    console.error('批次库存扣减失败:', error);
    res.status(500).json({ success: false, error: '批次库存扣减失败' });
  }
});

/**
 * 恢复批次库存（退料用） — POST /api/materials/batch-restore
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

export default router;
