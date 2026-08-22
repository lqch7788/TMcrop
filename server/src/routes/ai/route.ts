/**
 * AI-08 路径优化 REST 端点（V1 — 纯 JS VRP）
 * 2026-08-22：P1 重要 MVP
 *
 * POST /api/ai/route/optimize
 */

import { Router, Request, Response } from 'express';
import { optimizeRoute } from '../../services/ai/routeOptimizer';

const router = Router();

router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.worker_start || !input.tasks || !Array.isArray(input.tasks)) {
      return res.status(400).json({ success: false, error: 'worker_start + tasks[] 必填' });
    }
    if (input.tasks.length === 0) {
      return res.status(400).json({ success: false, error: 'tasks 不能为空' });
    }
    const result = await optimizeRoute(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '路径优化失败' });
  }
});

export default router;
