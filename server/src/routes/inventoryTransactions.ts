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

const router = Router();

/** 老表 → 前端 OutboundRow 字段映射（与 inventoryTransactionRepository.OutboundRow 保持一致） */
function transformRow(row: any): Record<string, unknown> {
  return {
    id: row.id,
    instanceId: row.instanceId,
    stockType: row.stockType,
    transactionType: row.transactionType,
    quantity: row.quantity,
    quantityOut: row.quantityOut ?? Math.abs(Number(row.quantity) || 0),
    balanceBefore: row.balanceBefore,
    balanceAfter: row.balanceAfter,
    businessId: row.businessId,
    businessType: row.businessType,
    businessCode: row.businessCode,
    operatorId: row.operatorId,
    operatorName: row.operatorName,
    operateDate: row.operateDate,
    remarks: row.remarks,
    createTime: row.createTime,
    cropName: row.cropName,
    varietyName: row.varietyName,
    cropCode: row.cropCode,
    unit: row.unit,
    warehouseName: row.warehouseName,
    plantingMode: row.plantingMode,
    grade: row.grade,
    greenhouseName: row.greenhouseName,
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

/** 创建（写老表——由 inventoryService.outbound 统一负责扣减库存 + 写记录的双向一致） */
router.post('/', async (req: Request, res: Response) => {
  try {
    // 老 inventoryService.outbound 已经写 inventory_transaction 表（含 balance_before/after）
    // 本路由只是接口占位，避免直接调用老 service 路径不一致
    // 实际出库业务请走 POST /api/inventory/outbound
    res.status(501).json({
      success: false,
      error: '出库创建请用 POST /api/inventory/outbound，本接口仅供查询',
    });
  } catch (error) {
    res.status(500).json({ success: false, error: String(error) });
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
