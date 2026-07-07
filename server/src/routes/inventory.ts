/**
 * 库存 API 路由（V3.0 统一）
 *
 * 路由顺序（重要！Express 按注册顺序匹配）：
 * 1. V3.0 写入操作（inbound / outbound）
 * 2. V3.0 查询操作（list / stats / aggregate / trace / available / by-business / transaction）
 * 3. 兼容路由（GET /, GET /:id, POST /, PUT /:id, DELETE /:id）— 为作物库存等老页面
 *    提供「读 V3.0 stock / 写 V3.0 stock」的能力，老字段（grade/storage_location 等）以缺省值补全
 *
 * 所有路由都使用 inventory_stock / inventory_transaction 表（V3.0 新表）
 * 老的 legacy `inventory` 表不再读写
 */

import { Router, Request, Response } from 'express';
import { inventoryController } from '../controllers/inventory.controller';
import { checkInventoryStockDeletable } from '../services/inventoryDeleteGuard.service';
import { inventoryStockRepository } from '../repositories/inventory.repository';
import { generateStockId, generateInboundRecordId } from '../services/inventory.service';
import { getDatabase, saveDatabase } from '../db';
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';

const router = Router();

// ========== V3.0 写入操作（必须在 /:id 之前） ==========
router.post('/inbound', inventoryController.inbound.bind(inventoryController));

// ============================================================
// 2026-06-18: 库存入库按模块下沉 (方向 A + 选项 B)
// 设计文档：docs/superpowers/specs/2026-06-18-inventory-inbound-per-module-design.md
// ============================================================
// 路径说明：避免与 inventoryController.inbound 冲突（已在上面 line 23 注册 /inbound），
//          新版入库走 /inbound-record（单数），GET 列表 /inbound-records（复数）。
//          必须在 /:id 之前注册（line 190），否则会被通配截胡
import { z } from 'zod';
import { UNIT_ENUM } from './planting';

// ============================================================
// Phase 2：行级采收入库（unify-harvest-inbound-into-source-operations）
// 必须在 /:id 之前注册，否则被通配截胡
// ============================================================
import inventoryInboundFromSourceRouter from './inventoryInboundFromSource';
router.use('/inbound-from-source', inventoryInboundFromSourceRouter);

// ============================================================
// 2026-06-24: 库存调拨入种源（种源管理新增弹窗第 5 选项）
// POST /api/inventory/transfer-to-source
// GET  /api/inventory/transferable-sources
// 必须在 /:id 之前注册（同 inbound-from-source）
// ============================================================
import inventoryTransferRouter from './inventoryTransfer';
router.use('/', inventoryTransferRouter);

/**
 * 入库请求 Zod Schema
 * - sourceModule: 'seed_source' | 'seedling' | 'planting'
 * - stockType: 锁死，UI 层根据 sourceModule 传入
 * - sourceType: 6 种入库原因
 * - qualityGrade: 5 档品级
 */
const InboundSchema = z.object({
  sourceModule: z.enum(['seed_source', 'seedling', 'planting']),
  sourceId: z.string().min(1, { message: '源记录 ID 必填' }),
  stockType: z.enum(['seed', 'seedling', 'product']),
  sourceType: z.enum([
    'external_purchased', 'gift', 'commissioned', 'transfer', 'manual', 'self_produced',
  ]),
  warehouseId: z.string().min(1, { message: '仓库 ID 必填' }),
  quantity: z.number().positive({ message: '数量必须 > 0' }),
  unit: UNIT_ENUM,
  unitPrice: z.number().nonnegative().optional(),
  totalAmount: z.number().nonnegative().optional(),
  qualityGrade: z.enum(['special', 'excellent', 'good', 'qualified', 'unqualified']).optional(),
  supplierId: z.string().optional(),
  supplierName: z.string().optional(),
  productionPlanId: z.string().optional(),
  productionPlanCode: z.string().optional(),
  businessId: z.string().optional(),
  notes: z.string().optional(),
  operatorName: z.string().optional(),
  recordDate: z.string().optional(),  // YYYY-MM-DD；默认今天
  warehouseName: z.string().optional(),
});

/**
 * 辅助函数：按 sourceModule 查源记录（sql.js 标准 prepare/bind/step/getAsObject/free 模式）
 * 返回 null 表示源记录不存在
 * 2026-06-18: 扩展拉取 crop_code（种源）、greenhouse_name（育苗/种植）、planting_mode（种植）
 *   让 inventory_stock 能全量继承源数据，避免大部分列为空
 */
function fetchSourceRow(
  db: any,
  sourceModule: string,
  sourceId: string,
): {
  code: string
  cropName: string
  cropVariety: string
  cropCode: string
  cropId: string | null
  productionPlanId: string | null
  productionPlanCode: string | null
  unit: string | null
  greenhouseName: string | null
  plantingMode: string | null
} | null {
  // ⚠️ 列名差异：种源没有 crop_id/greenhouse_name；种植没有 crop_id/planting_mode
  // 按表分别 SELECT 实际存在的列
  let sql = ''
  if (sourceModule === 'seed_source') {
    sql = 'SELECT source_code, crop_code, crop_name, crop_variety, production_plan_code, unit FROM seed_sources WHERE id = ? AND deleted_at IS NULL'
  } else if (sourceModule === 'seedling') {
    sql = 'SELECT seedling_code, crop_id, crop_code, crop_name, crop_variety, production_plan_code, unit, greenhouse_name FROM seedlings WHERE id = ? AND deleted_at IS NULL'
  } else {
    sql = 'SELECT planting_code, crop_code, crop_name, crop_variety, production_plan_id, production_plan_code, unit, greenhouse_name FROM plantings WHERE id = ? AND (is_deleted = 0 OR is_deleted IS NULL)'
  }
  const stmt = db.prepare(sql)
  stmt.bind([sourceId])
  if (!stmt.step()) {
    stmt.free()
    return null
  }
  const row = stmt.getAsObject() as any
  stmt.free()

  // 统一字段名
  const code = row.source_code || row.seedling_code || row.planting_code || ''
  return {
    code,
    cropName: row.crop_name || '',
    cropVariety: row.crop_variety || '',
    cropCode: row.crop_code || '',
    cropId: row.crop_id || null,                  // 只育苗有
    productionPlanId: row.production_plan_id || null,  // 只种植有
    productionPlanCode: row.production_plan_code || null,
    unit: row.unit || null,
    greenhouseName: row.greenhouse_name || null,  // 育苗/种植有
    plantingMode: null,                            // 种源/育苗/种植都没有此列（harvest_records 才有）
  }
}

