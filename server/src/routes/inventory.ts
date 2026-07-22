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
import { randomUUID } from 'crypto';
import { inventoryController } from '../controllers/inventory.controller';
import { checkInventoryStockDeletable } from '../services/inventoryDeleteGuard.service';
import { inventoryStockRepository } from '../repositories/inventory.repository';
import { generateStockId, generateInboundRecordId, generateTransactionId } from '../services/inventory.service';
import { getDatabase, saveDatabase } from '../db';
import { formatLocalDateYYYYMMDD } from '../utils/dateUtil';
// 2026-07-14：方案 C — 写操作后自动重算 status（冻结/解冻/出库/调拨等）
import { recomputeAndUpdateStockStatus, recomputeAllStockStatus } from '../lib/inventoryStockStatus';
// 2026-07-14：添加认证中间件（与 seedSource.ts 对齐——演示模式自动放行，生产模式需 JWT token）
import { authenticate } from '../middleware/auth';
// 2026-07-22：追溯修复 - 库存 CRUD 写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';

const router = Router();
router.use(authenticate);

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
// 2026-07-08 T13：单位 enum 直接内联定义（不再复用 planting.ts 的 7 个枚举）
// 与字典 category_code='unit' 12 项对齐：袋/株/粒/千克/克/吨/亩/m²/公顷/块/片/朵
const UNIT_ENUM = z.enum(['袋', '株', '粒', '千克', '克', '吨', '亩', 'm²', '公顷', '块', '片', '朵']);

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
  // 2026-07-08 P0 修复：AddStockModal 页面级"新增"无 source 记录，加 'manual' 模块标识
  //   - seed_source / seedling / planting：行级采收入库，必填 sourceId
  //   - manual：页面级新增入库，sourceId 可空（fetchSourceRow 会短路返回空对象）
  sourceModule: z.enum(['seed_source', 'seedling', 'planting', 'manual']),
  sourceId: z.string().optional(),  // 页面级入库可空；行级入库由 Zod min(1) 改成 optional 后由 fetchSourceRow 兜底校验
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
  // 2026-07-09 v5 阶段三（路径 B）：补录字段
  isSupplementary: z.boolean().optional(),
  supplementaryReason: z.string().optional(),
  // 2026-07-08 T8：作物 ID（前端弹窗从来源记录带出，可覆盖）
  cropId: z.string().optional(),
  // 2026-07-09：作物编码 / 名称 / 品种名（修复前 InboundSchema 缺这三个字段，
  // Zod 默认 strip → input.cropCode/cropName/varietyName 永远是 undefined → DB 写入 NULL）
  cropCode: z.string().optional(),
  cropName: z.string().optional(),
  varietyName: z.string().optional(),
  // 2026-07-08 T8.5：6 套字段矩阵补 8 字段
  // - supplierPhone：外购入库 — 供应商电话（库存表已有 supplier_*，这里补 phone 补全）
  // - giftFrom：赠品入库 — 赠送方
  // - consignor：委托入库 — 委托方
  // - sourceWarehouseName：调拨入库 — 源仓库名
  // - stocktakeNo：盘盈入库 — 盘点单号
  // - baseId / baseName：自产入库 — 基地 ID / 名
  // - plantingMode：自产入库 — 种植模式
  // - greenhouseName：自产入库 — 温室名
  supplierPhone: z.string().optional(),
  giftFrom: z.string().optional(),
  consignor: z.string().optional(),
  sourceWarehouseName: z.string().optional(),
  stocktakeNo: z.string().optional(),
  baseId: z.string().optional(),
  baseName: z.string().optional(),
  plantingMode: z.string().optional(),
  greenhouseName: z.string().optional(),
  // 2026-07-08 T13：作物形态字段（与前端 AddStockModal.constants 6 套 FIELD_CONFIG 对应）
  // 字典 category_code='crop_form' 6 项：整株/果实/种子/叶片/花朵/其他
  cropForm: z.string().optional(),
});

/**
 * 2026-07-13：生成 harvest_code（HS + YYYYMMDD + 3位当日自增）
 * 与 inventoryInboundFromSource.service.ts 的 generateHarvestCode 保持一致
 */
