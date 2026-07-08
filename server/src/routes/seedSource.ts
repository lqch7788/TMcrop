/**
 * 种源路由
 * 精简为直接调用 Controller
 * C1：所有路由都经过 authenticate 中间件（演示模式自动放行，生产模式需 token）
 */

import { Router } from 'express';
import { z } from 'zod';
import { seedSourceController } from '../controllers/seedSource.controller';
import { seedSourceService } from '../services/seedSource.service';
import { getDatabase, saveDatabase } from '../db';
import { seedSourceRepository } from '../repositories/seedSource.repository';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';
// 2026-07-08 V3.4 流水号规范化：使用项目统一工具生成 TRX-YYYYMMDD-NNNN 流水号
// 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
import { generateTransactionId } from '../services/inventory.service';
import {
  executeReturnToInventory,
  listReturnableInboundRecords,
  SeedSourceReturnBusinessError,
  type ReturnItem,
} from '../services/seedSourceReturn.service';
import { queryToObjects } from '../utils/queryHelper';

const router = Router();

// C1：全局应用 auth 中间件（演示模式下 DEMO_USERS 名单会跳过认证）
router.use(authenticate);

// 注意：generate-code 和 batch 路由必须在 :id 路由之前，否则会被 :id 匹配

// 生成种源编码
router.get('/generate-code', (req, res, next) => seedSourceController.generateCode(req, res, next));

// 2026-06-26: 检查种源批号是否已存在（POST 前查重，避开 UNIQUE 异常）
router.get('/check-source-code', asyncHandler(async (req, res) => {
  const { code, excludeId } = req.query;
  if (!code || typeof code !== 'string') {
    return res.status(400).json({ success: false, error: '缺少 code 参数' });
  }
  const exists = await seedSourceService.checkSourceCodeExists(
    code,
    typeof excludeId === 'string' ? excludeId : undefined
  );
  res.json({ success: true, data: { exists, code } });
}));

// 批量删除路由必须在 /:id 之前
router.delete('/batch', (req, res, next) => seedSourceController.deleteBatch(req, res, next));

// 可用留种的种植记录（必须在 :id 路由之前，避免被 :id 匹配）
router.get('/available-for-seed-saving', (req, res, next) => seedSourceController.getPlantingsForSeedSaving(req, res, next));

// 繁殖阶段操作（带 :id 参数）
// 注意：全量查询路由 GET /propagation-records 必须注册在 :id 路由之前，否则 :id 会吞掉 propagation-records 字面量
router.get('/propagation-records', (req, res, next) => seedSourceController.getAllPropagationRecords(req, res, next));
router.get('/:id/propagation-records', (req, res, next) => seedSourceController.getPropagationRecords(req, res, next));
router.post('/:id/propagation-records', (req, res, next) => seedSourceController.addPropagationRecord(req, res, next));
// 2026-06-13: 与育苗每日记录对齐，新增单条记录的 PUT/DELETE（之前只有 GET 列表 + POST 新增）
router.put('/:id/propagation-records/:recordId', (req, res, next) => seedSourceController.updatePropagationRecord(req, res, next));
router.delete('/:id/propagation-records/:recordId', (req, res, next) => seedSourceController.deletePropagationRecord(req, res, next));
router.put('/:id/propagation-stage', (req, res, next) => seedSourceController.updatePropagationStage(req, res, next));
router.post('/:id/complete-propagation', (req, res, next) => seedSourceController.completePropagation(req, res, next));

// 扣减可用数量（育苗新增时调用，2026-06-05 新增）
router.post('/:id/decrease-available', (req, res, next) => seedSourceController.decreaseAvailable(req, res, next));

// 检查种源是否可删除（C8：下沉到 repository，补全所有引用方）
// 引用方：seedlings.source_id / propagation_records.seed_source_id / seed_source_print_records.seed_source_id / plantings.linked_planting_id
router.get('/:id/check-deletable', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const data = await seedSourceRepository.checkDeletable(id);
  res.json({ success: true, data });
}));

// 打印记录相关路由
// 获取打印记录
router.get('/:id/print-records', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const db = getDatabase();
  const records = db.exec(`
    SELECT * FROM seed_source_print_records
    WHERE seed_source_id = ?
    ORDER BY print_time DESC
  `, [id]);
  const data = records.length > 0 ? records[0].values.map(row => {
    const obj: any = {};
    records[0].columns.forEach((col, idx) => obj[col] = row[idx]);
    if (obj.label_numbers) obj.label_numbers = JSON.parse(obj.label_numbers);
    return obj;
  }) : [];
  res.json({ success: true, data });
}));

