/**
 * AI-02 智能人员排班 REST 端点
 * 2026-08-22：P1 MVP
 *
 * POST /api/ai/schedule/generate
 */

import { Router, Request, Response } from 'express';
import { generateSchedule } from '../../services/ai/scheduler';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.employees || !Array.isArray(input.employees)) {
      return res.status(400).json({ success: false, error: 'employees[] 必填' });
    }
    const result = await generateSchedule(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '排班失败' });
  }
});

export default router;
