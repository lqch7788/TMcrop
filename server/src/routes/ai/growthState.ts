/**
 * AI-10 作物生长状态识别 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/growth-state/identify
 */

import { Router, Request, Response } from 'express';
import { identifyGrowthState } from '../../services/ai/growthState';
import { sendAiError } from './_shared';

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
    // 2026-09-19：改用统一映射 —— 缺参数/数据不足回 4xx，真故障才 500
    sendAiError(res, e, '生长状态识别失败');
  }
});

export default router;
