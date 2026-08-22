/**
 * AI-13 智能报告生成 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/report/generate
 */

import { Router, Request, Response } from 'express';
import { generateReport } from '../../services/ai/reportGenerator';

const router = Router();

router.post('/generate', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.report_type) {
      return res.status(400).json({ success: false, error: 'report_type 必填（daily/weekly/monthly/custom）' });
    }
    const result = await generateReport(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '报告生成失败' });
  }
});

export default router;