/**
 * POST /api/inventory/inbound-record
 * 库存入库（按模块下沉版）
 * 1. 校验 source 存在（按 sourceModule 分别查种源/育苗/种植）
 * 2. 写 inventory_stock（business_type='inbound', source_module/source_id 关联）
 * 3. 写 inventory_inbound_records（审计）
 * 4. 补仓库名（如未传）
 * 5. 返回 { stockId, recordId }
 */
router.post('/inbound-record', async (req: Request, res: Response) => {
  try {
    const parsed = InboundSchema.safeParse(req.body)
    if (!parsed.success) {
      // Zod 4 错误在 issues 字段，Zod 3 在 errors 字段；用 ?. 兼容两版本
      const issues: any[] = (parsed.error as any)?.issues || (parsed.error as any)?.errors || []
      const firstMsg = issues[0]?.message || '参数校验失败'
      const firstPath = Array.isArray(issues[0]?.path) ? issues[0].path.join('.') : ''
      return res.status(400).json({
        success: false,
        error: firstPath ? `${firstPath}: ${firstMsg}` : firstMsg,
        issues,
      })
    }
    const input = parsed.data
    const db = getDatabase()

    // 1. 校验 source 存在 + 取源数据
    const source = fetchSourceRow(db, input.sourceModule, input.sourceId)
    if (!source) {
      return res.status(404).json({ success: false, error: '源记录不存在或已删除' })
    }

    const productionPlanId = input.productionPlanId || source.productionPlanId || null
    const productionPlanCode = input.productionPlanCode || source.productionPlanCode || null
    const now = new Date().toISOString()
    const recordDate = input.recordDate || now.slice(0, 10)
    // 2026-07-07 V3.2: 库存主键 + 入库记录主键统一走 generateStockId / generateInboundRecordId
    // 替代违反 [[code-generation-contract-rule]] 铁律的 `STK-${Date.now()}-${random}` / `INB-${...}`
    const dateStrInst = formatLocalDateYYYYMMDD()
    const stockId = await generateStockId(dateStrInst)
    // 2026-06-19: 库存实例 ID 统一格式 ${prefix}-${YYYYMMDD}-${NNNN}（17 字符）
    // 与采收入库（inventoryInboundFromSource.service.ts）保持一致
    const prefixInst = input.stockType === 'seed' ? 'INS' : input.stockType === 'seedling' ? 'ISE' : 'IPR'
    const maxInst = await inventoryStockRepository.getInstanceIdMaxSerial(prefixInst, dateStrInst)
    const instanceId = `${prefixInst}-${dateStrInst}-${String(maxInst + 1).padStart(4, '0')}`
    const recordId = await generateInboundRecordId(dateStrInst)

    // 2. 写 inventory_stock
    // 2026-06-18: 修复大部分列为空的 bug
    // 原来只写 16 个字段，inventory_stock 实际 39 列，导致 crop_name/variety/crop_code/quality_grade 等都 NULL
    // 现在全量继承 source + 填齐 inventory_stock 关键字段
    db.run(`
      INSERT INTO inventory_stock
      (id, instance_id, stock_type,
       business_id, business_type, business_code,
       source_module, source_id, source_type,
       crop_id, crop_code, crop_name, variety_name,
       current_quantity, available_quantity, unit,
       warehouse_id, warehouse_name,
       quality_grade, grade,
       supplier_id, supplier_name,
       unit_price, total_amount,
       purchase_date, inbound_date,
       production_plan_id, production_plan_code,
       planting_mode, greenhouse_name,
       notes, status, version, create_time, update_time)
      VALUES (?, ?, ?,
              ?, 'inbound', ?,
              ?, ?, ?,
              ?, ?, ?, ?,
              ?, ?, ?,
              ?, ?,
              ?, ?,
              ?, ?,
              ?, ?,
              ?, ?,
              ?, ?,
              ?, ?,
              ?,
              'active', 1, ?, ?)
    `, [
      stockId, instanceId, input.stockType,
      input.businessId || stockId, input.businessId || stockId,
      input.sourceModule, input.sourceId, input.sourceType,
      source.cropId || null, source.cropCode || null, source.cropName || null, source.cropVariety || null,
      input.quantity, input.quantity, input.unit,
      input.warehouseId, input.warehouseName || null,
      input.qualityGrade || null, input.qualityGrade || null,  // quality_grade + grade 同时填
      input.supplierId || null, input.supplierName || null,
      input.unitPrice || 0, input.totalAmount || 0,
      recordDate, recordDate,  // purchase_date + inbound_date
      productionPlanId, productionPlanCode,
      source.plantingMode || null, source.greenhouseName || null,
      input.notes || null, now, now,
    ])

    // 3. 写 inventory_inbound_records
    db.run(`
      INSERT INTO inventory_inbound_records
      (id, record_type, record_date, source_module, source_id, source_code,
       stock_type, source_type, warehouse_id, warehouse_name,
       crop_code, crop_name, variety_name,
       quantity, unit, unit_price, total_amount, quality_grade,
       supplier_id, supplier_name,
       production_plan_id, production_plan_code,
       business_id, notes, operator_name, create_by, create_time, update_time)
      VALUES (?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recordId, recordDate,
      input.sourceModule, input.sourceId, source.code,
      input.stockType, input.sourceType,
      input.warehouseId, input.warehouseName || null,
      source.cropCode, source.cropName, source.cropVariety,
      input.quantity, input.unit, input.unitPrice || 0, input.totalAmount || 0,
      input.qualityGrade || null,
      input.supplierId || null, input.supplierName || null,
      productionPlanId, productionPlanCode,
      input.businessId || stockId, input.notes || null,
      input.operatorName || 'system', input.operatorName || 'system', now, now,
    ])

    // 4. 补仓库名（如未传且 warehouses 表能查到）
    if (!input.warehouseName) {
      try {
        const wstmt = db.prepare('SELECT name FROM warehouses WHERE id = ? OR oid = ? LIMIT 1')
        wstmt.bind([input.warehouseId, input.warehouseId])
        if (wstmt.step()) {
          const wname = (wstmt.getAsObject() as any).name as string | undefined
          if (wname) {
            db.run('UPDATE inventory_inbound_records SET warehouse_name = ? WHERE id = ?', [wname, recordId])
            db.run('UPDATE inventory_stock SET warehouse_name = ? WHERE id = ?', [wname, stockId])
          }
        }
        wstmt.free()
      } catch (_e) {
        // 仓库名补全失败不阻断主流程
      }
    }

    saveDatabase()
    res.json({ success: true, data: { stockId, recordId } })
  } catch (e: any) {
    console.error('[POST /inventory/inbound-record]', e)
    res.status(500).json({ success: false, error: e?.message || '入库失败' })
  }
})

/**
 * GET /api/inventory/inbound-records
 * 查询入库记录
 * 查询参数：sourceModule, sourceId, stockType, warehouseId, startDate, endDate, page, limit
 */
router.get('/inbound-records', (req: Request, res: Response) => {
  try {
    const {
      sourceModule, sourceId, stockType, warehouseId, startDate, endDate,
      page = '1', limit = '20',
    } = req.query as any

    const db = getDatabase()
    const conditions: string[] = []
    const params: any[] = []
    // 2026-07-01 Bug fix：列表 SQL 用 LEFT JOIN 关联 harvest_records，
    // 两个表都有 source_module/source_id/stock_type/warehouse_id/record_date 列。
    // 不加 'ir.' 前缀会触发 SQLite "ambiguous column name" 错误，loadInboundRecords 直接 500。
    // 影响：SeedlingPage 已有的"入库记录"折叠区、useInventoryInboundStore 全量加载都失败。
    if (sourceModule) { conditions.push('ir.source_module = ?'); params.push(sourceModule) }
    if (sourceId) { conditions.push('ir.source_id = ?'); params.push(sourceId) }
    if (stockType) { conditions.push('ir.stock_type = ?'); params.push(stockType) }
    if (warehouseId) { conditions.push('ir.warehouse_id = ?'); params.push(warehouseId) }
    if (startDate) { conditions.push('ir.record_date >= ?'); params.push(startDate) }
    if (endDate) { conditions.push('ir.record_date <= ?'); params.push(endDate) }
    const where = conditions.length ? 'WHERE ' + conditions.join(' AND ') : ''

    const pageNum = Math.max(1, parseInt(String(page), 10) || 1)
    const limitNum = Math.min(100, Math.max(1, parseInt(String(limit), 10) || 20))
    const offset = (pageNum - 1) * limitNum

    // 计数
    const countResult = db.exec(`SELECT COUNT(*) FROM inventory_inbound_records ir ${where}`, params)
    const total = Number(countResult[0]?.values?.[0]?.[0]) || 0

    // 列表 — LEFT JOIN harvest_records 取 harvest_form（采收形态）
    // 2026-06-28：入库记录需要展示采收形态，但 inventory_inbound_records 表没存 harvest_form，
    //            改去 harvest_records 通过 business_id 关联获取（一个入库 = harvest_records 一条）
    const listSql = `
      SELECT ir.*, hr.harvest_form AS harvest_form
      FROM inventory_inbound_records ir
      LEFT JOIN harvest_records hr ON ir.business_id = hr.id
      ${where}
      ORDER BY ir.create_time DESC
      LIMIT ? OFFSET ?
    `
    // params 复用（业务 id / 时间过滤仍然作用于 ir），但 params 是 [whereParams..., limitNum, offset]
    const stmt = db.prepare(listSql)
    stmt.bind([...params, limitNum, offset])
    const records: any[] = []
    while (stmt.step()) {
      records.push(stmt.getAsObject())
    }
    stmt.free()

    res.json({
      success: true,
      data: records,
      meta: { total, page: pageNum, limit: limitNum },
    })
  } catch (e: any) {
    console.error('[GET /inventory/inbound-records]', e)
    res.status(500).json({ success: false, error: e?.message || '查询入库记录失败' })
  }
})

// ============================================================
// V2 改造: 库存来源追溯路由 (任务 11: Phase 2) - 必须在 /:id 之前
// ============================================================
import { traceInventorySource } from '../services/inventory.service'

router.get('/inventory-stock/trace-source', (req, res) => {
  try {
    const { stockId } = req.query
    if (!stockId || typeof stockId !== 'string') {
      return res.status(400).json({ success: false, error: 'stockId 必填' })
    }
    const result = traceInventorySource(stockId)
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})
// 注：2026-06-04 V2.1 铁律改造后，POST /api/inventory/outbound 端点已迁移到 /api/inventory-transactions
//      （routes/inventoryTransactions.ts）。本路由不再注册 /outbound。

// ========== V3.0 查询操作（必须在 /:id 之前） ==========
router.get('/list', inventoryController.getList.bind(inventoryController));
router.get('/stats', inventoryController.getStats.bind(inventoryController));
router.get('/aggregate/by-crop', inventoryController.aggregateByCrop.bind(inventoryController));
router.get('/trace/upstream/:instanceId', inventoryController.traceUpstream.bind(inventoryController));
router.get('/trace/downstream/:instanceId', inventoryController.traceDownstream.bind(inventoryController));
router.get('/available/:instanceId', inventoryController.getAvailableQuantity.bind(inventoryController));
router.get('/by-business/:businessId', inventoryController.getByBusinessId.bind(inventoryController));
router.get('/transaction/:instanceId', inventoryController.getTransactions.bind(inventoryController));

// ========== Phase 13.1 修复：冻结记录端点（之前未注册，永远返回 0） ==========
// 必须在 /:id 之前注册，否则被通配截胡
router.get('/freezes/:instanceId', (req: Request, res: Response) => {
  try {
    const { instanceId } = req.params;
    const db = getDatabase();
    let freezes: any[] = [];
    try {
      const stmt = db.prepare(`
        SELECT id, instance_id, freeze_quantity, used_quantity, freeze_type,
               order_id, order_code, customer_name, delivery_date,
               purpose, operator_id, operator_name,
               freeze_date, unfreeze_date, status, remarks
        FROM inventory_freeze
        WHERE instance_id = ? AND status != 'released'
        ORDER BY freeze_date DESC
      `);
      stmt.bind([instanceId]);
      while (stmt.step()) {
        const row = stmt.getAsObject();
        freezes.push({
          id: row.id,
          instanceId: row.instance_id,
          freezeQuantity: row.freeze_quantity,
          usedQuantity: row.used_quantity,
          freezeType: row.freeze_type,
          orderId: row.order_id,
          orderCode: row.order_code,
          customerName: row.customer_name,
          deliveryDate: row.delivery_date,
          purpose: row.purpose,
          operatorId: row.operator_id,
          operatorName: row.operator_name,
          freezeDate: row.freeze_date,
          unfreezeDate: row.unfreeze_date,
          status: row.status,
          remarks: row.remarks,
        });
      }
      stmt.free();
    } catch (_e) {
      // inventory_freeze 表可能不存在，从 transaction 流水兜底
      try {
        const txStmt = db.prepare(`
          SELECT id, instance_id, transaction_type, quantity, business_code, operator_name, operate_date, remarks
          FROM inventory_transaction
          WHERE instance_id = ? AND transaction_type IN ('freeze', 'unfreeze')
          ORDER BY operate_date DESC
        `);
        txStmt.bind([instanceId]);
        while (txStmt.step()) {
          const tx = txStmt.getAsObject();
          freezes.push({
            id: tx.id,
            instanceId: tx.instance_id,
            freezeQuantity: Math.abs(Number(tx.quantity) || 0),
            usedQuantity: 0,
            freezeType: 'manual',
            orderId: null,
            orderCode: null,
            customerName: null,
            deliveryDate: null,
            purpose: tx.remarks || '',
            operatorId: null,
            operatorName: tx.operator_name,
            freezeDate: tx.transaction_type === 'freeze' ? tx.operate_date : null,
            unfreezeDate: tx.transaction_type === 'unfreeze' ? tx.operate_date : null,
            status: tx.transaction_type,
            remarks: tx.remarks,
          });
        }
        txStmt.free();
      } catch (_) {
        freezes = [];
      }
    }
    res.json({ success: true, data: freezes, meta: { total: freezes.length } });
  } catch (e: any) {
    console.error('[GET /inventory/freezes/:instanceId]', e);
    res.status(500).json({ success: false, error: e?.message || '查询冻结记录失败' });
  }
});

// ========== 冻结/解冻操作（2026-07-02 补全） ==========

/** 确保 inventory_freeze 表有所需列（fixMissingSchema 被启动白名单禁用，此处自补） */
function ensureFreezeColumns(db: any): void {
  const cols = [
    { name: 'instance_id', sql: 'ALTER TABLE inventory_freeze ADD COLUMN instance_id TEXT' },
    { name: 'freeze_type', sql: "ALTER TABLE inventory_freeze ADD COLUMN freeze_type TEXT DEFAULT 'manual'" },
    { name: 'customer_name', sql: 'ALTER TABLE inventory_freeze ADD COLUMN customer_name TEXT' },
    { name: 'delivery_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN delivery_date TEXT' },
    { name: 'purpose', sql: 'ALTER TABLE inventory_freeze ADD COLUMN purpose TEXT' },
    { name: 'operator_id', sql: 'ALTER TABLE inventory_freeze ADD COLUMN operator_id TEXT' },
    { name: 'operator_name', sql: 'ALTER TABLE inventory_freeze ADD COLUMN operator_name TEXT' },
    { name: 'freeze_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN freeze_date TEXT' },
    { name: 'unfreeze_date', sql: 'ALTER TABLE inventory_freeze ADD COLUMN unfreeze_date TEXT' },
    { name: 'updated_at', sql: 'ALTER TABLE inventory_freeze ADD COLUMN updated_at TEXT' },
  ];
  for (const col of cols) {
    try { db.run(col.sql); } catch { /* 列已存在则跳过 */ }
  }
}

/** POST /api/inventory/freeze — 创建冻结记录（订单关联 / 手动独立） */
router.post('/freeze', async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      instanceId: string;
      freezeType: 'order' | 'manual';
      freezeQuantity: number;
      orderId?: string;
      purpose?: string;
      operatorId?: string;
      operatorName?: string;
      remarks?: string;
    };

    // 1. 校验
    if (!body.instanceId) return res.status(400).json({ success: false, error: '缺少 instanceId' });
    if (!body.freezeType || !['order', 'manual'].includes(body.freezeType)) {
      return res.status(400).json({ success: false, error: 'freezeType 必须为 order 或 manual' });
    }
    if (!body.freezeQuantity || body.freezeQuantity <= 0) {
      return res.status(400).json({ success: false, error: '冻结数量必须大于 0' });
    }
    if (body.freezeType === 'order' && !body.orderId) {
      return res.status(400).json({ success: false, error: '关联订单冻结需要提供 orderId' });
    }

    const db = getDatabase();
    ensureFreezeColumns(db); // 确保 inventory_freeze 表有完整列

    // 2. 查库存实例
    const stockStmt = db.prepare('SELECT * FROM inventory_stock WHERE instance_id = ?');
    stockStmt.bind([body.instanceId]);
    if (!stockStmt.step()) {
      stockStmt.free();
      return res.status(404).json({ success: false, error: `库存实例 ${body.instanceId} 不存在` });
    }
    const stock = stockStmt.getAsObject();
    stockStmt.free();

    const currentQty = Number(stock.current_quantity) || 0;
    const alreadyFrozen = Number(stock.frozen_quantity) || 0;
    const available = currentQty - alreadyFrozen;
    if (available < body.freezeQuantity) {
      return res.status(400).json({
        success: false,
        error: `可冻结数量不足：可用 ${available}，需要 ${body.freezeQuantity}`,
      });
    }

    // 3. 关联订单时获取客户和交货日期
    let customerName: string | null = null;
    let deliveryDate: string | null = null;
    let orderCode: string | null = null;
    if (body.freezeType === 'order' && body.orderId) {
      try {
        const orderStmt = db.prepare('SELECT order_code, customer_name, delivery_date FROM crop_orders WHERE id = ?');
        orderStmt.bind([body.orderId]);
        if (orderStmt.step()) {
          const order = orderStmt.getAsObject();
          orderCode = String(order.order_code || '') || null;
          customerName = String(order.customer_name || '') || null;
          deliveryDate = String(order.delivery_date || '') || null;
        }
        orderStmt.free();
      } catch { /* 订单查询失败不影响冻结 */ }
    }

    // 4. 事务：写 freeze + 更新 stock + 写 transaction + 写 flow_log
    const { randomUUID } = await import('crypto');
    const freezeId = randomUUID();
    const now = new Date().toISOString();
    const freezeDate = formatLocalDateYYYYMMDD(new Date());

    try {
      // 4a. INSERT inventory_freeze
      db.run(`
        INSERT INTO inventory_freeze (
          id, instance_id, freeze_type, order_id, order_code,
          customer_name, delivery_date, purpose,
          freeze_quantity, used_quantity, status,
          operator_id, operator_name, freeze_date, remarks, create_time, updated_at
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, 0, 'frozen', ?, ?, ?, ?, ?, ?)
      `, [
        freezeId, body.instanceId, body.freezeType, body.orderId || null, orderCode,
        customerName, deliveryDate, body.purpose || (body.freezeType === 'order' ? '订单预留' : null),
        body.freezeQuantity,
        body.operatorId || null, body.operatorName || null, freezeDate,
        body.remarks || null, now, now,
      ]);

      // 4b. UPDATE inventory_stock.frozen_quantity
      const newFrozen = alreadyFrozen + body.freezeQuantity;
      db.run(
        'UPDATE inventory_stock SET frozen_quantity = ?, update_time = ? WHERE instance_id = ?',
        [newFrozen, now, body.instanceId]
      );

      // 4c. INSERT inventory_transaction (freeze流水)
      const txDateStr = formatLocalDateYYYYMMDD(new Date());
      const txId = `TRX-${txDateStr}-${String(Date.now() % 10000).padStart(4, '0')}`;
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'freeze', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, txId, body.instanceId, stock.stock_type,
        -body.freezeQuantity, currentQty, currentQty,
        body.orderId || null, body.freezeType === 'order' ? 'order' : 'manual', orderCode || null,
        body.operatorId || null, body.operatorName || null, freezeDate,
        body.remarks || `冻结${body.freezeQuantity}(${body.freezeType === 'order' ? '订单关联' : '手动'})`,
        now,
      ]);

      // 4d. 写 material_flow_log
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        writeFlowLog({
          flow_type: 'inventory→freeze',
          crop_name: stock.crop_name || '',
          crop_variety: stock.variety_name || '',
          source_type: 'inventory_stock',
          source_id: body.instanceId,
          source_code: body.instanceId,
          source_quantity: body.freezeQuantity,
          source_unit: stock.unit || '',
          source_category: 'manual',
          target_type: body.freezeType === 'order' ? 'order' : 'manual_freeze',
          target_id: body.orderId || freezeId,
          target_code: body.freezeType === 'order' ? (orderCode || body.orderId || '订单冻结') : (body.purpose || '手动冻结'),
          target_quantity: body.freezeQuantity,
          target_unit: stock.unit || '',
          business_code: orderCode || null,
          created_by: body.operatorName || '',
        });
      } catch (e) { console.error('[inventory] writeFlowLog 失败:', (e as any)?.message || e); }

      saveDatabase();

      res.json({
        success: true,
        data: {
          freezeId,
          instanceId: body.instanceId,
          frozenQuantity: newFrozen,
          freezeQuantity: body.freezeQuantity,
          freezeType: body.freezeType,
          orderId: body.orderId || null,
          orderCode,
          customerName,
          deliveryDate,
          purpose: body.purpose || (body.freezeType === 'order' ? '订单预留' : null),
          status: 'frozen',
          freezeDate,
        },
      });
    } catch (innerErr: any) {
      console.error('[POST /inventory/freeze] 事务失败:', innerErr);
      return res.status(500).json({ success: false, error: innerErr?.message || '冻结失败' });
    }
  } catch (e: any) {
    console.error('[POST /inventory/freeze]', e);
    res.status(500).json({ success: false, error: e?.message || '冻结失败' });
  }
});

/** POST /api/inventory/unfreeze/:freezeId — 解冻（全部或部分） */
router.post('/unfreeze/:freezeId', async (req: Request, res: Response) => {
  try {
    const { freezeId } = req.params;
    const body = req.body as {
      quantity?: number;
      operatorId?: string;
      operatorName?: string;
      remarks?: string;
    };

    const db = getDatabase();

    // 1. 查冻结记录
    const stmt = db.prepare('SELECT * FROM inventory_freeze WHERE id = ?');
    stmt.bind([freezeId]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, error: `冻结记录 ${freezeId} 不存在` });
    }
    const freeze = stmt.getAsObject();
    stmt.free();

    if (freeze.status !== 'frozen') {
      return res.status(400).json({ success: false, error: `该冻结记录状态为 ${freeze.status}，不能解冻` });
    }

    const unfreezeQty = body.quantity && body.quantity > 0 ? body.quantity : Number(freeze.freeze_quantity || 0);
    const remainingFrozen = Number(freeze.freeze_quantity || 0) - Number(freeze.used_quantity || 0);
    if (unfreezeQty > remainingFrozen) {
      return res.status(400).json({ success: false, error: `解冻数量 ${unfreezeQty} 超过剩余冻结量 ${remainingFrozen}` });
    }

    // 2. 查库存实例
    const stockStmt = db.prepare('SELECT * FROM inventory_stock WHERE instance_id = ?');
    stockStmt.bind([freeze.instance_id]);
    if (!stockStmt.step()) {
      stockStmt.free();
      return res.status(404).json({ success: false, error: '关联的库存实例不存在' });
    }
    const stock = stockStmt.getAsObject();
    stockStmt.free();

    const now = new Date().toISOString();
    const unfreezeDate = formatLocalDateYYYYMMDD(new Date());

    try {
      // 3a. 更新冻结记录
      const newUsed = Number(freeze.used_quantity || 0) + unfreezeQty;
      const isFullyUnfrozen = newUsed >= Number(freeze.freeze_quantity || 0);
      db.run(
        `UPDATE inventory_freeze
         SET used_quantity = ?, status = ?, unfreeze_date = ?, updated_at = ?
         WHERE id = ?`,
        [newUsed, isFullyUnfrozen ? 'released' : 'frozen', unfreezeDate, now, freezeId]
      );

      // 3b. UPDATE inventory_stock.frozen_quantity
      const currentFrozen = Number(stock.frozen_quantity) || 0;
      const newFrozen = Math.max(0, currentFrozen - unfreezeQty);
      db.run(
        'UPDATE inventory_stock SET frozen_quantity = ?, update_time = ? WHERE instance_id = ?',
        [newFrozen, now, freeze.instance_id]
      );

      // 3c. INSERT inventory_transaction (unfreeze流水)
      const txId = `TRX-${formatLocalDateYYYYMMDD(new Date())}-${String(Date.now() % 10000).padStart(4, '0')}`;
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'unfreeze', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, txId, freeze.instance_id, stock.stock_type,
        unfreezeQty, Number(stock.current_quantity) || 0, Number(stock.current_quantity) || 0,
        freeze.order_id || null, freeze.freeze_type || 'manual', freeze.order_code || null,
        body.operatorId || null, body.operatorName || null, unfreezeDate,
        body.remarks || `解冻${unfreezeQty}`,
        now,
      ]);

      saveDatabase();

      res.json({
        success: true,
        data: {
          freezeId,
          instanceId: freeze.instance_id,
          frozenQuantity: newFrozen,
          unfrozenQuantity: unfreezeQty,
          status: isFullyUnfrozen ? 'released' : 'frozen',
        },
      });
    } catch (innerErr: any) {
      console.error('[POST /inventory/unfreeze] 事务失败:', innerErr);
      return res.status(500).json({ success: false, error: innerErr?.message || '解冻失败' });
    }
  } catch (e: any) {
    console.error('[POST /inventory/unfreeze]', e);
    res.status(500).json({ success: false, error: e?.message || '解冻失败' });
  }
});

// ========== V3.1 出库流水 3 端点（出库记录独立页） ==========
// 设计文档：docs/superpowers/specs/2026-06-04-outbound-records-design.md §4
// 注意：必须在 GET /:id 通配之前（虽然 /transactions 与 /:id 不冲突，但保持顺序安全）
import { inventoryTransactionService } from '../services/inventoryTransaction.service';
import { toCSV } from '../utils/csvExporter';

// GET /api/inventory/transactions?from=...&to=...&stock_type=...&...
// 返回 rows + total + summary（一次拿到列表+统计，前端不用发两次请求）
router.get('/transactions', async (req: Request, res: Response) => {
  try {
    const { from, to, stock_type, warehouse_id, crop_name, operator_name, business_type, page, limit } = req.query as any;
    const query = {
      from, to,
      stockType: stock_type,
      warehouseId: warehouse_id,
      cropName: crop_name,
      operatorName: operator_name,
      businessType: business_type,
      page: page ? Number(page) : 1,
      limit: limit ? Number(limit) : 50,
    };
    const [list, stats] = await Promise.all([
      inventoryTransactionService.listOutbound(query),
      inventoryTransactionService.getStats(query),
    ]);
    res.json({ success: true, data: { ...list, summary: stats } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/transactions/stats?from=...&to=...&...
// 单独统计接口（页面刷新统计时用，不重查 rows）
router.get('/transactions/stats', async (req: Request, res: Response) => {
  try {
    const q = req.query as any;
    const stats = await inventoryTransactionService.getStats({
      from: q.from, to: q.to,
      stockType: q.stock_type, warehouseId: q.warehouse_id,
      cropName: q.crop_name, operatorName: q.operator_name, businessType: q.business_type,
    });
    res.json({ success: true, data: stats });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error.message });
  }
});

// GET /api/inventory/transactions/export?from=...&to=...&format=csv
// V3.1 后端只出 CSV（XLSX/PDF 走前端，避免后端 +1MB xlsx 依赖）
router.get('/transactions/export', async (req: Request, res: Response) => {
  try {
    const { format, ...rest } = req.query as any;
    if (format && format !== 'csv') {
      res.status(400).json({ success: false, error: `format=${format} 不支持，后端仅提供 csv（xlsx/pdf 由前端生成）` });
      return;
    }
    const query = {
      from: rest.from, to: rest.to,
      stockType: rest.stock_type, warehouseId: rest.warehouse_id,
      cropName: rest.crop_name, operatorName: rest.operator_name, businessType: rest.business_type,
      page: 1, limit: 100000, // 导出上限 10 万
    };
    const list = await inventoryTransactionService.listOutbound(query);
    const csv = toCSV(list.rows);
    const filename = `outbound-${new Date().toISOString().slice(0, 10)}.csv`;
    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.send(csv);
  } catch (error: any) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// ========== 兼容老 ProduceInventoryPage 的路由 ==========
// 这些路由从 V3 inventory_stock 表读，但字段映射到老 ProduceInventory 期望的 shape
// 缺失字段（grade / storage_location / expiration_date / harvest_date 等）以空值返回

/** GET /api/inventory 兼容老作物库存列表 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { stock_type, crop_name, status, page = 1, limit = 50 } = req.query;
    const db = getDatabase();

    let sql = `SELECT * FROM inventory_stock WHERE 1=1`;
    const params: any[] = [];
    // 2026-06-24: 排除已调拨到种源管理的行（种源管理是内部专用库存，不与作物库存重叠）
    sql += ` AND status != 'transferred'`;
    if (stock_type) { sql += ` AND stock_type = ?`; params.push(stock_type); }
    if (crop_name) { sql += ` AND crop_name LIKE ?`; params.push(`%${crop_name}%`); }
    if (status) { sql += ` AND status = ?`; params.push(status); }

    // 总数
    const countSql = sql.replace('SELECT *', 'SELECT COUNT(*) as total');
    const countResult = db.exec(countSql, params);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? Number(countResult[0].values[0][0]) || 0
      : 0;

    sql += ` ORDER BY create_time DESC LIMIT ? OFFSET ?`;
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      // 字段映射：V3 stock → 老 ProduceInventory 期望
      rows.push({
        ...r,
        product_code: r.business_code || `SKU-${r.instance_id}`,
        variety: r.variety_name || '',
        quantity: r.current_quantity || 0,
        grade: 'A',  // 老字段，V3 表没存
        storage_location: '',  // 老字段，V3 表没存
        harvest_date: r.inbound_date || '',
        storage_date: r.create_time || '',
        greenhouse_name: '',
        planting_mode: '',
        expiration_date: '',
        batch_code: r.business_code || '',
      });
    }
    stmt.free();

    res.json({
      success: true,
      data: rows,
      meta: { total, page: Number(page), limit: Number(limit) },
    });
  } catch (error) {
    console.error('[inventory] 兼容 GET / 失败:', error);
    res.status(500).json({ success: false, error: '获取库存失败' });
  }
});

/** GET /api/inventory/:id 兼容老详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const stmt = db.prepare('SELECT * FROM inventory_stock WHERE (id = ? OR instance_id = ?) LIMIT 1');
    stmt.bind([id, id]);
    if (!stmt.step()) {
      stmt.free();
      return res.status(404).json({ success: false, error: '库存不存在' });
    }
    const r = stmt.getAsObject();
    stmt.free();
    res.json({
      success: true,
      data: {
        ...r,
        product_code: r.business_code || `SKU-${r.instance_id}`,
        variety: r.variety_name || '',
        quantity: r.current_quantity || 0,
        grade: 'A',
        storage_location: '',
        harvest_date: r.inbound_date || '',
        storage_date: r.create_time || '',
        greenhouse_name: '',
        planting_mode: '',
        expiration_date: '',
        batch_code: r.business_code || '',
      },
    });
  } catch (error) {
    console.error('[inventory] 兼容 GET /:id 失败:', error);
    res.status(500).json({ success: false, error: '获取库存失败' });
  }
});

/** POST /api/inventory 兼容老新增（直接落 V3 stock） */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      product_code, crop_name, variety, stock_type = 'product',
      quantity = 0, unit, grade, warehouse_id, warehouse_name,
      storage_location, harvest_date, batch_code, greenhouse_name,
      planting_mode, production_plan_code, expiration_date, status = 'in_stock',
    } = req.body || {};

    const id = `STK-${Date.now()}`;
    // 2026-06-08 V2.1：4 位自增（替代 Math.random），对齐项目 [[code-generation-contract-rule]] 铁律
    // 2026-06-09 修复：用本地日期（不是 UTC），避免中国时区早上 0:00-8:00 显示昨天日期
    const dateStr = formatLocalDateYYYYMMDD();
    const prefix = stock_type === 'seed' ? 'INS' : stock_type === 'seedling' ? 'ISE' : 'IPR';
    const max = await inventoryStockRepository.getInstanceIdMaxSerial(prefix, dateStr);
    const instanceId = `${prefix}-${dateStr}-${String(max + 1).padStart(4, '0')}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO inventory_stock (
        id, instance_id, stock_type, business_id, business_code,
        crop_name, variety_name, current_quantity, frozen_quantity, available_quantity,
        unit, warehouse_id, warehouse_name, inbound_date,
        source_type, production_plan_code, status, version, create_time, update_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      id, instanceId, stock_type,
      `MANUAL-${Date.now()}`,  // business_id（手动新增）
      product_code || '',
      crop_name || '',
      variety || '',
      quantity, 0, quantity,
      unit || '公斤',
      warehouse_id || '', warehouse_name || '',
      harvest_date || now.slice(0, 10),
      'self_produced',
      production_plan_code || '',
      status, 1, now, now,
    ]);
    saveDatabase();

    res.status(201).json({ success: true, data: { id, instanceId } });
  } catch (error) {
    console.error('[inventory] 兼容 POST / 失败:', error);
    res.status(500).json({ success: false, error: '新增库存失败' });
  }
});

