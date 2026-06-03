/**
 * 库存管理控制器
 */

import { Request, Response } from 'express';
import { inventoryService } from '../services/inventory.service';
import { inventoryStockRepository } from '../repositories/inventory.repository';

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

  // ============================================
  // V3.0 新增端点
  // ============================================

  /**
   * POST /api/inventory/outbound
   * 出库操作
   */
  async outbound(req: Request, res: Response): Promise<void> {
    try {
      const result = await inventoryService.outbound(req.body);
      if (!result.success) {
        res.status(400).json({ success: false, error: result.error });
        return;
      }
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[InventoryController] outbound 错误:', error);
      res.status(500).json({ success: false, error: '出库失败' });
    }
  }

  /**
   * GET /api/inventory/available/:instanceId
   * 获取库存可用数量
   */
  async getAvailableQuantity(req: Request, res: Response): Promise<void> {
    try {
      const { instanceId } = req.params;
      const result = await inventoryService.getAvailableQuantity(instanceId);
      if (!result) {
        res.status(404).json({ success: false, error: '库存实例不存在' });
        return;
      }
      res.json({ success: true, data: result });
    } catch (error) {
      console.error('[InventoryController] getAvailableQuantity 错误:', error);
      res.status(500).json({ success: false, error: '查询失败' });
    }
  }

  /**
   * GET /api/inventory/by-business/:businessId
   * 根据业务ID获取库存
   */
  async getByBusinessId(req: Request, res: Response): Promise<void> {
    try {
      const { businessId } = req.params;
      const stock = await inventoryStockRepository.findByBusinessId(businessId);
      if (!stock) {
        res.status(404).json({ success: false, error: '库存不存在' });
        return;
      }
      res.json({ success: true, data: stock });
    } catch (error) {
      console.error('[InventoryController] getByBusinessId 错误:', error);
      res.status(500).json({ success: false, error: '查询失败' });
    }
  }

  /**
   * GET /api/inventory/stats
   * 库存统计
   */
  async getStats(req: Request, res: Response): Promise<void> {
    try {
      const { stockType } = req.query;
      const data = await inventoryService.getStats({
        stockType: stockType as string | undefined,
      });
      res.json({ success: true, data });
    } catch (error) {
      console.error('[InventoryController] getStats 错误:', error);
      res.status(500).json({ success: false, error: '获取统计失败' });
    }
  }

  /**
   * GET /api/inventory/trace/upstream/:instanceId
   * 上游追溯
   */
  async traceUpstream(req: Request, res: Response): Promise<void> {
    try {
      const { instanceId } = req.params;
      const maxDepth = Number(req.query.maxDepth) || 10;
      const data = await inventoryService.traceUpstream(instanceId, maxDepth);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[InventoryController] traceUpstream 错误:', error);
      res.status(500).json({ success: false, error: '上游追溯失败' });
    }
  }

  /**
   * GET /api/inventory/trace/downstream/:instanceId
   * 下游追溯
   */
  async traceDownstream(req: Request, res: Response): Promise<void> {
    try {
      const { instanceId } = req.params;
      const maxDepth = Number(req.query.maxDepth) || 10;
      const data = await inventoryService.traceDownstream(instanceId, maxDepth);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[InventoryController] traceDownstream 错误:', error);
      res.status(500).json({ success: false, error: '下游追溯失败' });
    }
  }

  /**
   * GET /api/inventory/aggregate/by-crop
   * 按作物名称聚合查询
   */
  async aggregateByCrop(req: Request, res: Response): Promise<void> {
    try {
      const { crop_name } = req.query;
      const data = await inventoryService.aggregateByCrop(crop_name as string | undefined);
      res.json({ success: true, data });
    } catch (error) {
      console.error('[InventoryController] aggregateByCrop 错误:', error);
      res.status(500).json({ success: false, error: '聚合查询失败' });
    }
  }
}

export const inventoryController = new InventoryController();
