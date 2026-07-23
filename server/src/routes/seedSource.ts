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
// 2026-07-14：方案 C — 调拨后重算 status
import { recomputeAndUpdateStockStatus } from '../lib/inventoryStockStatus';
// 2026-07-08 V3.4 流水号规范化：使用项目统一工具生成 TRX-YYYYMMDD-NNNN 流水号
// 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
// 2026-07-19 P0-8：generateInboundRecordId 改静态 import（避免 require() 运行时错误）
import { generateTransactionId, generateInboundRecordId } from '../services/inventory.service';
import {
  executeReturnToInventory,
  listReturnableInboundRecords,
  SeedSourceReturnBusinessError,
  type ReturnItem,
} from '../services/seedSourceReturn.service';
import { queryToObjects } from '../utils/queryHelper';
// 2026-07-19 P0-8：所有 require() 改静态 import（避免 Vite/Rollup dynamic-import 报错）
import { queryEntityHistory } from '../services/entityHistory.service';
// 2026-07-18: 入库冲销服务
import { reverseInboundRecord } from '../services/inboundReverse.service';
import { revokeCirculationRecord } from '../services/circulationRevoke.service';
// 2026-07-22：追溯修复 - 打印/状态变更写入 audit_log
import { writeAuditLog } from '../services/auditLog.service';
// 2026-07-22：上游溯源 - 种源详情"溯源链" tab
import { traceUpstream } from '../services/upstreamTrace.service';

const router = Router();

// C1：全局应用 auth 中间件（演示模式下 DEMO_USERS 名单会跳过认证）
router.use(authenticate);

// 注意：generate-code 和 batch 路由必须在 :id 路由之前，否则会被 :id 匹配

// 生成种源编码
router.get('/generate-code', (req, res, next) => seedSourceController.generateCode(req, res, next));

