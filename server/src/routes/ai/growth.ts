/**
 * AI-04 作物生长预测 REST 端点（V1）
 * 2026-08-22：P0 核心 MVP（规则版 GDD baseline）
 *
 * POST /api/ai/growth/predict
 */

import { Router, Request, Response } from 'express';
import { predictGrowth } from '../../services/ai/growthPredictor';

const router = Router();

router.post('/predict', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.crop_type) {
      return res.status(400).json({ success: false, error: 'crop_type 必填' });
    }
    const result = await predictGrowth({
      crop_type: input.crop_type,
      batch_id: input.batch_id,
      greenhouse_id: input.greenhouse_id,
      plant_date: input.plant_date,
      expected_harvest_date: input.expected_harvest_date,
      base_temperature: input.base_temperature,
      variety: input.variety,
    });
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '生长预测失败' });
  }
});

export default router;
