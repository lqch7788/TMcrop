/**
 * AI-09 病虫害图像识别 REST 端点（V1 — Mock 演示）
 * 2026-08-22：P1 MVP
 *
 * POST /api/ai/image/identify
 */

import { Router, Request, Response } from 'express';
import { identifyPestImage } from '../../services/ai/imageId';

const router = Router();

router.post('/identify', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.image_id) {
      return res.status(400).json({ success: false, error: 'image_id 必填' });
    }
    const result = await identifyPestImage(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '图像识别失败' });
  }
});

export default router;
