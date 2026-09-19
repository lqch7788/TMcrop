/**
 * AI-05 病虫害预警 REST 端点
 * 2026-08-22：P0 核心 MVP
 *
 * POST /api/ai/pest/alert
 */

import { Router, Request, Response } from 'express';
import { predictPestAlert } from '../../services/ai/pestAlert';
import { sendAiError } from './_shared';

const router = Router();

router.post('/alert', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.crop_type) {
      return res.status(400).json({ success: false, error: 'crop_type 必填' });
    }
    if (!input.greenhouse_id) {
      return res.status(400).json({ success: false, error: 'greenhouse_id 必填（按温室查询 IoT 传感器数据）' });
    }
    const result = await predictPestAlert(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    // 2026-09-19：改用统一映射 —— 缺参数/数据不足回 4xx，真故障才 500
    sendAiError(res, e, '预警失败');
  }
});

export default router;
