/**
 * 种源路由
 * 精简为直接调用 Controller
 * C1：所有路由都经过 authenticate 中间件（演示模式自动放行，生产模式需 token）
 */

import { Router } from 'express';
import { seedSourceController } from '../controllers/seedSource.controller';
import { getDatabase, saveDatabase } from '../db';
import { seedSourceRepository } from '../repositories/seedSource.repository';
import { authenticate } from '../middleware/auth';
import { asyncHandler } from '../middleware/errorHandler';

const router = Router();

// C1：全局应用 auth 中间件（演示模式下 DEMO_USERS 名单会跳过认证）
router.use(authenticate);

// 注意：generate-code 和 batch 路由必须在 :id 路由之前，否则会被 :id 匹配

// 生成种源编码
router.get('/generate-code', (req, res, next) => seedSourceController.generateCode(req, res, next));

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
import { z } from 'zod';
import { generateInstanceId } from '../services/inventory.service';

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
    const dateStr = now.slice(0, 10);

    const writtenStockIds: string[] = [];
    const writtenTxIds: string[] = [];
    const writtenInboundRecordIds: string[] = [];
    const originalSeedSourceSnapshot: Array<{ id: string; available_count: number; quantity: number }> = [];
    const originalStockSnapshot: Array<{ id: string; current_quantity: number; available_quantity: number }> = [];

    try {
      // 1. 校验目标种源（用 prepared statement 模式）
      const targetStmt = db.prepare(
        `SELECT id, source_code, available_count, quantity, unit, crop_code, crop_name
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
        available_count: Number(targetRow.available_count || 0),
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
        const outTxId = await generateInstanceId('TX', dateStr);
        const outTransactionId = `OUT-${dateStr}-${outTxId.slice(-6)}`;
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
        const updSS = db.prepare(
          `UPDATE seed_sources
           SET available_count = available_count + ?, quantity = quantity + ?, update_time = ?
           WHERE id = ? AND deleted_at IS NULL`
        );
        updSS.run([item.transferQuantity, item.transferQuantity, now, targetSeedSourceId]);
        updSS.free();

        // 7. 写 inventory_inbound_records
        const inRecId = await generateInstanceId('IR', dateStr);
        const insIR = db.prepare(
          `INSERT INTO inventory_inbound_records (
            id, source_module, source_id, source_code,
            target_module, target_id, target_code,
            quantity, unit, quality_grade, operator_id, operator_name,
            remarks, record_date, create_time
          ) VALUES (?, 'inventory', ?, ?, 'seed_source', ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
        );
        insIR.run([
          inRecId, item.sourceStockId, sourceInstanceId,
          targetSeedSourceId, targetCode, item.transferQuantity, item.unit,
          null, operator.id, operator.name,
          remarks || `追加入库（从 ${sourceInstanceId}）`,
          dateStr, now,
        ]);
        insIR.free();
        writtenInboundRecordIds.push(inRecId);

        totalAppended += item.transferQuantity;
      }

      // 8. 读最新值
      const newStateStmt = db.prepare(
        `SELECT available_count, quantity FROM seed_sources WHERE id = ?`
      );
      newStateStmt.bind([targetSeedSourceId]);
      const newState = newStateStmt.step() ? (newStateStmt.getAsObject() as Record<string, unknown>) : null;
      newStateStmt.free();
      const newAvailable = Number(newState?.available_count || 0);
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
          const u = db.prepare(
            `UPDATE seed_sources SET available_count = ?, quantity = ?, update_time = ? WHERE id = ?`
          );
          u.run([snap.available_count, snap.quantity, now, snap.id]);
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

export default router;
