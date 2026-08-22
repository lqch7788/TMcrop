/**
 * AI-05 病虫害预警 REST 端点
 * 2026-08-22：P0 核心 MVP
 *
 * POST /api/ai/pest/alert
 */

import { Router, Request, Response } from 'express';
import { predictPestAlert } from '../../services/ai/pestAlert';

const router = Router();

router.post('/alert', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.crop_type) {
      return res.status(400).json({ success: false, error: 'crop_type 必填' });
    }
    const result = await predictPestAlert(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '预警失败' });
  }
});

export default router;
