/**
 * 库存管理控制器
 */

import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';

export class InventoryController {
  /**
   * POST /api/inventory/inbound
   * 采收入库
   */
  async inbound(req: Request, res: Response): Promise<void> {
    try {
      const result = await inventoryService.inbound(req.body);

      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }

      res.json({
        success: true,
        data: {
          instanceId: result.instanceId,
          transactionId: result.transactionId,
          currentQuantity: result.currentQuantity,
          availableQuantity: result.availableQuantity,
        }
      });
    } catch (error) {
      console.error('[InventoryController] inbound 错误:', error);
      res.status(500).json({
        success: false,
        error: error instanceof Error ? error.message : '入库失败'
      });
    }
  }

  /**
   * GET /api/inventory
   * 获取库存列表
   */
  async getList(req: Request, res: Response): Promise<void> {
    try {
      const { stock_type, warehouse_id, crop_name, page = 1, limit = 50 } = req.query;

      const result = await inventoryService.getList({
        stockType: stock_type as string,
        warehouseId: warehouse_id as string,
        cropName: crop_name as string,
        page: Number(page),
        limit: Number(limit),
      });

      res.json({
        success: true,
        data: result.data,
        meta: {
          total: result.total,
          page: Number(page),
          limit: Number(limit),
        }
      });
    } catch (error) {
      console.error('[InventoryController] getList 错误:', error);
      res.status(500).json({ success: false, error: '获取库存列表失败' });
    }
  }

  /**
   * GET /api/inventory/:instanceId
   * 获取库存详情
   */
  async getDetail(req: Request, res: Response): Promise<void> {
    try {
      const { instanceId } = req.params;
      const result = await inventoryService.getDetail(instanceId);

      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[InventoryController] getDetail 错误:', error);
      res.status(500).json({ success: false, error: '获取库存详情失败' });
    }
  }

  /**
   * GET /api/inventory/transaction/:instanceId
   * 获取库存流水
   */
  async getTransactions(req: Request, res: Response): Promise<void> {
    try {
      const { instanceId } = req.params;
      const result = await inventoryService.getDetail(instanceId);

      res.json({ success: true, data: result.transactions });
    } catch (error) {
      console.error('[InventoryController] getTransactions 错误:', error);
      res.status(500).json({ success: false, error: '获取库存流水失败' });
    }
  }
}

export const inventoryController = new InventoryController();
