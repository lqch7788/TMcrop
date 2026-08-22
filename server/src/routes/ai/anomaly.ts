/**
 * AI-14 异常检测 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/anomaly/detect
 */

import { Router, Request, Response } from 'express';
import { detectAnomalies } from '../../services/ai/anomaly';

const router = Router();

router.post('/detect', async (req: Request, res: Response) => {
  try {
    const result = await detectAnomalies(req.body || {});
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '异常检测失败' });
  }
});

export default router;
