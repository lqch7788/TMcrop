/**
 * AI-15 出勤异常检测 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/attendance/detect
 */

import { Router, Request, Response } from 'express';
import { detectAttendanceAnomalies } from '../../services/ai/attendance';

const router = Router();

router.post('/detect', async (req: Request, res: Response) => {
  try {
    const result = await detectAttendanceAnomalies(req.body || {});
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '出勤异常检测失败' });
  }
});

export default router;
