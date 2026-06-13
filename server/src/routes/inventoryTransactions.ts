/**
 * 库存交易记录 API 路由（V3.1 出库记录主页面）
 * 2026-06-04 新增：V2.1 铁律改造（OutboundRecordsPage 从 useState 迁到 Store）
 * 2026-06-04 修订：用户要求"新表字段 = 老表字段 + 保留原数据"。
 *          本路由直接读老表 inventory_transaction（保留 29 条真实数据），
 *          删新表 inventory_transactions（8 条假数据随之消失）。
 *
 * 数据流：useInventoryTransactionStore → enhancedApiClient → /api/inventory-transactions
 *      → inventoryTransactionService.listOutbound → 老表 inventory_transaction
 */

import { Router, Request, Response } from 'express';
import { inventoryTransactionService } from '../services/inventoryTransaction.service';
import { inventoryTransactionRepository } from '../repositories/inventory-tx.repository';
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';
import { formatLocalDateYYYYMMDD, formatLocalDateISO } from '../utils/dateUtil';

const router = Router();

/** 出库业务类型合法值（与前端 src/constants/outboundConstants.ts 的 OutboundBusinessType 同步） */
const VALID_OUTBOUND_TYPES = new Set([
  'customer_sale', 'transfer_out', 'damage_loss', 'internal_planting',
  'gift_sample', 'return_inbound', 'inventory_adjust', 'other',
]);

/** 老表 → 前端 OutboundRow 全字段映射（与 src/stores/useInventoryTransactionStore.OutboundRow 保持一致） */
function transformRow(row: any): Record<string, unknown> {
  return {
    // 主键
    id: row.id,
    instanceId: row.instanceId,
    // 类型/状态
    stockType: row.stockType,
    transactionType: row.transactionType,
    type: row.transactionType,
    status: row.status,
    // 数量
    quantity: row.quantity,
    quantityOut: row.quantityOut ?? Math.abs(Number(row.quantity) || 0),
    balanceBefore: row.balanceBefore,
    balanceAfter: row.balanceAfter,
    unit: row.unit,
    // 业务
    businessId: row.businessId,
    businessType: row.businessType,
    businessCode: row.businessCode,
    // 操作
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    operatorDate: row.operateDate,
    outboundDate: row.operateDate,
    createdAt: row.createTime,
    // 关联信息
    cropId: row.cropId,
    cropName: row.cropName,
    varietyId: row.varietyId,
    varietyName: row.varietyName,
    cropCode: row.cropCode,
    warehouseId: row.warehouseId,
    warehouseName: row.warehouseName,
    greenhouseName: row.greenhouseName,
    plantingMode: row.plantingMode,
    grade: row.grade,
    // 备注/其他
    remarks: row.remarks,
    receiver: row.receiver,
    unitPrice: row.unitPrice,
    totalAmount: row.totalAmount,
    updatedAt: row.updateTime,
  };
}