function generateHarvestCode(db: any, dateStr: string): string {
  const pattern = `HS${dateStr}___`;
  const stmt = db.prepare(`
    SELECT harvest_code FROM harvest_records
    WHERE harvest_code LIKE ? AND LENGTH(harvest_code) = 13
    ORDER BY harvest_code DESC LIMIT 1
  `);
  stmt.bind([pattern]);
  let maxSerial = 0;
  if (stmt.step()) {
    const row = stmt.getAsObject() as { harvest_code: string };
    maxSerial = parseInt(row.harvest_code.slice(-3), 10) || 0;
  }
  stmt.free();
  const seq = String(maxSerial + 1).padStart(3, '0');
  return `HS${dateStr}${seq}`;
}

/**
 * 辅助函数：按 sourceModule 查源记录（sql.js 标准 prepare/bind/step/getAsObject/free 模式）
 * 返回 null 表示源记录不存在
 * 2026-06-18: 扩展拉取 crop_code（种源）、greenhouse_name（育苗/种植）、planting_mode（种植）
 *   让 inventory_stock 能全量继承源数据，避免大部分列为空
 */
function fetchSourceRow(
  db: any,
  sourceModule: string,
  sourceId: string | undefined,
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
  // 2026-07-08 P0 修复：页面级入库（sourceModule=manual 或无 sourceId）跳过源记录查找
  // 返回 null 而不是空对象，下游 INSERT 写入的 source.* 字段会全部为 null
  if (sourceModule === 'manual' || !sourceId) {
    return null
  }
  // ⚠️ 列名差异：种源没有 crop_id/greenhouse_name；种植没有 crop_id/planting_mode
  // 按表分别 SELECT 实际存在的列
  let sql = ''
  if (sourceModule === 'seed_source') {
    sql = 'SELECT source_code, crop_code, crop_name, crop_variety, production_plan_code, unit FROM seed_sources WHERE id = ? AND deleted_at IS NULL'
  } else if (sourceModule === 'seedling') {
    sql = 'SELECT seedling_code, crop_id, crop_code, crop_name, crop_variety, production_plan_code, unit, greenhouse_name FROM seedlings WHERE id = ? AND deleted_at IS NULL'
  } else {
    sql = 'SELECT planting_code, crop_code, crop_name, crop_variety, production_plan_id, production_plan_code, unit, greenhouse_name FROM plantings WHERE id = ? AND deleted_at IS NULL'
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

    // 1. 校验 source + 取源数据（2026-07-08 P0：页面级 manual/无 sourceId 跳过源记录查找）
    const sourceRow = fetchSourceRow(db, input.sourceModule, input.sourceId)
    if (!sourceRow && input.sourceModule !== 'manual' && input.sourceId) return res.status(404).json({ success: false, error: '源记录不存在或已删除' })
    const source = sourceRow || { code: null, cropName: '', cropVariety: '', cropCode: '', cropId: null, productionPlanId: null, productionPlanCode: null, unit: null, greenhouseName: null, plantingMode: null }
    // DB 列 source_id NOT NULL；manual 模式用 'manual' 占位，下游按 sourceModule 区分
    const sourceIdForDb = input.sourceId || (input.sourceModule === 'manual' ? 'manual' : null) as any

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
      (id, instance_id, stock_type, business_id, business_type, business_code,
       source_module, source_id, source_type, crop_id, crop_code, crop_name, variety_name,
       current_quantity, available_quantity, unit, warehouse_id, warehouse_name,
       quality_grade, grade, supplier_id, supplier_name,
       unit_price, total_amount, purchase_date, inbound_date,
       production_plan_id, production_plan_code, planting_mode, greenhouse_name,
       source_form, notes, status, version, create_time, update_time,
       is_supplementary, supplementary_reason, supplementary_at, supplementary_by)
      VALUES (?, ?, ?, ?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'in_stock', 1, ?, ?,
              ?, ?, ?, ?)
    `, [
      stockId, instanceId, input.stockType,
      input.businessId || stockId, input.businessId || stockId,
      input.sourceModule, sourceIdForDb, input.sourceType,
      // 2026-07-09：作物字段优先 input.*（人工填写），缺省回退 source.*（行级联动）
      // 之前全读 source.* 导致页面级手动入库（source 为空对象）所有作物字段 NULL
      input.cropId || source.cropId || null,
      input.cropCode || source.cropCode || null,
      input.cropName || source.cropName || null,
      input.varietyName || source.cropVariety || null,
      input.quantity, input.quantity, input.unit,
      input.warehouseId, input.warehouseName || null,
      input.qualityGrade || null, input.qualityGrade || null,  // quality_grade + grade 同时填
      input.supplierId || null, input.supplierName || null,
      input.unitPrice || 0, input.totalAmount || 0,
      recordDate, recordDate,  // purchase_date + inbound_date
      productionPlanId, productionPlanCode,
      source.plantingMode || null, source.greenhouseName || null,
      // 2026-07-09：作物形态同步写到 source_form（前端 InventoryTable 列表"形态"列已读 stock.sourceForm）
      input.cropForm || null,
      input.notes || null, now, now,
      // 2026-07-09 v5 阶段三（路径 B）：补录字段
      // 模式 = 自产兜底 + 已选 sourceId → 视为补录
      // 后端自动写 at/by 审计字段
      input.isSupplementary ? 1 : 0,
      input.isSupplementary ? (input.supplementaryReason || null) : null,
      input.isSupplementary ? now : null,
      input.isSupplementary ? (input.operatorName || 'system') : null,
    ])

    // 3. 写 inventory_inbound_records
    // 2026-07-08 T8：插入 crop_id 列（与 inventory_stock 表对齐），保持原有列顺序稳定
    // 2026-07-08 T8.5：6 套字段矩阵补 9 列（supplier_phone/gift_from/consignor/source_warehouse_name/
    //   stocktake_no/base_id/base_name/planting_mode/greenhouse_name），列顺序在 crop_id 之后、crop_code 之前
    // 2026-07-08 T13：补 crop_form 列（作物形态：整株/果实/种子/叶片/花朵/其他）
    db.run(`
      INSERT INTO inventory_inbound_records
      (id, record_type, record_date, source_module, source_id, source_code,
       stock_type, source_type, warehouse_id, warehouse_name,
       crop_id,
       supplier_phone, gift_from, consignor, source_warehouse_name, stocktake_no,
       base_id, base_name, planting_mode, greenhouse_name,
       crop_form,
       crop_code, crop_name, variety_name,
       quantity, unit, unit_price, total_amount, quality_grade,
       supplier_id, supplier_name,
       production_plan_id, production_plan_code,
       business_id, notes, operator_name, create_by, create_time, update_time)
      VALUES (?, 'inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [
      recordId, recordDate,
      input.sourceModule, sourceIdForDb, source.code,
      input.stockType, input.sourceType,
      input.warehouseId, input.warehouseName || null,
      // crop_id 优先用前端传入的 cropId（人工覆盖），缺省回退到 source.cropId（育苗源记录）
      source.cropId || input.cropId || null,
      // 2026-07-08 T8.5：6 套字段矩阵补 9 字段值（顺序与列顺序一致）
      input.supplierPhone || null,
      input.giftFrom || null,
      input.consignor || null,
      input.sourceWarehouseName || null,
      input.stocktakeNo || null,
      input.baseId || null,
      input.baseName || null,
      input.plantingMode || null,
      input.greenhouseName || null,
      // 2026-07-08 T13：作物形态（crop_form 字段）
      input.cropForm || null,
      // 2026-07-09：作物字段优先 input.*（人工填写），缺省回退 source.*（行级联动）
      // 之前全读 source.* 导致页面级手动入库（source 为空对象）所有作物字段 NULL
      input.cropCode || source.cropCode || null,
      input.cropName || source.cropName || null,
      input.varietyName || source.cropVariety || null,
      input.quantity, input.unit, input.unitPrice || 0, input.totalAmount || 0,
      input.qualityGrade || null,
      input.supplierId || null, input.supplierName || null,
      productionPlanId, productionPlanCode,
      input.businessId || stockId, input.notes || null,
      input.operatorName || 'system', input.operatorName || 'system', now, now,
    ])

    // 4. 写 inventory_transaction（操作历史 Tab 数据源）
    // 2026-07-09 修复：之前 /inbound-record 路由缺 INSERT inventory_transaction，导致详情弹窗"操作历史" Tab 空白
    const transactionId = await generateTransactionId(dateStrInst);
    db.run(`
      INSERT INTO inventory_transaction (
        id, transaction_id, instance_id, stock_type, transaction_type, quantity,
        balance_before, balance_after, business_id, business_type, business_code,
        operator_name, operate_date, remarks, create_time
      ) VALUES (?, ?, ?, ?, 'inbound', ?, 0, ?, ?, 'inbound', ?, ?, ?, ?, ?)
    `, [
      transactionId, transactionId, instanceId, input.stockType,
      input.quantity, input.quantity,
      recordId, recordId,
      input.operatorName || 'system', recordDate,
      '新增入库',
      now,
    ])

    // 4.5 补录入库同步写 harvest_records（2026-07-13）
    // 让已结束行的采收记录弹窗（只读模式）也能看到补录记录，且 is_supplementary 列显示"是"
    let harvestCode: string | null = null;
    if (input.isSupplementary
      && (input.sourceModule === 'planting' || input.sourceModule === 'seedling')
      && input.sourceId
      && input.sourceId !== 'manual') {
      try {
        harvestCode = generateHarvestCode(db, dateStrInst);
        const harvestRecordId = randomUUID();
        // 构造 products JSON 数组（补录只有 1 个 product）
        const productsJson = JSON.stringify([{
          cropName: input.cropName || source.cropName || '',
          cropVariety: input.varietyName || source.cropVariety || '',
          harvestQuantity: input.quantity,
          unit: input.unit,
          grade: input.qualityGrade || 'good',
        }]);
        // 注意：harvest_records 表没有 warehouse_name 列（查询时通过 LEFT JOIN warehouses 获取）
        db.run(`
          INSERT INTO harvest_records (
            id, harvest_code, source_module, source_id, source_name,
            harvest_date, warehouse_id,
            products, harvest_form, unit,
            is_supplementary, supplementary_reason,
            status, inbound_type,
            create_by, create_time, update_time
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'completed', 'supplementary', ?, ?, ?)
        `, [
          harvestRecordId, harvestCode,
          input.sourceModule, input.sourceId,
          input.cropName || source.cropName || '',
          recordDate,
          input.warehouseId,
          productsJson,
          input.cropForm || null,
          input.unit,
          1,  // is_supplementary
          input.supplementaryReason || null,
          input.operatorName || 'system', now, now,
        ]);
        console.log(`[补录反填] harvest_records ← ${harvestCode} (sourceModule=${input.sourceModule}, sourceId=${input.sourceId})`);
      } catch (e: any) {
        // harvest_records 写入失败不阻断主流程（库存已正确入库）
        console.error('[补录反填] harvest_records 写入失败（不阻断主流程）:', e?.message || e);
      }
    }

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
      } catch (e) {
        // 2026-07-14：原 catch(_e) 静默吞错，加 console.warn 标记位置（CLAUDE.md Fail Loud 铁律）
        console.warn('[POST /inventory/inbound-record] 仓库名补全失败（不阻断主流程）:', e);
      }
    }

    saveDatabase()
    res.json({ success: true, data: { stockId, recordId, harvestCode } })
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
        // 2026-07-16：硬上限 100 条，长生命周期产品避免 OOM
        const txStmt = db.prepare(`
          SELECT id, instance_id, transaction_type, quantity, business_code, operator_name, operate_date, remarks
          FROM inventory_transaction
          WHERE instance_id = ? AND transaction_type IN ('freeze', 'unfreeze')
          ORDER BY operate_date DESC
          LIMIT 100
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
      } catch (fallbackErr) {
        // 2026-07-14：原 catch(_) 静默吞错，加 console.warn 标记位置（CLAUDE.md Fail Loud 铁律）
        console.warn('[GET /inventory/freezes] inventory_transaction fallback 失败:', fallbackErr);
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
    // 2026-07-14：移除重复 await import('crypto')（line 14 已顶层导入 randomUUID）
    const freezeId = randomUUID();
    const now = new Date().toISOString();
    const freezeDate = formatLocalDateYYYYMMDD(new Date());

    db.exec('BEGIN');  // 2026-07-21 修复：4 步操作加事务包裹（防半成品数据）
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
      // 2026-07-14：方案 C — 冻结后重算 status（frozen_quantity > 0 → 'frozen'）
      recomputeAndUpdateStockStatus(getDatabase(), body.instanceId);

      // 4c. INSERT inventory_transaction (freeze流水)
      // 2026-07-15：改用 generateTransactionId（4位自增），替代 Date.now() % 10000（违反代码生成契约铁律）
      const txDateStr = formatLocalDateYYYYMMDD(new Date());
      const txId = await generateTransactionId(txDateStr);
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'freeze', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, txId, body.instanceId, stock.stock_type,
        -body.freezeQuantity, currentQty, currentQty,
        // 2026-07-14：freeze 流水统一业务类型为 'other'，businessCode 用 orderCode 兜底
        body.orderId || null, 'other', orderCode || (body.orderId || null),
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

      db.exec('COMMIT');  // 2026-07-21 修复：事务提交
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
      try { db.exec('ROLLBACK'); } catch {}  // 2026-07-21 修复：事务回滚
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

    db.exec('BEGIN');  // 2026-07-21 修复：3 步操作加事务包裹
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
      // 2026-07-14：方案 C — 解冻后重算 status（frozen_quantity=0 → 检查数量 → in_stock/low_stock/empty）
      recomputeAndUpdateStockStatus(getDatabase(), String(freeze.instance_id));

      // 3c. INSERT inventory_transaction (unfreeze流水)
      const txId = await generateTransactionId(formatLocalDateYYYYMMDD(new Date()));
      db.run(`
        INSERT INTO inventory_transaction (
          id, transaction_id, instance_id, stock_type, transaction_type, quantity,
          balance_before, balance_after, business_id, business_type, business_code,
          operator_id, operator_name, operate_date, remarks, create_time
        ) VALUES (?, ?, ?, ?, 'unfreeze', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        txId, txId, freeze.instance_id, stock.stock_type,
        unfreezeQty, Number(stock.current_quantity) || 0, Number(stock.current_quantity) || 0,
        // 2026-07-14：解冻流水统一业务类型为 'other'，businessCode 用 orderCode 兜底
        freeze.order_id || null, 'other', freeze.order_code || (freeze.order_id || null),
        body.operatorId || null, body.operatorName || null, unfreezeDate,
        body.remarks || `解冻${unfreezeQty}`,
        now,
      ]);

      db.exec('COMMIT');  // 2026-07-21 修复：事务提交
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
      try { db.exec('ROLLBACK'); } catch {}  // 2026-07-21 修复：事务回滚
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
    // 2026-07-15：改用本地日期（避免 UTC 在中国时区 0-8 点显示昨天）
