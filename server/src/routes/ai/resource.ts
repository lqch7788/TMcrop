/**
 * AI-07 资源优化配置 REST 端点
 * 2026-08-22：P1 MVP
 *
 * POST /api/ai/resource/optimize
 */

import { Router, Request, Response } from 'express';
import { optimizeResources } from '../../services/ai/resourceOptimizer';

const router = Router();

router.post('/optimize', async (req: Request, res: Response) => {
  try {
    const result = await optimizeResources(req.body || {});
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '资源优化失败' });
  }
});

export default router;