/** 列表（分页 + 筛选）——直接调老 service 读老表 inventory_transaction */
router.get('/', async (req: Request, res: Response) => {
  try {
    const { from, to, stockType, warehouseId, cropName, operatorName, businessType, page = '1', limit = '50' } = req.query;
    const pageNum = Math.max(1, parseInt(String(page), 10) || 1);
    const limitNum = Math.min(500, Math.max(1, parseInt(String(limit), 10) || 50));

    const result = await inventoryTransactionService.listOutbound({
      from: String(from || ''),
      to: String(to || ''),
      stockType: stockType ? String(stockType) : undefined,
      warehouseId: warehouseId ? String(warehouseId) : undefined,
      cropName: cropName ? String(cropName) : undefined,
      operatorName: operatorName ? String(operatorName) : undefined,
      businessType: businessType ? String(businessType) : undefined,
      page: pageNum,
      limit: limitNum,
    });

    // 聚合统计
    let summary = { totalQuantity: 0, totalAmount: 0, count: 0 };
    try {
      const stats = await inventoryTransactionService.getStats({
        from: String(from || ''),
        to: String(to || ''),
        stockType: stockType ? String(stockType) : undefined,
        warehouseId: warehouseId ? String(warehouseId) : undefined,
        cropName: cropName ? String(cropName) : undefined,
        operatorName: operatorName ? String(operatorName) : undefined,
        businessType: businessType ? String(businessType) : undefined,
      });
      summary = {
        totalQuantity: Number(stats.totalQuantity) || 0,
        totalAmount: 0, // 老表无金额字段
        count: Number(stats.totalCount) || 0,
      };
    } catch {
      // 统计失败不影响列表
    }

    res.json({
      success: true,
      data: {
        rows: result.rows.map(transformRow),
        total: result.total,
        summary,
      },
      meta: { page: pageNum, limit: limitNum, totalPages: Math.ceil(result.total / limitNum) },
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
  }
});

/** 创建出库（V2.1 铁律：Store 写操作的唯一入口） */
router.post('/', authenticate, async (req: Request, res: Response) => {
  try {
    const body = req.body as {
      instanceId: string;
      businessId?: string;
      businessType: string;
      businessCode?: string;
      quantity: number;
      operatorId?: string;
      operatorName?: string;
      remarks?: string;
    };

    // 1. 校验 businessType
    if (!body.businessType || !VALID_OUTBOUND_TYPES.has(body.businessType)) {
      return res.status(400).json({
        success: false,
        error: `不支持的出库业务类型: ${body.businessType || '(空)'}`,
      });
    }

    // 2. 校验必填
    if (!body.instanceId) {
      return res.status(400).json({ success: false, error: '缺少 instanceId' });
    }
    if (!body.quantity || body.quantity <= 0) {
      return res.status(400).json({ success: false, error: '出库数量必须大于 0' });
    }

    // 3. 查库存
    const db = getDatabase();
    const stockStmt = db.prepare('SELECT * FROM inventory_stock WHERE instance_id = ?');
    stockStmt.bind([body.instanceId]);
    let stock: any = null;
    if (stockStmt.step()) stock = stockStmt.getAsObject();
    stockStmt.free();
    if (!stock) {
      return res.status(404).json({ success: false, error: `库存实例 ${body.instanceId} 不存在` });
    }

    const currentQty = Number(stock.current_quantity) || 0;
    const frozenQty = Number(stock.frozen_quantity) || 0;
    const available = currentQty - frozenQty;
    if (available < body.quantity) {
      return res.status(400).json({
        success: false,
        error: `可用数量不足：可用 ${available}，需要 ${body.quantity}`,
      });
    }

    // 4. 扣减库存（乐观锁）
    const newQty = currentQty - body.quantity;
    const now = new Date();
    const nowIso = now.toISOString();
    const version = stock.version ?? 1;
    const updateStmt = db.prepare(
      'UPDATE inventory_stock SET current_quantity = ?, version = version + 1, update_time = ? WHERE instance_id = ? AND version = ?'
    );
    updateStmt.run([newQty, nowIso, body.instanceId, version]);
    // 2026-06-08 修复：乐观锁 0 rows 静默通过会导致"假流水"（库存没扣但写流水），违反 Fail Loud
    // 这里显式检查 affected rows，0 行即版本冲突，直接 409 退出，避免后续 insert 假数据
    const modified = db.getRowsModified();
    updateStmt.free();
    if (modified === 0) {
      console.warn(`[inventoryTransactions POST] 乐观锁冲突: instance=${body.instanceId} version=${version}`);
      return res.status(409).json({
        success: false,
        error: `库存版本冲突：${body.instanceId} 已被其他操作修改，请刷新后重试`,
      });
    }

    // 5. 写老表 inventory_transaction
    // 2026-06-08 V2.1：4 位自增 ID（TRX + YYYYMMDD + NNNN），替代 Math.random 4 字符 base36
    // 对齐项目 [[code-generation-contract-rule]] 铁律"禁止 Math.random()"
    // 2026-06-09 修复：用本地日期（不是 UTC），避免中国时区早上 0:00-8:00 显示昨天日期
    // 5 次重试：UNIQUE 冲突时下一轮查 max（已被对方更新）→ 序号 +1 跳过
    const txDateStr = formatLocalDateYYYYMMDD(new Date());
    const insertSql = `
      INSERT INTO inventory_transaction (
        id, transaction_id, instance_id, stock_type, transaction_type, quantity,
        balance_before, balance_after, business_id, business_type, business_code,
        operator_id, operator_name, operate_date, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `;
    const insertParams = (txId: string) => [
      txId, txId, body.instanceId, stock.stock_type, 'outbound',
      -body.quantity, currentQty, newQty, body.businessId || null, body.businessType, body.businessCode || null,
      body.operatorId || null, body.operatorName || '系统操作员', formatLocalDateISO(now),
      body.remarks || '出库', nowIso,
    ];
    let txId: string | null = null;
    for (let attempt = 0; attempt < 5; attempt++) {
      const max = await inventoryTransactionRepository.getTransactionIdMaxSerial(txDateStr);
      const candidate = `TRX-${txDateStr}-${String(max + 1).padStart(4, '0')}`;
      const stmt = db.prepare(insertSql);
      try {
        stmt.run(insertParams(candidate));
        stmt.free();
        txId = candidate;
        break;
      } catch (err) {
        stmt.free();
        if (attempt === 4) throw err; // 最后一次重试失败抛错
        // 否则下一轮重查 max 跳过已存在的序号
      }
    }

    saveDatabase();

    // 6. 状态更新（出库后数量为 0 → empty）
    if (newQty === 0) {
      const statusStmt = db.prepare(
        "UPDATE inventory_stock SET status = 'empty', update_time = ? WHERE instance_id = ?"
      );
      statusStmt.run([nowIso, body.instanceId]);
      statusStmt.free();
      saveDatabase();
    }

    // 8. 写入 material_flow_log（按 businessType 白名单）
    try {
      const { writeFlowLog } = require('../services/flowLogService');
      const { mapOutboundToFlowType, mapInventorySourceToCategory } = require('../lib/sourceCategoryMapper');
      const flowType = mapOutboundToFlowType(body.businessType || '');
      if (flowType) {
        writeFlowLog({
          flow_type: flowType,
          crop_name: stock.crop_name || '',
          crop_variety: stock.crop_variety || stock.variety || '',
          source_type: 'inventory_stock',
          source_id: body.instanceId || '',
          source_code: body.instanceId || '',
          source_quantity: body.quantity || 0,
          source_unit: stock.unit || '',
          source_category: mapInventorySourceToCategory(stock.source_type || stock.sourceType),
          target_type: body.businessType || '',
          target_id: body.target_id || body.instanceId || '',
          target_code: body.business_code || body.businessCode || '',
          target_quantity: body.quantity || 0,
          target_unit: stock.unit || '',
          business_code: body.business_code || body.businessCode || '',
          created_by: (req as any).user?.name || '',
        });
      }
    } catch (e) { /* flow_log 写入失败不影响主流程 */ }

    // 9. 返回 Store OutboundRow 全字段（用 transformRow）
    const txRow = {
      id: txId,
      instanceId: body.instanceId,
      stockType: stock.stock_type,
      transactionType: 'outbound',
      transaction_type: 'outbound',
      quantity: -body.quantity,
      balanceBefore: currentQty,
      balanceAfter: newQty,
      businessId: body.businessId,
      businessType: body.businessType,
      businessCode: body.businessCode,
      operatorId: body.operatorId,
      operatorName: body.operatorName || '系统操作员',
      operateDate: formatLocalDateISO(now),
      createTime: nowIso,
      updateTime: nowIso,
      cropName: stock.crop_name,
      varietyName: stock.variety_name,
      cropCode: stock.crop_code,
      unit: stock.unit,
      warehouseName: stock.warehouse_name,
      greenhouseName: stock.greenhouse_name,
      plantingMode: stock.planting_mode,
      grade: stock.grade,
      remarks: body.remarks || '出库',
    };
    return res.json({ success: true, data: transformRow(txRow) });
  } catch (error) {
    console.error('[inventoryTransactions POST] 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '出库失败',
    });
  }
});

/** 更新（不支持，保留接口一致） */
router.put('/:id', async (_req: Request, res: Response) => {
  res.status(405).json({ success: false, error: '库存交易记录不允许直接更新' });
});

/** 删除出库流水（V2.1 铁律：与作物库存删除对齐，硬删 inventory_transaction） */
router.delete('/:id', authenticate, async (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    if (!id) {
      return res.status(400).json({ success: false, error: '缺少 id' });
    }
    const db = getDatabase();
    // 先查是否存在
    const stmt = db.prepare('SELECT id FROM inventory_transaction WHERE id = ?');
    stmt.bind([id]);
    const exists = stmt.step();
    stmt.free();
    if (!exists) {
      return res.status(404).json({ success: false, error: `出库记录 ${id} 不存在` });
    }
    // 硬删
    const delStmt = db.prepare('DELETE FROM inventory_transaction WHERE id = ?');
    delStmt.run([id]);
    delStmt.free();
    saveDatabase();
    return res.json({ success: true, data: { id, deleted: true } });
  } catch (error) {
    console.error('[inventoryTransactions DELETE] 失败:', error);
    return res.status(500).json({
      success: false,
      error: error instanceof Error ? error.message : '删除失败',
    });
  }
});

export default router;