/** PUT /api/inventory/:id 兼容老更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const db = getDatabase();
    // 白名单（V3 stock 实际列）
    const allowed = ['crop_name', 'variety_name', 'current_quantity', 'frozen_quantity',
      'available_quantity', 'unit', 'warehouse_id', 'warehouse_name',
      'inbound_date', 'production_plan_code', 'status'];
    const fields: string[] = [];
    const values: any[] = [];
    for (const k of Object.keys(updates)) {
      // 老字段 → V3 字段映射
      let v3Key = k;
      if (k === 'quantity') v3Key = 'current_quantity';
      if (k === 'variety') v3Key = 'variety_name';
      if (k === 'cropName') v3Key = 'crop_name';
      if (k === 'warehouseId') v3Key = 'warehouse_id';
      if (k === 'warehouseName') v3Key = 'warehouse_name';
      if (allowed.includes(v3Key)) {
        fields.push(`${v3Key} = ?`);
        values.push(updates[k]);
      }
    }
    if (fields.length === 0) {
      return res.json({ success: true, data: { id, noop: true } });
    }
    fields.push('update_time = ?', 'version = version + 1');
    values.push(new Date().toISOString(), id);
    db.run(`UPDATE inventory_stock SET ${fields.join(', ')} WHERE id = ? OR instance_id = ?`,
      [...values, id, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[inventory] 兼容 PUT /:id 失败:', error);
    res.status(500).json({ success: false, error: '更新库存失败' });
  }
});

/** DELETE /api/inventory/batch?ids=id1,id2,id3 批量删除（必须在 /:id 之前注册） */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.query;
    if (!ids || typeof ids !== 'string') {
      return res.status(400).json({ success: false, error: '缺少 ids 参数' });
    }
    const idArray = ids.split(',').map(s => s.trim()).filter(Boolean);
    if (idArray.length === 0) {
      return res.json({ success: true, data: { deletedCount: 0 } });
    }
    const db = getDatabase();
    // 2026-07-03：批量删除前，逐条校验是否有下游出库流水
    const blocked: Array<{ id: string; reason: string }> = [];
    for (const stockId of idArray) {
      const check = checkInventoryStockDeletable(stockId);
      if (!check.ok) {
        blocked.push({ id: stockId, reason: check.error! });
      }
    }
    if (blocked.length > 0) {
      // 收集每条被拦截的详细信息
      const details = blocked.map((b) => {
        const check = checkInventoryStockDeletable(b.id);
        return {
          stockId: b.id,
          reason: b.reason,
          blockingTransactions: check.blockingTransactions || [],
        };
      });
      return res.status(400).json({
        success: false,
        error: `批量删除被拦截：${blocked.length} 条库存已被下游消耗，无法删除`,
        blocked: details,
      });
    }
    // 同时按 id 和 instance_id 匹配（兼容两种形态）
    const conditions = idArray.map(() => '(id = ? OR instance_id = ?)').join(' OR ');
    const params: any[] = [];
    idArray.forEach(id => params.push(id, id));
    db.run(`DELETE FROM inventory_stock WHERE ${conditions}`, params);
    saveDatabase();
    res.json({ success: true, data: { deletedCount: idArray.length } });
  } catch (error) {
    console.error('[inventory] 批量 DELETE /batch 失败:', error);
    res.status(500).json({ success: false, error: '批量删除库存失败' });
  }
});

/** DELETE /api/inventory/:id 兼容老删除（2026-07-03：增加出库校验） */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 2026-07-03：校验是否有下游出库流水
    const check = checkInventoryStockDeletable(id);
    if (!check.ok) {
      return res.status(400).json({
        success: false,
        error: check.error,
        blockingTransactions: check.blockingTransactions || [],
      });
    }
    const db = getDatabase();
    db.run('DELETE FROM inventory_stock WHERE id = ? OR instance_id = ?', [id, id]);
    saveDatabase();
    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('[inventory] 兼容 DELETE /:id 失败:', error);
    res.status(500).json({ success: false, error: '删除库存失败' });
  }
});

export default router;
