/**
 * AI-10 作物生长状态识别 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/growth-state/identify
 */

import { Router, Request, Response } from 'express';
import { identifyGrowthState } from '../../services/ai/growthState';

const router = Router();

router.post('/identify', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.crop_type) {
      return res.status(400).json({ success: false, error: 'crop_type 必填' });
    }
    const result = await identifyGrowthState(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '生长状态识别失败' });
  }
});

export default router;