const filename = `outbound-${formatLocalDateYYYYMMDD(new Date())}.csv`;
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

    // 2026-07-09：LEFT JOIN inventory_inbound_records 补 10 个专属字段
    //   （inventory_stock 表没有 consignor / giftFrom / sourceWarehouseName / stocktakeNo /
    //    supplierPhone / baseId / baseName / plantingMode / greenhouseName / cropForm）
    let sql = `
      SELECT s.*,
        ib.supplier_phone, ib.gift_from, ib.consignor, ib.source_warehouse_name, ib.stocktake_no,
        ib.base_id AS ib_base_id, ib.base_name AS ib_base_name,
        ib.planting_mode AS ib_planting_mode, ib.greenhouse_name AS ib_greenhouse_name,
        ib.crop_form AS ib_crop_form,
        ib.source_code AS ib_source_code
      FROM inventory_stock s
      LEFT JOIN inventory_inbound_records ib
        ON ib.business_id = s.id AND ib.id = (
          SELECT id FROM inventory_inbound_records WHERE business_id = s.id ORDER BY create_time DESC LIMIT 1
        )
      WHERE 1=1
    `;
    const params: any[] = [];
    // 2026-06-24: 排除已调拨到种源管理的行（种源管理是内部专用库存，不与作物库存重叠）
    sql += ` AND s.status != 'transferred'`;
    // 2026-07-16：过滤已用完的库存（status='depleted'/'empty' 或 quantity=0），
    //   避免退库后归零的种源库存记录（如 INS-20260716-0003）出现在作物库存列表
    //   与 inventoryTransfer.service.ts:156 的过滤条件对齐
    sql += ` AND s.current_quantity > 0`;
    sql += ` AND s.status NOT IN ('depleted', 'empty')`;
    if (stock_type) { sql += ` AND s.stock_type = ?`; params.push(stock_type); }
    if (crop_name) { sql += ` AND s.crop_name LIKE ?`; params.push(`%${crop_name}%`); }
    if (status) { sql += ` AND s.status = ?`; params.push(status); }

    // 总数
    const countSql = sql.replace('SELECT s.*,', 'SELECT COUNT(*) as total FROM (SELECT s.*')
      .replace(/LEFT JOIN[\s\S]*?LIMIT 1\)\)\s*$/m, ') sub')
    // 简化：用独立 COUNT
    const countResult = db.exec(`SELECT COUNT(*) AS total FROM inventory_stock WHERE 1=1 AND status != 'transferred'`, []);
    const total = countResult.length > 0 && countResult[0].values.length > 0
      ? Number(countResult[0].values[0][0]) || 0
      : 0;

    sql += ` ORDER BY s.create_time DESC LIMIT ? OFFSET ?`;
    const offset = (Number(page) - 1) * Number(limit);
    params.push(Number(limit), offset);

    const stmt = db.prepare(sql);
    stmt.bind(params);
    const rows: any[] = [];
    while (stmt.step()) {
      const r = stmt.getAsObject();
      // 字段映射：V3 stock → 老 ProduceInventory 期望
      // 2026-07-09：10 个专属字段（inventory_inbound_records 表独有）注入到 stock 对象
      rows.push({
        ...r,
        supplier_phone: r.supplier_phone || null,
        gift_from: r.gift_from || null,
        consignor: r.consignor || null,
        source_warehouse_name: r.source_warehouse_name || null,
        stocktake_no: r.stocktake_no || null,
        base_id: r.ib_base_id || null,
        base_name: r.ib_base_name || null,
        planting_mode: r.planting_mode || r.ib_planting_mode || null,
        greenhouse_name: r.greenhouse_name || r.ib_greenhouse_name || null,
        crop_form: r.crop_form || r.ib_crop_form || null,
        source_code: r.ib_source_code || null,
        product_code: r.business_code || `SKU-${r.instance_id}`,
        variety: r.variety_name || '',
        quantity: r.current_quantity || 0,
        grade: 'A',  // 老字段，V3 表没存
        storage_location: '',  // 老字段，V3 表没存
        harvest_date: r.inbound_date || '',
        storage_date: r.create_time || '',
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
    // 2026-07-09：JOIN inventory_inbound_records 补 5 个专属字段
    // （giftFrom/consignor/sourceWarehouseName/stocktakeNo/supplierPhone 在 inbound_records 表里）
    let inboundExtra: any = {};
    try {
      const ibStmt = db.prepare(`
        SELECT supplier_phone, gift_from, consignor, source_warehouse_name, stocktake_no, source_code
        FROM inventory_inbound_records
        WHERE business_id = ?
        ORDER BY create_time DESC LIMIT 1
      `);
      ibStmt.bind([r.id]);
      if (ibStmt.step()) inboundExtra = ibStmt.getAsObject();
      ibStmt.free();
    } catch (_) { /* 容错 */ }
    res.json({
      success: true,
      data: {
        ...r,
        // 2026-07-09：补 5 个专属字段（inventory_stock 表没有，从 inbound_records 注入）
        supplier_phone: inboundExtra.supplier_phone || r.supplier_phone || null,
        gift_from: inboundExtra.gift_from || r.gift_from || null,
        consignor: inboundExtra.consignor || r.consignor || null,
        source_warehouse_name: inboundExtra.source_warehouse_name || r.source_warehouse_name || null,
        stocktake_no: inboundExtra.stocktake_no || r.stocktake_no || null,
        // 2026-07-13：补录来源行编码（从 inbound_records 注入，供详情弹窗"来源行编码"显示）
        source_code: inboundExtra.source_code || r.source_code || null,
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

    // 2026-07-14：原 `STK-${Date.now()}` 违反 [[code-generation-contract-rule]] 铁律，改用 generateStockId
    const dateStr = formatLocalDateYYYYMMDD();
    const id = await generateStockId(dateStr);
    // 2026-06-08 V2.1：4 位自增（替代 Math.random），对齐项目 [[code-generation-contract-rule]] 铁律
    // 2026-06-09 修复：用本地日期（不是 UTC），避免中国时区早上 0:00-8:00 显示昨天日期
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
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'inventory_stock.create',
      businessId: id,
      action: 'create',
      operatorName: (req.body as any)?.create_by || (req as any).user?.name,
      opinion: `新增库存 ${crop_name} ${quantity}${unit}`,
    });
  } catch (error) {
    console.error('[inventory] 兼容 POST / 失败:', error);
    res.status(500).json({ success: false, error: '新增库存失败' });
  }
});

/**
 * POST /api/inventory/recompute-status
 * 2026-07-14：方案 C — 批量重算所有 inventory_stock.status
 * 用于修复历史脏数据（status 与 current_quantity/frozen_quantity 不一致）
 * 不接受任何参数，全表扫描
 * @returns { updated, total } 实际更新条数和总条数
 */
router.post('/recompute-status', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const result = recomputeAllStockStatus(db);
    saveDatabase();
    console.log(`[inventory.recompute-status] 重算完成: 更新 ${result.updated}/${result.total} 条`);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[inventory] recompute-status 失败:', error);
    res.status(500).json({ success: false, error: '批量重算状态失败' });
  }
});