// 2026-07-18: 种源合并功能 — 必须在 /:id 路由之前，否则会被吞
router.get('/matchable', asyncHandler(async (req, res) => {
  try {
    const { cropCode, seedForm, unit, generation, propagationMethod, linkedPlantingId } = req.query;
    if (!cropCode || !seedForm || !unit) {
      return res.status(400).json({ success: false, error: 'cropCode, seedForm, unit 必填' });
    }
    const result = await seedSourceRepository.findMergeableSeedSource({
      cropCode: String(cropCode),
      seedForm: String(seedForm),
      unit: String(unit),
      generation: generation ? String(generation) : null,
      propagationMethod: propagationMethod ? String(propagationMethod) : null,
      linkedPlantingId: linkedPlantingId ? String(linkedPlantingId) : null,
    });
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}));

// 2026-07-18: 同作物种源参考列表（业务上下文展示，不会自动合并）
// 用于种植自留种弹窗的"同作物参考列表"卡片
// query: ?cropCode=xxx&excludeId=yyy (可选)
router.get('/same-crop-sources', asyncHandler(async (req, res) => {
  try {
    const { cropCode, excludeId } = req.query;
    if (!cropCode) {
      return res.status(400).json({ success: false, error: 'cropCode 必填' });
    }
    const result = await seedSourceRepository.findSameCropSeedSources(
      String(cropCode),
      excludeId ? String(excludeId) : undefined,
    );
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}));

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

// 2026-07-22：上游溯源（种源详情"溯源链" tab）—— 必须在 /:id/check-deletable 之前
router.get('/:id/upstream-trace', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const maxDepth = Math.min(10, Math.max(1, Number(req.query.maxDepth) || 10));
  const data = traceUpstream(id, maxDepth);
  res.json({ success: true, data });
}));

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
const PrintRecordSchema = z.object({
  printType: z.string().min(1).max(50).optional(),
  printCount: z.number().int().min(1).max(1000).default(1),
  operator: z.string().min(1).max(50).optional(),
  labelNumbers: z.array(z.union([z.string(), z.number()])).max(10000).optional(),
});
router.post('/:id/print', asyncHandler(async (req, res) => {
  const { id } = req.params;
  const parsed = PrintRecordSchema.safeParse(req.body || {});
  if (!parsed.success) {
    const issues = (parsed.error as any)?.issues || [];
    return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
  }
  const { printType, printCount = 1, operator, labelNumbers } = parsed.data;
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

  // 2026-07-22：追溯修复 - 写入 audit_log
  writeAuditLog({
    businessType: 'seed_source.print',
    businessId: id,
    action: 'print',
    operatorName: operator,
    opinion: `打印 ${printType || 'new'} ×${printCount || 1}`,
  });

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
router.post('/circulation', async (req, res) => {
  try {
    const result = await executeCirculation(req.body)
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
 * 2026-07-19：撤销留种回流（PROPAGATION 类型，完整版）
 * - 整批作废，不删种植事实
 * - 库存/reflowCount 同步回退
 * - 审计写入 circulation_edit_log
 * - 关联 planting_harvest_records 标 circulation_revoked_at
 * （旧版 circulation.service.revokeCirculation 仅 archive 种源，库存不回退；2026-07-19 升级为新 service）
 */
// 2026-07-19 P0-7：撤销回流 zod schema 校验（自定义错误信息含字段名，便于测试和前端识别）
// 2026-07-19 P2：用 preprocess 把 undefined 转 '' → 让 min(1) 触发自定义错误信息
const RevokeCirculationSchema = z.object({
  reason: z.preprocess(
    (val) => val ?? '',
    z.string().min(1, { message: 'reason 必填' }).max(500, { message: 'reason 不超过 500 字符' })
  ),
});
router.post('/circulation/:id/revoke', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = RevokeCirculationSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const issues = (parsed.error as any)?.issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const { reason } = parsed.data;
    revokeCirculationRecord({
      circulationId: String(id),
      reason: String(reason).trim(),
      operatorId: req.user?.userId,
      operatorName: req.user?.name,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
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
import { formatLocalDateISO, formatLocalDateYYYYMMDD } from '../utils/dateUtil';

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

// 2026-07-14：业务错误基类统一（与 services/seedSource.service.ts 的 BusinessError 共用）
import { BusinessError as AppendBusinessError } from '../services/seedSource.service';

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
    // 2026-07-20 修复：ID 生成用紧凑格式 (YYYYMMDD)，日期字段用 ISO 格式 (YYYY-MM-DD)
    //   之前 dateStr 格式为 2026-07-20，传入 generateInboundRecordId/generateTransactionId 后
    //   getInboundIdMaxSerial 的 LIKE/LENGTH 过滤会漏掉所有紧凑格式记录，导致 maxSerial=0 → 重复 ID 冲突
    const dateStr = formatLocalDateISO();              // YYYY-MM-DD，用于 operate_date/record_date 字段
    const idDateStr = formatLocalDateYYYYMMDD();       // YYYYMMDD，用于 ID 生成

    const writtenStockIds: string[] = [];
    const writtenTxIds: string[] = [];
    const writtenInboundRecordIds: string[] = [];
    // 2026-07-14：方案 C — 改用 BEGIN/COMMIT/ROLLBACK 取代手动快照恢复（sql.js 支持 SQLite 原生事务）
    // 保留 snapshot 仅作为兜底（事务失败时回滚 ROLLBACK 不一定能干净回滚 sql.js 内存状态）

    // 2026-07-14：开启事务
    db.exec('BEGIN TRANSACTION');

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
        // 2026-07-14：方案 C — 只更新数量，status 由 recompute 自动计算（recompute 会处理 transferred 状态）
        const updStock = db.prepare(
          `UPDATE inventory_stock
           SET current_quantity = ?, available_quantity = ?, update_time = ?
           WHERE id = ? AND current_quantity >= ?`
        );
        updStock.run([newSourceCurrent, newSourceAvailable, now, item.sourceStockId, item.transferQuantity]);
        updStock.free();
        // 重算 status（调拨后数量可能变 0 → empty，或 < 10 → low_stock）
        recomputeAndUpdateStockStatus(getDatabase(), item.sourceStockId);
        writtenStockIds.push(item.sourceStockId);

        // 5. 写 inventory_transaction (outbound)
        // 2026-07-08 V3.4 流水号规范化：使用项目统一工具 generateTransactionId 生成 TRX-YYYYMMDD-NNNN 流水号
        // 替代原 TXO-/OUT- + Math.random() 违规格式（违反 [[code-generation-contract-rule]] 铁律）
        // 之前 2026-06-26 修复的「跨表唯一」问题由 getTransactionIdMaxSerial 内部 LIKE + UNIQUE 约束保证
        const outTxId = await generateTransactionId(idDateStr);
        const outTransactionId = await generateTransactionId(idDateStr);
        const insTx = db.prepare(
          `INSERT INTO inventory_transaction (
            id, transaction_id, instance_id, stock_type, transaction_type, quantity,
            balance_before, balance_after, business_id, business_type, business_code,
            operator_id, operator_name, operate_date, remarks, create_time
          ) VALUES (?, ?, ?, ?, 'outbound', ?, ?, ?, ?, 'transfer', ?, ?, ?, ?, ?, ?)`
        );
        insTx.run([
          outTxId, outTransactionId, sourceInstanceId, String(sourceObj.stock_type || 'seed'),
          -item.transferQuantity, sourceCurrent, newSourceCurrent,
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
        // 2026-07-14：流水号改用 generateInboundRecordId（替代 Math.random + Date.now 违规格式）
        // 2026-07-19 P0-8：改静态 import（直接调用即可）
        const inRecId = await generateInboundRecordId(idDateStr);
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
            warehouse_id, warehouse_name,
            crop_id, crop_code, crop_name, variety_name,
            quantity, unit, unit_price, total_amount, quality_grade,
            supplier_id, supplier_name,
            production_plan_id, production_plan_code,
            business_id, notes, operator_name, create_time
          ) VALUES (?, 'inbound', ?, 'inventory', ?, ?, ?, 'transfer_inbound', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        insIR.run([
          inRecId,
          dateStr,
          item.sourceStockId, sourceInstanceId,
          String(sourceObj.stock_type || 'seed'),
          // 仓库/品种/供应商/价格：从源库存行继承（追加入库时前端不传这些字段，否则入库记录缺字段显示为 "-"）
          String(sourceObj.warehouse_id || ''),
          String(sourceObj.warehouse_name || ''),
          String(sourceObj.crop_id || ''),
          targetCropCode || String(sourceObj.crop_code || ''),
          targetCropName || String(sourceObj.crop_name || ''),
          String(sourceObj.variety_name || ''),
          item.transferQuantity, item.unit,
          Number(sourceObj.unit_price || 0),
          Number(sourceObj.total_amount || 0) > 0
            ? Number(item.transferQuantity) * Number(sourceObj.unit_price || 0)
            : 0,
          null,
          String(sourceObj.supplier_id || ''),
          String(sourceObj.supplier_name || ''),
          String(sourceObj.production_plan_id || ''),
          String(sourceObj.production_plan_code || ''),
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

      // 2026-07-14：所有 SQL 成功 → 提交事务
      db.exec('COMMIT');
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
      // 2026-07-14：方案 C — 用 SQLite ROLLBACK 替代手动快照恢复（sql.js 支持原生事务）
      try {
        db.exec('ROLLBACK');
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
 * 2026-07-18: 改为 UNION 查询（inventory_inbound_records + crop_circulation_records PROPAGATION）
 * 用于种源页"入库记录" Tab
 */
router.get('/:id/history-inbound', asyncHandler(async (req, res) => {
  const { id } = req.params;
  try {
    const records = await seedSourceRepository.getInboundRecordsUnion(String(id));
    res.json({ success: true, data: records });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}));

/**
 * POST /api/seed-sources/:id/reverse-inbound
 * 2026-07-18: 冲销入库流水（软删除 + 库存回退）
 * 2026-07-19 P0-7：加 zod schema 校验入参
 * body: { inboundRecordId, reason }
 */
// 2026-07-19 P2：preprocess 兼容客户端不发字段的情况
const ReverseInboundSchema = z.object({
  inboundRecordId: z.preprocess(
    (val) => val ?? '',
    z.string().min(1, { message: 'inboundRecordId 必填' }).max(200, { message: 'inboundRecordId 不超过 200 字符' })
  ),
  reason: z.preprocess(
    (val) => val ?? '',
    z.string().min(1, { message: 'reason 必填' }).max(500, { message: 'reason 不超过 500 字符' })
  ),
});
router.post('/:id/reverse-inbound', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const parsed = ReverseInboundSchema.safeParse(req.body || {});
    if (!parsed.success) {
      const issues = (parsed.error as any)?.issues || [];
      return res.status(400).json({ success: false, error: issues[0]?.message || '参数错误' });
    }
    const { inboundRecordId, reason } = parsed.data;
    reverseInboundRecord(String(id), {
      inboundRecordId,
      reason,
      operatorId: req.user?.userId,
      operatorName: req.user?.name,
    });
    res.json({ success: true });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
}));

/**
 * GET /api/seed-sources/:id/inbound-audit
 * 2026-07-18: 入库审计日志（冲销/编辑记录，来自 inbound_edit_log + circulation_edit_log UNION）
 */
router.get('/:id/inbound-audit', asyncHandler(async (req, res) => {
  try {
    const { id } = req.params;
    const logs = await seedSourceRepository.getInboundEditLogs(String(id));
    res.json({ success: true, data: logs });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
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
  // 2026-07-19 P1：显式加括号修正 OR 优先级（避免 inventory_transfer 行混入非本种源流水）
  const stmt = db.prepare(`
    SELECT it.* FROM inventory_transaction it
    INNER JOIN inventory_stock ist ON it.instance_id = ist.instance_id
    WHERE (
      it.business_id = ?
      OR ist.business_id = ?
      OR (ist.business_type = 'inventory_transfer'
          AND ist.business_code = (SELECT source_code FROM seed_sources WHERE id = ?))
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
  // 2026-07-19 P0-8：改静态 import（直接调用即可）
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
      { id: req.user?.userId, name: req.user?.name },
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
