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
import { getDatabase, saveDatabase } from '../db';
import { authenticate } from '../middleware/auth';

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
    updateStmt.free();

    // 5. 写老表 inventory_transaction
    const txId = `TRX-OUT-${now.getTime()}-${Math.random().toString(36).slice(2, 6).toUpperCase()}`;
    const insertStmt = db.prepare(`
      INSERT INTO inventory_transaction (
        id, instance_id, stock_type, transaction_type, quantity,
        balance_before, balance_after, business_id, business_type, business_code,
        operator_id, operator_name, operate_date, remarks, create_time
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `);
    insertStmt.run([
      txId,
      body.instanceId,
      stock.stock_type,
      'outbound',
      -body.quantity,
      currentQty,
      newQty,
      body.businessId || null,
      body.businessType,
      body.businessCode || null,
      body.operatorId || null,
      body.operatorName || '系统操作员',
      nowIso.slice(0, 10),
      body.remarks || '出库',
      nowIso,
    ]);
    insertStmt.free();

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

    // 7. 返回 Store OutboundRow 全字段（用 transformRow）
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
      operateDate: nowIso.slice(0, 10),
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

/** 删除（不支持） */
router.delete('/:id', async (_req: Request, res: Response) => {
  res.status(405).json({ success: false, error: '库存交易记录不允许直接删除' });
});

export default router;
