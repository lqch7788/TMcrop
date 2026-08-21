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

      // 写入 material_flow_log（入库无上游，target = inventory_stock）
      try {
        const { writeFlowLog } = require('../services/flowLogService');
        const { mapInventorySourceToCategory } = require('../lib/sourceCategoryMapper');
        const body = req.body || {} as any;
        writeFlowLog({
          flow_type: 'harvest→inventory',
          crop_name: body.crop_name || body.cropName || '',
          crop_variety: body.crop_variety || body.cropVariety || body.variety || '',
          source_type: null,
          source_id: null,
          source_code: null,
          source_quantity: null,
          source_category: mapInventorySourceToCategory(body.source_type || body.sourceType),
          target_type: 'inventory_stock',
          target_id: result.instanceId || '',
          // 2026-08-21 修复 B：target_code 用 instanceId（IPR-xxx）而非 business_code（HS-xxx），
          // 让用户在「批次追溯」tab 输入库存实例编码能直接命中该条流水
          target_code: result.instanceId || body.business_code || body.businessCode || '',
          target_quantity: body.quantity || 0,
          target_unit: body.unit || '',
          business_code: body.business_code || body.businessCode || '',
          created_by: body.create_by || body.createBy || '',
        });
      } catch (e: any) {
        console.error('[inventory.controller] writeFlowLog 失败:', e?.message || e);
        // 2026-08-21 修复 A：流水写入失败不能让前端误以为入库成功，
        // 返回 500 + warning，前端可提示「库存已入但追溯流水缺失」并触发补录
        res.status(500).json({
          success: false,
          error: '库存入库成功，但流转追溯流水写入失败，请联系管理员补录追溯链',
          data: {
            instanceId: result.instanceId,
            transactionId: result.transactionId,
            currentQuantity: result.currentQuantity,
            availableQuantity: result.availableQuantity,
          },
          warning: 'FLOW_LOG_WRITE_FAILED',
        });
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
      // T10 修复：req.query 是 snake_case（camelCaseRequestMiddleware 只转换 req.body），
      // 此前只解构 stock_type / warehouse_id / crop_name / page / limit，
      // 导致 status / source_type 过滤器被静默丢弃（前端筛选器失效的 P0 bug）。
      const {
        stock_type,
        warehouse_id,
        crop_name,
        status,
        source_type,
        page = 1,
        limit = 50,
      } = req.query;

      const result = await inventoryService.getList({
        stockType: stock_type as string,
        warehouseId: warehouse_id as string,
        cropName: crop_name as string,
        status: status as string,
        sourceType: source_type as string,
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
  // 注：2026-06-04 V2.1 铁律改造后，POST /api/inventory/outbound 端点已迁移到
  //      /api/inventory-transactions 路由（routes/inventoryTransactions.ts）。
  //      本控制器不再包含出库方法。

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
      // 2026-07-16：maxDepth 硬上限 20（service 层会再次兜底），防止 maxDepth=999/Infinity DoS
      const rawDepth = Number(req.query.maxDepth);
      const maxDepth = Number.isFinite(rawDepth) && rawDepth > 0
        ? Math.min(20, Math.floor(rawDepth))
        : 10;
      const data = await inventoryService.traceUpstream(instanceId, maxDepth);
      // 2026-07-16：追溯审计（成功也记录），用于"谁查询了哪个批次"
      console.log(`[audit] trace/upstream instance=${instanceId} depth=${maxDepth} returned=${data.length} by user=${req.user?.userId ?? 'anon'}`);
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
      // 2026-07-16：maxDepth 硬上限 20（service 层会再次兜底），防止 maxDepth=999/Infinity DoS
      const rawDepth = Number(req.query.maxDepth);
      const maxDepth = Number.isFinite(rawDepth) && rawDepth > 0
        ? Math.min(20, Math.floor(rawDepth))
        : 10;
      const data = await inventoryService.traceDownstream(instanceId, maxDepth);
      // 2026-07-16：追溯审计
      console.log(`[audit] trace/downstream instance=${instanceId} depth=${maxDepth} returned=${data.length} by user=${req.user?.userId ?? 'anon'}`);
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