// 创建打印记录
router.post('/:id/print', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { printType, printCount, operator, labelNumbers } = req.body;
  const db = getDatabase();

  // 生成打印记录ID
  const recordId = `SPR${Date.now()}`;
  const now = new Date().toISOString();

  // 插入打印记录
  db.run(`
    INSERT INTO seed_source_print_records (id, seed_source_id, print_type, print_count, operator, label_numbers, print_time, create_time)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `, [recordId, id, printType || 'new', printCount || 1, operator || '', JSON.stringify(labelNumbers || []), now, now]);

  // 更新种源的打印次数
  db.run(`UPDATE seed_sources SET print_count = print_count + ? WHERE id = ?`, [printCount || 1, id]);

  saveDatabase();
  res.json({ success: true, data: { id: recordId, printCount: printCount || 1 } });
}));

// ============================================================
// V2 改造: 回流闭环路由 (任务 9: Phase 2) - 必须在 /:id 路由之前定义
// ============================================================
import { executeCirculation, revokeCirculation, listCirculations } from '../services/circulation.service'

/**
 * POST /api/seed-sources/circulation
 * 执行回流 (PROPAGATION/QUANTITY/DISPOSAL, destination 决定去向)
 */
router.post('/circulation', (req, res) => {
  try {
    const result = executeCirculation(req.body)
    res.json({ success: true, data: result })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/seed-sources/circulation
 * 查询回流记录 (按 sourceModule/sourceId/parentSourceId 过滤)
 */
router.get('/circulation', (req, res) => {
  try {
    const { sourceModule, sourceId, parentSourceId, newSourceId, seedSourceId } = req.query
    const records = listCirculations({
      sourceModule: sourceModule as string | undefined,
      sourceId: sourceId as string | undefined,
      parentSourceId: parentSourceId as string | undefined,
      newSourceId: newSourceId as string | undefined,
      seedSourceId: seedSourceId as string | undefined,
    })
    res.json({ success: true, data: records })
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message })
  }
})

/**
 * POST /api/seed-sources/circulation/:id/revoke
 * 撤销回流 (软删除 + 数量回退)
 */
router.post('/circulation/:id/revoke', (req, res) => {
  try {
    revokeCirculation(req.params.id, req.body)
    res.json({ success: true })
  } catch (e: any) {
    res.status(400).json({ success: false, error: e.message })
  }
})

/**
 * GET /api/seed-sources/inbound-summary?startDate=&endDate=&cropName=&supplierId=
 * 2026-07-07: 种源外购入库按作物品种（cropName 最细化）汇总 — Master-Detail 双层结构
 * - Master: 一行 = 一个 cropName（按最细化作物品种聚合）
 * - Detail: 该 cropName 下所有入库流水（按入库日期倒序）
 * - 筛选条件全部 optional，空 = 全部
 * ⚠️ 必须注册在 /:id 主路由之前，否则被 :id 匹配拦截（参考 /lookup 注释）
 */
router.get('/inbound-summary', asyncHandler(async (req, res) => {
  const { startDate, endDate, cropName, supplierId } = req.query as {
    startDate?: string;
    endDate?: string;
    cropName?: string;
    supplierId?: string;
  };

  // 2026-07-07: 种源外购入库 = stock_type='seed' AND source_type='external_purchase'
  // 排除种苗/采收/库存调拨等其他入库类型
  const rows = queryToObjects<any>(
    getDatabase(),
    `
      SELECT
        iir.id                                        AS record_id,
        iir.record_date                               AS record_date,
        iir.source_code                               AS seed_code,
        iir.supplier_id                               AS supplier_id,
        iir.supplier_name                             AS supplier_name,
        iir.crop_name                                 AS crop_name,
        iir.quantity                                  AS quantity,
        iir.unit                                      AS unit,
        iir.unit_price                                AS unit_price,
        iir.total_amount                              AS total_amount,
        iir.operator_name                             AS operator_name,
        iir.create_time                               AS create_time,
        ss.crop_category                              AS crop_category,
        ss.type_name                                  AS type_name,
        ss.variety_name                               AS variety_name
      FROM inventory_inbound_records iir
      LEFT JOIN seed_sources ss ON ss.id = iir.source_id
      WHERE iir.stock_type = 'seed'
        AND iir.source_type = 'external_purchase'
        AND (? IS NULL OR iir.record_date >= ?)
        AND (? IS NULL OR iir.record_date <= ?)
        AND (? IS NULL OR iir.crop_name LIKE ?)
        AND (? IS NULL OR iir.supplier_id = ?)
      ORDER BY iir.crop_name ASC, iir.record_date DESC
    `,
    [
      startDate || null, startDate || null,
      endDate || null, endDate || null,
      cropName ? `%${cropName}%` : null, cropName ? `%${cropName}%` : null,
      supplierId || null, supplierId || null,
    ],
  );

  // 内存聚合：按 cropName 最细化分组
  const aggregateMap = new Map<string, any>();
  for (const row of rows) {
    const key = row.cropName || '未命名品种';
    if (!aggregateMap.has(key)) {
      aggregateMap.set(key, {
        cropName: key,
        cropCategory: row.cropCategory || '',
        typeName: row.typeName || '',
        varietyName: row.varietyName || '',
        inboundCount: 0,
        totalQuantity: 0,
        totalAmount: 0,
        supplierSummary: '',
        lastInboundDate: '',
        details: [],
      });
    }
    const agg = aggregateMap.get(key);
    const qty = Number(row.quantity || 0);
    const amt = Number(row.totalAmount || 0);
    agg.inboundCount += 1;
    agg.totalQuantity += qty;
    agg.totalAmount += amt;
    if (!agg.lastInboundDate || (row.recordDate && row.recordDate > agg.lastInboundDate)) {
      agg.lastInboundDate = row.recordDate || '';
    }
    agg.details.push({
      recordId: row.recordId,
      recordDate: row.recordDate,
      seedCode: row.seedCode,
      supplierId: row.supplierId,
      supplierName: row.supplierName || '',
      quantity: qty,
      unit: row.unit || '',
      unitPrice: Number(row.unitPrice || 0),
      totalAmount: amt,
      operatorName: row.operatorName || '',
    });
  }
  // 派生：供应商清单（去重，逗号分隔；按出现顺序）
  for (const agg of aggregateMap.values()) {
    const seen = new Set<string>();
    const list: string[] = [];
    for (const d of agg.details) {
      const n = d.supplierName || '未知供应商';
      if (!seen.has(n)) { seen.add(n); list.push(n); }
    }
    agg.supplierSummary = list.join('、');
  }

  res.json({ success: true, data: Array.from(aggregateMap.values()) });
}));

/**
 * 2026-06-30: 种植调入弹窗用 — 按作物品种名搜索可用种源
 * GET /api/seed-sources/lookup
 * 注意：必须在 /:id 主路由之前注册，否则会被 :id 匹配拦截
 */
router.get('/lookup', (req, res) => {
  try {
    // 参数归一化：trim 空串视为未传
    const cropName = String(req.query.cropName || '').trim()
    const cropVariety = String(req.query.cropVariety || '').trim()
    const seedForm = String(req.query.seedForm || '').trim()
    // 上限 200，默认 50（防止误传超大值拖慢列表）
    const limit = Math.min(Number(req.query.limit) || 50, 200)

    // 仅返回有库存 + 未终止 + 非产品库存 + 未软删除的种源
    // 2026-06-30 Bug 修复：排除 source_type='product'（产品库存不属于种源范围）
    //                  + 排除 deleted_at IS NOT NULL（软删除的种源不应该出现在调入弹窗）
    // 与种源管理列表对齐：active 状态 + source_type 排除 product + 仅未软删除
    const conditions: string[] = [
      "remaining_quantity > 0",
      "status NOT IN ('depleted', 'cancelled')",
      "source_type != 'product'",  // 排除产品库存
      "deleted_at IS NULL",        // 排除软删除（与种源管理列表对齐）
    ]
    const params: any[] = []

    if (cropName) {
      conditions.push('crop_name LIKE ?')
      params.push(`%${cropName}%`)
    }
    if (cropVariety) {
      conditions.push('crop_variety LIKE ?')
      params.push(`%${cropVariety}%`)
    }
    if (seedForm) {
      // seedForm 是枚举值（seedling/seed/cutting/...），精确匹配
      conditions.push('seed_form = ?')
      params.push(seedForm)
    }

    const sql = `
      SELECT id,
             source_code AS sourceCode,
             crop_name AS cropName,
             crop_variety AS cropVariety,
             seed_form AS seedForm,
             remaining_quantity AS remainingQuantity,
             unit,
             source_type AS sourceType,
             status
      FROM seed_sources
      WHERE ${conditions.join(' AND ')}
      ORDER BY create_time DESC
      LIMIT ?
    `
    const rows = queryToObjects<any>(getDatabase(), sql, [...params, limit])
    res.json({ success: true, data: rows })
  } catch (e: any) {
    console.error('[seed-sources/lookup] error:', e)
    res.status(500).json({ success: false, error: e?.message || '查询失败' })
  }
})

/**
 * 2026-06-30: 种源详情"使用记录"tab 数据源（原"调入种植"，2026-07-05 改名）
 * GET /api/seed-sources/:id/usage-records
 * 必须在 /:id 主路由之前注册，否则会被 /:id 匹配拦截
 *
 * 命名变更说明：
 * - 原名 move-records / "调入种植" 容易误导（方向模糊 + 漏掉育苗环节）
 * - 改名为 usage-records / "使用记录"：明确表达"种源被消耗/调拨出去的全部记录"
 * - 覆盖范围：被育苗使用 + 种植移入/移出
 *
 * 2026-07-05 扩展：UNION ALL inventory_transaction 表
 * 修复"种源详情弹窗看不到被育苗使用"问题 — 之前 inventory_transaction 的 outbound 流水
 * （businessType='seedling'）只来自 seedling 路由写入，但 API 这里不查，
 * 导致前端"操作历史" Tab 只显示 planting_move_records（种植移入移出），漏掉育苗使用
 */
router.get('/:id/usage-records', (req, res) => {
  try {
    const seedSourceId = String(req.params.id)
    const rows = queryToObjects<any>(
      getDatabase(),
      `SELECT id, operationDate, operationType, quantity,
              sourceId, sourceCode,
              plantingId, plantingCode,
              toAreaId, toAreaName,
              fromAreaId, fromAreaName,
              operatorName, remarks,
              createTime,
              cropName, cropCode,
              seedForm
       FROM (
         -- 第一部分：种植移入移出记录（已有）
         SELECT pmr.id, pmr.operation_date AS operationDate,
                pmr.operation_type AS operationType, pmr.quantity,
                pmr.source_id AS sourceId, pmr.source_code AS sourceCode,
                pmr.planting_id AS plantingId, pmr.planting_code AS plantingCode,
                pmr.to_area_id AS toAreaId, pmr.to_area_name AS toAreaName,
                pmr.from_area_id AS fromAreaId, pmr.from_area_name AS fromAreaName,
                pmr.operator_name AS operatorName, pmr.remarks,
                pmr.create_time AS createTime,
                ss.crop_name AS cropName, ss.crop_code AS cropCode,
                ss.seed_form AS seedForm
         FROM planting_move_records pmr
         LEFT JOIN seed_sources ss ON ss.id = pmr.source_id
         WHERE pmr.source_id = ? AND pmr.source_type = 'seed'

         UNION ALL

         -- 第二部分：育苗使用种源的 outbound 流水（2026-07-05 扩展）
         -- inventory_transaction 的 instance_id = 'seed_source:<id>'，
         -- business_type='seedling' 表示被育苗使用，
         -- business_id / business_code 指向育苗记录（SDxxx）
         -- 操作类型映射：outbound → 'move_out'（种源被消耗/出库）
         --
         -- 字段补全策略（避免空列）：
         --   - sourceCode/cropName/cropCode/seedForm ← LEFT JOIN seed_sources
         --     （instance_id 去掉 'seed_source:' 前缀 = 种源 id）
         --   - toAreaName ← LEFT JOIN seedlings（业务 greenhouse_name）
         --   - plantingId/plantingCode ← business_id/business_code（已映射好）
         --   - operatorName ← tx.operator_name（创建时已存 create_by）
         SELECT tx.id, tx.operate_date AS operationDate,
                'move_out' AS operationType, tx.quantity AS quantity,
                ss.id AS sourceId, ss.source_code AS sourceCode,
                tx.business_id AS plantingId, tx.business_code AS plantingCode,
                '' AS toAreaId, s.greenhouse_name AS toAreaName,
                '' AS fromAreaId, '' AS fromAreaName,
                tx.operator_name AS operatorName, tx.remarks,
                tx.create_time AS createTime,
                ss.crop_name AS cropName, ss.crop_code AS cropCode,
                ss.seed_form AS seedForm
         FROM inventory_transaction tx
         LEFT JOIN seed_sources ss ON ss.id = substr(tx.instance_id, 13)  -- 跳过 'seed_source:' 前缀
         LEFT JOIN seedlings s ON s.id = tx.business_id
         WHERE tx.instance_id = ?
           AND tx.transaction_type = 'outbound'
           AND tx.business_type = 'seedling'
       )
       ORDER BY operationDate DESC, createTime DESC`,
      [seedSourceId, `seed_source:${seedSourceId}`]
    )
    res.json({ success: true, data: rows })
  } catch (e: any) {
    console.error('[seed-sources/:id/usage-records] error:', e)
    res.status(500).json({ success: false, error: e?.message || '查询失败' })
  }
})

// 将请求传递给 controller (放在 /circulation 之后, 避免 /circulation 被当成 :id)
router.get('/', (req, res, next) => seedSourceController.getAll(req, res, next));
router.get('/:id', (req, res, next) => seedSourceController.getById(req, res, next));
router.post('/', (req, res, next) => seedSourceController.create(req, res, next));
router.put('/:id', (req, res, next) => seedSourceController.update(req, res, next));
router.delete('/:id', (req, res, next) => seedSourceController.delete(req, res, next));

// ============ 2026-06-25 v3: 库存调拨入现有种源（append_existing 模式）============
/**
 * POST /api/seed-sources/append-from-inventory
 * 业务：用户在种源库操作列「调拨」按钮 → 选作物库存批次 → 提交
 *   1. 扣减 inventory_stock
 *   2. 写 inventory_transaction (outbound)
 *   3. UPDATE seed_sources（追加到目标种源）
 *   4. 写 inventory_inbound_records
 *   5. 同一 SQL 事务
 */
// 2026-06-26: 用本地日期避免 UTC 时区差（中国早上 0:00-8:00 UTC 还是昨天）
import { formatLocalDateISO } from '../utils/dateUtil';

const AppendItemSchema = z.object({
  sourceStockId: z.string().min(1),
  transferQuantity: z.number().int().positive(),
  unit: z.string().min(1),
});
const AppendFromInventorySchema = z.object({
  targetSeedSourceId: z.string().min(1),
  items: z.array(AppendItemSchema).min(1).max(100),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
  remarks: z.string().optional(),
});

class AppendBusinessError extends Error {
  code: string;
  httpStatus: number;
  constructor(code: string, message: string, httpStatus = 400) {
    super(message);
    this.code = code;
    this.httpStatus = httpStatus;
  }
}

router.post('/append-from-inventory', async (req, res) => {
  try {
    const parsed = AppendFromInventorySchema.safeParse(req.body);
    if (!parsed.success) {
      const issues =
        (parsed.error as unknown as { issues?: Array<{ message?: string }> }).issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const { targetSeedSourceId, items, operatorId, operatorName, remarks } = parsed.data;
    const operator = { id: operatorId || '', name: operatorName || 'system' };

    const db = getDatabase();
    const now = new Date().toISOString();
    // 2026-06-26: 用本地日期避免 UTC 时区差（中国早上 0:00-8:00 UTC 还是昨天）
    const dateStr = formatLocalDateISO();

    const writtenStockIds: string[] = [];
    const writtenTxIds: string[] = [];
    const writtenInboundRecordIds: string[] = [];
    // 2026-06-26: 修复 — DB 列名是 remaining_quantity（不是 available_count）
    const originalSeedSourceSnapshot: Array<{ id: string; remaining_quantity: number; quantity: number }> = [];
    const originalStockSnapshot: Array<{ id: string; current_quantity: number; available_quantity: number }> = [];

    try {
      // 1. 校验目标种源（用 prepared statement 模式）
      // 2026-06-26: 修复 — 列名 remaining_quantity（不是 available_count）
      const targetStmt = db.prepare(
        `SELECT id, source_code, remaining_quantity, quantity, unit, crop_code, crop_name
         FROM seed_sources WHERE id = ? AND deleted_at IS NULL`
      );
      targetStmt.bind([targetSeedSourceId]);
      const targetRow = targetStmt.step() ? (targetStmt.getAsObject() as Record<string, unknown>) : null;
      targetStmt.free();
      if (!targetRow) {
        throw new AppendBusinessError('SEED_SOURCE_NOT_FOUND', '目标种源不存在', 404);
      }
      const targetUnit = String(targetRow.unit || '');
      const targetCropCode = String(targetRow.crop_code || '');
      const targetCropName = String(targetRow.crop_name || '');
      const targetCode = String(targetRow.source_code || '');
      originalSeedSourceSnapshot.push({
        id: targetSeedSourceId,
        // 2026-06-26: 修复 — DB 列名是 remaining_quantity
        remaining_quantity: Number(targetRow.remaining_quantity || 0),
        quantity: Number(targetRow.quantity || 0),
      });

      let totalAppended = 0;

      for (const item of items) {
        // 2. 读源库存
        const sourceStmt = db.prepare(`SELECT * FROM inventory_stock WHERE id = ?`);
        sourceStmt.bind([item.sourceStockId]);
        const sourceObj = sourceStmt.step() ? (sourceStmt.getAsObject() as Record<string, unknown>) : null;
        sourceStmt.free();
        if (!sourceObj) {
          throw new AppendBusinessError('STOCK_NOT_FOUND', `源库存不存在: id=${item.sourceStockId}`, 404);
        }
        const sourceCurrent = Number(sourceObj.current_quantity || 0);
        const sourceAvailable = Number(sourceObj.available_quantity || 0);
        const sourceUnit = String(sourceObj.unit || '');
        const sourceStatus = String(sourceObj.status || '');
        const sourceCropCode = String(sourceObj.crop_code || '');
        const sourceInstanceId = String(sourceObj.instance_id || '');

        // 存储原始库存快照（用于精确回滚）
        originalStockSnapshot.push({
          id: item.sourceStockId,
          current_quantity: sourceCurrent,
          available_quantity: sourceAvailable,
        });

        // 3. 业务校验
        if (sourceStatus === 'depleted' || sourceCurrent <= 0) {
          throw new AppendBusinessError('STOCK_NOT_AVAILABLE', `源库存已耗尽: ${sourceInstanceId}`);
        }
        if (sourceCurrent < item.transferQuantity) {
          throw new AppendBusinessError(
            'INSUFFICIENT_QUANTITY',
            `源库存 ${sourceInstanceId} 可用 ${sourceCurrent}${sourceUnit}，需调拨 ${item.transferQuantity}${item.unit}`
          );
        }
        if (sourceUnit !== item.unit) {
          throw new AppendBusinessError('UNIT_MISMATCH', `源库存单位 ${sourceUnit} ≠ 调拨单位 ${item.unit}`);
        }
        if (sourceUnit !== targetUnit) {
          throw new AppendBusinessError('UNIT_MISMATCH_TARGET', `源库存单位 ${sourceUnit} ≠ 目标种源单位 ${targetUnit}`);
        }
        if (sourceCropCode && targetCropCode && sourceCropCode !== targetCropCode) {
          throw new AppendBusinessError('CROP_CODE_MISMATCH', `源库存作物 ${sourceCropCode} ≠ 目标种源作物 ${targetCropCode}`);
        }

        // 4. 扣减源库存
        const newSourceCurrent = sourceCurrent - item.transferQuantity;
        const newSourceAvailable = Math.max(0, sourceAvailable - item.transferQuantity);
        const newSourceStatus = newSourceCurrent === 0 ? 'depleted' : sourceStatus;
        const updStock = db.prepare(
          `UPDATE inventory_stock
           SET current_quantity = ?, available_quantity = ?, status = ?, update_time = ?
           WHERE id = ? AND current_quantity >= ?`
        );
        updStock.run([newSourceCurrent, newSourceAvailable, newSourceStatus, now, item.sourceStockId, item.transferQuantity]);
        updStock.free();
        writtenStockIds.push(item.sourceStockId);

        // 5. 写 inventory_transaction (outbound)
        // 2026-07-08 V3.4 流水号规范化：使用项目统一工具 generateTransactionId 生成 TRX-YYYYMMDD-NNNN 流水号
        // 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
        // 之前 2026-06-26 修复的「跨表唯一」问题由 getTransactionIdMaxSerial 内部 LIKE + UNIQUE 约束保证
        const outTxId = await generateTransactionId(dateStr);
        const outTransactionId = await generateTransactionId(dateStr);
        const insTx = db.prepare(
          `INSERT INTO inventory_transaction (
            id, transaction_id, instance_id, stock_type, transaction_type, quantity,
            balance_before, balance_after, business_id, business_type, business_code,
            operator_id, operator_name, operate_date, remarks, create_time
          ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)`
        );
        insTx.run([
          outTxId, outTransactionId, sourceInstanceId, String(sourceObj.stock_type || 'seed'),
          item.transferQuantity, sourceCurrent, newSourceCurrent,
          targetSeedSourceId, targetCode, operator.id, operator.name, dateStr,
          `调拨入种源 ${targetCode}（追加模式）`, now,
        ]);
        insTx.free();
        writtenTxIds.push(outTxId);

        // 6. UPDATE 目标种源
        // 2026-06-26: 修复 — 列名 remaining_quantity（不是 available_count）
        // 2026-07-01 P0-3 修复：调拨入种源时继承源库存的 seed_form（仅在种源记录 seed_form 为空时设置，避免覆盖已有值）
        // 2026-07-06 Bug 17 修复：删除 quality_grade 字段写入 — seed_sources 表无此列（仅 inventory_inbound_records 有），
        //   写会报 `no such column: quality_grade`，且 quality_grade 属于入库记录的检验/分拣信息，不应污染种源主表
        const updSS = db.prepare(
          `UPDATE seed_sources
           SET remaining_quantity = remaining_quantity + ?, quantity = quantity + ?,
               seed_form = COALESCE(NULLIF(seed_form, ''), ?),
               update_time = ?
           WHERE id = ? AND deleted_at IS NULL`
        );
        // 2026-07-06 Bug 18 修复：seed_form 优先从 inventory_stock.product_form 取（中文"花朵/果实/种子"等 12 选），
        //   fallback 到 stock_type（英文 seed/seedling/product，仅历史数据兜底）
        //   之前用 stock_type 直接写，导致种源列表形态列显示英文（如 "seedling"）
        const sourceForm = String(sourceObj.product_form || sourceObj.stock_type || '');
        updSS.run([item.transferQuantity, item.transferQuantity, sourceForm, now, targetSeedSourceId]);
        updSS.free();

        // 7. 写 inventory_inbound_records
        // 2026-06-26: 修复 — 用 timestamp+random 避免 generateInstanceId('IR') 与 inventory_stock.instance_id 跨表冲突
        const inRecId = `IRA-${dateStr}-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        // 2026-06-26: 修复 — inventory_inbound_records 表 schema 修正
        // 实际列（按 schema.ts / fixMissingSchema.ts）：
        //   id, record_type, record_date, source_module, source_id, source_code,
        //   stock_type, source_type, warehouse_id, warehouse_name,
        //   crop_id, crop_code, crop_name, variety_name,
        //   quantity, unit, unit_price, total_amount, quality_grade,
        //   supplier_id, supplier_name, production_plan_id, production_plan_code,
        //   business_id, notes, operator_name, create_by, create_time, update_time
        // 之前错误使用了不存在的列：target_module, target_id, target_code, operator_id, remarks
        const insIR = db.prepare(
          `INSERT INTO inventory_inbound_records (
            id, record_type, record_date, source_module, source_id, source_code,
            stock_type, source_type,
            crop_code, crop_name,
            quantity, unit, quality_grade,
            business_id, notes, operator_name, create_time
          ) VALUES (?, 'inbound', ?, 'inventory', ?, ?, ?, 'transfer_inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        insIR.run([
          inRecId,
          dateStr,
          item.sourceStockId, sourceInstanceId,
          String(sourceObj.stock_type || 'seed'),
          targetCropCode, targetCropName,
          item.transferQuantity, item.unit,
          null,
          targetSeedSourceId,
          remarks || `追加入库（从 ${sourceInstanceId} 入种源 ${targetCode}）`,
          operator.name,
          now,
        ]);
        insIR.free();
        writtenInboundRecordIds.push(inRecId);

        totalAppended += item.transferQuantity;
      }

      // 8. 读最新值
      // 2026-06-26: 修复 — 列名 remaining_quantity（不是 available_count）
      const newStateStmt = db.prepare(
        `SELECT remaining_quantity, quantity FROM seed_sources WHERE id = ?`
      );
      newStateStmt.bind([targetSeedSourceId]);
      const newState = newStateStmt.step() ? (newStateStmt.getAsObject() as Record<string, unknown>) : null;
      newStateStmt.free();
      const newAvailable = Number(newState?.remaining_quantity || 0);
      const newQuantity = Number(newState?.quantity || 0);

      saveDatabase();

      return res.json({
        success: true,
        appendedCount: totalAppended,
        newAvailableCount: newAvailable,
        newQuantity,
        targetSeedSource: { id: targetSeedSourceId, code: targetCode, cropName: targetCropName },
      });
    } catch (err) {
      console.error('[append-from-inventory] failed, rolling back:', err);
      try {
        for (const id of writtenInboundRecordIds) {
          const d = db.prepare('DELETE FROM inventory_inbound_records WHERE id = ?');
          d.run([id]);
          d.free();
        }
        for (const snap of originalSeedSourceSnapshot) {
          // 2026-06-26: 修复 — 列名 remaining_quantity（不是 available_count）
          const u = db.prepare(
            `UPDATE seed_sources SET remaining_quantity = ?, quantity = ?, update_time = ? WHERE id = ?`
          );
          u.run([snap.remaining_quantity, snap.quantity, now, snap.id]);
          u.free();
        }
        for (const id of writtenTxIds) {
          const d = db.prepare('DELETE FROM inventory_transaction WHERE id = ?');
          d.run([id]);
          d.free();
        }
        for (const snap of originalStockSnapshot) {
          const u = db.prepare(
            `UPDATE inventory_stock
             SET current_quantity = ?, available_quantity = ?, status = 'in_stock', update_time = ?
             WHERE id = ?`
          );
          u.run([snap.current_quantity, snap.available_quantity, now, snap.id]);
          u.free();
        }
        saveDatabase();
      } catch (rollbackErr) {
        console.error('[append-from-inventory] rollback failed:', rollbackErr);
      }
      throw err;
    }
  } catch (err) {
    if (err instanceof AppendBusinessError) {
      return res.status(err.httpStatus).json({ success: false, code: err.code, error: err.message });
    }
    console.error('[append-from-inventory] server error:', err);
    return res.status(500).json({ success: false, error: err instanceof Error ? err.message : '调拨失败' });
  }
});

/**
 * GET /api/seed-sources/:id/inbound-records
 * 列出该种源的可退库流水（inventory_inbound_records 中 source_module='inventory' 且未退完）
 * 2026-06-26 Q1: 种源退库功能 — 必须 1:1 关联原库存
 */
router.get('/:id/inbound-records', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const rows = listReturnableInboundRecords(id);
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/seed-sources/:id/history-inbound
 * 2026-06-26: 种源历史入库流水（全部 inventory_inbound_records，含 source_module='inventory' 调拨和 'seed_source' 入库）
 * 用于种源页"入库记录" Tab
 */
router.get('/:id/history-inbound', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { getDatabase } = require('../db');
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM inventory_inbound_records
    WHERE (source_id = ? AND source_module = 'seed_source')
       OR (business_id = ?)
    ORDER BY create_time DESC LIMIT 200
  `);
  stmt.bind([id, id]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/seed-sources/:id/history-inventory
 * 2026-06-26: 种源关联的库存流水（inventory_transaction）
 * 用于种源页"库存流水" Tab
 */
router.get('/:id/history-inventory', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { getDatabase } = require('../db');
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT it.* FROM inventory_transaction it
    INNER JOIN inventory_stock ist ON it.instance_id = ist.instance_id
    WHERE it.business_id = ? OR ist.business_id = ? OR ist.business_type = 'inventory_transfer' AND ist.business_code = (
      SELECT source_code FROM seed_sources WHERE id = ?
    )
    ORDER BY it.create_time DESC LIMIT 200
  `);
  stmt.bind([id, id, id]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/seed-sources/:id/history-circulation
 * 2026-06-26: 种源关联的回流记录（crop_circulation_records）
 * 用于种源页"回流记录" Tab
 */
router.get('/:id/history-circulation', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { getDatabase } = require('../db');
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM crop_circulation_records
    WHERE parent_source_id = ? OR new_source_id = ?
    ORDER BY created_at DESC LIMIT 200
  `);
  stmt.bind([id, id]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/seed-sources/:id/history-audit
 * 2026-06-26: 种源审计记录（audit_logs 表，business_type='seed_source'）
 * 用于种源页"变更记录" Tab
 */
router.get('/:id/history-audit', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { getDatabase } = require('../db');
  const db = getDatabase();
  const stmt = db.prepare(`
    SELECT * FROM audit_logs
    WHERE business_type = 'seed_source' AND business_id = ?
    ORDER BY created_at DESC LIMIT 200
  `);
  stmt.bind([id]);
  const rows: any[] = [];
  while (stmt.step()) rows.push(stmt.getAsObject());
  stmt.free();
  res.json({ success: true, data: rows });
}));

/**
 * GET /api/seed-sources/:id/history
 * 2026-06-27: 统一实体历史端点（audit_logs + inbound + transaction + circulation UNION）
 * 替代分散的 4 个 history-* 端点（旧端点保留兼容）
 */
router.get('/:id/history', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const { queryEntityHistory } = require('../services/entityHistory.service');
  const items = queryEntityHistory('seed_source', id, 200);
  res.json({ success: true, data: items });
}));

/**
 * POST /api/seed-sources/return-to-inventory
 * 2026-06-26 Q1: 种源退库（严格 1:1 关联 inventory_inbound_records）
 * Body: { targetSeedSourceId, items: [{ inboundRecordId, quantity, unit }] }
 */
const ReturnItemSchema = z.object({
  inboundRecordId: z.string().min(1, { message: 'inboundRecordId 必填' }),
  quantity: z.number().int().positive({ message: '退库数量必须为正整数' }),
  unit: z.string().min(1).optional(),
});
const ReturnSchema = z.object({
  targetSeedSourceId: z.string().min(1, { message: '目标种源 ID 必填' }),
  items: z.array(ReturnItemSchema).min(1, { message: '至少 1 条退库明细' }).max(100),
  operatorId: z.string().optional(),
  operatorName: z.string().optional(),
  remarks: z.string().optional(),
});

router.post('/return-to-inventory', async (req, res) => {
  try {
    const parsed = ReturnSchema.safeParse(req.body);
    if (!parsed.success) {
      const issues = (parsed.error as any)?.issues || [];
      const first = issues[0];
      return res.status(400).json({ success: false, error: first?.message || '参数错误' });
    }
    const { targetSeedSourceId, items } = parsed.data;
    const result = executeReturnToInventory(
      targetSeedSourceId,
      items.map(i => ({ inboundRecordId: i.inboundRecordId, quantity: i.quantity, unit: i.unit || '' })),
    );
    res.json({ success: true, data: result });
  } catch (e: any) {
    if (e instanceof SeedSourceReturnBusinessError) {
      return res.status(e.httpStatus).json({ success: false, code: e.code, error: e.message });
    }
    console.error('[return-to-inventory] server error:', e);
    return res.status(500).json({ success: false, error: e?.message || '退库失败' });
  }
});

export default router;
