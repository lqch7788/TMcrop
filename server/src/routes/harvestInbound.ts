/**
 * 采收入库审批路由 (V13.0)
 * GET    /api/harvest-inbounds          - 列表（分页+筛选）
 * GET    /api/harvest-inbounds/:id      - 详情
 * POST   /api/harvest-inbounds          - 创建
 * PUT    /api/harvest-inbounds/:id      - 更新
 * DELETE /api/harvest-inbounds/:id      - 软删除
 * POST   /api/harvest-inbounds/:id/approve - 审批通过
 * POST   /api/harvest-inbounds/:id/reject  - 审批拒绝
 * GET    /api/harvest-inbounds/generate-code - 生成入库编码
 */
import { Router, Request, Response } from 'express';
import {
  getHarvestInbounds,
  getHarvestInboundById,
  createHarvestInbound,
  updateHarvestInbound,
  deleteHarvestInbound,
  approveHarvestInbound,
  rejectHarvestInbound,
  generateInboundCode,
} from '../services/harvestInboundService';

const router = Router();

// 生成入库编码（必须放在 /:id 之前）
router.get('/generate-code', (req: Request, res: Response) => {
  try {
    const stockType = (req.query.stockType as string) || 'product';
    if (!['seed', 'seedling', 'product'].includes(stockType)) {
      return res.status(400).json({ success: false, error: '无效的 stockType' });
    }
    const code = generateInboundCode(stockType);
    res.json({ success: true, data: { code } });
  } catch (error) {
    console.error('生成入库编码失败:', error);
    res.status(500).json({ success: false, error: '生成入库编码失败' });
  }
});

// 列表
router.get('/', (req: Request, res: Response) => {
  try {
    const { stockType, status, cropName, sourceModule, search, page, limit } = req.query;
    const result = getHarvestInbounds({
      stockType: stockType as string,
      status: status as string,
      cropName: cropName as string,
      sourceModule: sourceModule as string,
      search: search as string,
      page: page ? Number(page) : undefined,
      limit: limit ? Number(limit) : undefined,
    });
    res.json({ success: true, data: result.data, meta: { total: result.total, page: Number(page) || 1, limit: Number(limit) || 50 } });
  } catch (error) {
    console.error('获取采收入库列表失败:', error);
    res.status(500).json({ success: false, error: '获取采收入库列表失败' });
  }
});

// 详情
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

// 创建
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

// 更新
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

// 软删除
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

// 审批通过
router.post('/:id/approve', (req: Request, res: Response) => {
  try {
    const { auditor, opinion } = req.body;
    if (!auditor) return res.status(400).json({ success: false, error: '审批人必填' });
    const saved = approveHarvestInbound(req.params.id, auditor, opinion);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('审批采收入库失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

// 审批拒绝
router.post('/:id/reject', (req: Request, res: Response) => {
  try {
    const { auditor, opinion } = req.body;
    if (!auditor) return res.status(400).json({ success: false, error: '审批人必填' });
    const saved = rejectHarvestInbound(req.params.id, auditor, opinion);
    res.json({ success: true, data: saved });
  } catch (error) {
    console.error('拒绝采收入库失败:', error);
    const msg = error instanceof Error ? error.message : String(error);
    res.status(400).json({ success: false, error: msg });
  }
});

export default router;
