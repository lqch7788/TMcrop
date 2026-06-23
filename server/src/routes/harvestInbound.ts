/**
 * 采收入库路由 (V13.0)
 * GET    /api/harvest-inbounds               - 列表（分页+筛选）
 * GET    /api/harvest-inbounds/:id           - 详情
 * POST   /api/harvest-inbounds               - 创建
 * PUT    /api/harvest-inbounds/:id           - 编辑
 * DELETE /api/harvest-inbounds/:id           - 软删除
 * POST   /api/harvest-inbounds/batch-delete  - 批量软删除
 * POST   /api/harvest-inbounds/:id/approve   - 审批通过
 * POST   /api/harvest-inbounds/:id/reject    - 审批拒绝
 * GET    /api/harvest-inbounds/stats         - 统计
 * GET    /api/harvest-inbounds/export        - 导出
 * GET    /api/harvest-inbounds/generate-code - 生成入库编码
 * GET    /api/harvest-inbounds/pending-count - 待审批计数
 */
import { Router, Request, Response } from 'express';
import {
  getHarvestInbounds,
  getHarvestInboundById,
  createHarvestInbound,
  updateHarvestInbound,
  deleteHarvestInbound,
  batchDeleteHarvestInbounds,
  approveHarvestInbound,
  rejectHarvestInbound,
  getHarvestInboundStats,
  exportHarvestInbounds,
  generateInboundCode,
  getPendingCount,
} from '../services/harvestInboundService';

const router = Router();

// 特殊路由（必须放在 /:id 之前）
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const code = generateInboundCode();
    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('生成入库编码失败:', error);
    res.status(500).json({ success: false, error: '生成入库编码失败' });
  }
});

router.get('/pending-count', (req: Request, res: Response) => {
  try {
    const count = getPendingCount();
    res.json({ success: true, data: { count } });
  } catch (error) {
    console.error('获取待审批计数失败:', error);
    res.status(500).json({ success: false, error: '获取待审批计数失败' });
  }
});

router.get('/stats', (req: Request, res: Response) => {
  try {
    const stats = getHarvestInboundStats();
    res.json({ success: true, data: stats });
  } catch (error) {
    console.error('获取统计失败:', error);
    res.status(500).json({ success: false, error: '获取统计失败' });
  }
});

router.get('/export', (req: Request, res: Response) => {
  try {
    const { sourceType, status, cropName, warehouseId, inboundDateStart, inboundDateEnd, search } = req.query;
    const data = exportHarvestInbounds({
      sourceType: sourceType as string,
      status: status as string,
      cropName: cropName as string,
      warehouseId: warehouseId as string,
      inboundDateStart: inboundDateStart as string,
      inboundDateEnd: inboundDateEnd as string,
      search: search as string,
    });
    res.json({ success: true, data });
  } catch (error) {
    console.error('导出失败:', error);
    res.status(500).json({ success: false, error: '导出失败' });
  }
});

router.post('/batch-delete', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!ids || !Array.isArray(ids) || ids.length === 0) {
      return res.status(400).json({ success: false, error: 'ids 参数必填且为非空数组' });
    }
    const result = batchDeleteHarvestInbounds(ids);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('批量删除失败:', error);
    res.status(500).json({ success: false, error: '批量删除失败' });
  }
});

// CRUD 路由
router.get('/', (req: Request, res: Response) => {
  try {
    const { sourceType, status, cropName, warehouseId, inboundDateStart, inboundDateEnd, search, page, limit } = req.query;
    const result = getHarvestInbounds({
      sourceType: sourceType as string,
      status: status as string,
      cropName: cropName as string,
      warehouseId: warehouseId as string,
      inboundDateStart: inboundDateStart as string,
      inboundDateEnd: inboundDateEnd as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({
      success: true,
      data: result.data,
      meta: { total: result.total, page: Number(page) || 1, limit: Number(limit) || 50 },
    });
  } catch (error) {
    console.error('获取采收入库列表失败:', error);
    res.status(500).json({ success: false, error: '获取采收入库列表失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const record = getHarvestInboundById(req.params.id);
    if (!record) return res.status(404).json({ success: false, error: '入库记录不存在' });
    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取采收入库详情失败:', error);
    res.status(500).json({ success: false, error: '获取采收入库详情失败' });
  }
});

router.post('/', (req: Request, res: Response) => {
  try {
    const saved = createHarvestInbound(req.body);
    res.status(201).json({ success: true, data: saved });
  } catch (error) {
    console.error('创建采收入库失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

router.put('/:id', (req: Request, res: Response) => {
  try {
    const saved = updateHarvestInbound(req.params.id, req.body);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('更新采收入库失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

router.delete('/:id', (req: Request, res: Response) => {
  try {
    deleteHarvestInbound(req.params.id);
    res.json({ success: true, data: { id: req.params.id, deleted: true } });
  } catch (error) {
    console.error('删除采收入库失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

// 审批路由
router.post('/:id/approve', (req: Request, res: Response) => {
  try {
    const { auditorId, auditorName, opinion } = req.body;
    if (!auditorId || !auditorName) {
      return res.status(400).json({ success: false, error: '审批人信息必填' });
    }
    const saved = approveHarvestInbound(req.params.id, auditorId, auditorName, opinion);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('审批失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { auditorId, auditorName, opinion } = req.body;
    if (!auditorId || !auditorName) {
      return res.status(400).json({ success: false, error: '审批人信息必填' });
    }
    const saved = rejectHarvestInbound(req.params.id, auditorId, auditorName, opinion);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('拒绝失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

export default router;