/** PUT /api/inventory/:id 兼容老更新 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const updates = req.body || {};
    const db = getDatabase();
    // 白名单（V3 stock 实际列）
    // 2026-07-14：frozen_quantity 移除白名单（只能通过 /freeze /unfreeze 调整，避免审计链断裂）
    // 2026-07-21：补全缺失字段（编辑弹窗可保存）
    const allowed = ['crop_name', 'variety_name', 'current_quantity',
      'available_quantity', 'unit', 'warehouse_id', 'warehouse_name',
      'inbound_date', 'production_plan_code', 'status',
      // 2026-07-21 新增
      'grade', 'remarks', 'target_yield', 'planting_mode',
      'supplier_name', 'unit_price', 'total_amount',
      'crop_code', 'source_form', 'product_form',
      'greenhouse_name', 'area_name', 'expiry_date',
      'purchase_date', 'base_id', 'base_name',
    ];
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
    values.push(new Date().toISOString());
    db.run(`UPDATE inventory_stock SET ${fields.join(', ')} WHERE id = ? OR instance_id = ?`,
      [...values, id, id]);
    saveDatabase();

    // 2026-07-14：方案 C — 如果修改了数量/冻结字段，重算 status
    const needRecompute = fields.some(f => f.startsWith('current_quantity') || f.startsWith('frozen_quantity'));
    if (needRecompute) {
      recomputeAndUpdateStockStatus(getDatabase(), id);
    }

    res.json({ success: true, data: { id } });
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'inventory_stock.update',
      businessId: req.params.id,
      action: 'update',
      operatorName: (req as any).user?.name,
      opinion: `更新库存 ${req.params.id}`,
    });
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
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'inventory_stock.delete',
      businessId: idArray.join(','),
      action: 'delete',
      operatorName: (req as any).user?.name,
      opinion: `批量删除 ${idArray.length} 条库存`,
    });
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
    // 2026-07-22：追溯修复
    writeAuditLog({
      businessType: 'inventory_stock.delete',
      businessId: req.params.id,
      action: 'delete',
      operatorName: (req as any).user?.name,
      opinion: `删除库存 ${req.params.id}`,
    });
  } catch (error) {
    console.error('[inventory] 兼容 DELETE /:id 失败:', error);
    res.status(500).json({ success: false, error: '删除库存失败' });
  }
});

export default router;
