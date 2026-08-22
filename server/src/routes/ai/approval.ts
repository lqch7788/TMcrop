/**
 * AI-03 智能审批辅助 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/approval/suggest
 */

import { Router, Request, Response } from 'express';
import { suggestApproval } from '../../services/ai/approval';

const router = Router();

router.post('/suggest', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.applicant_id || !input.approval_type) {
      return res.status(400).json({ success: false, error: 'applicant_id + approval_type 必填' });
    }
    const result = await suggestApproval(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '审批建议失败' });
  }
});

export default router;
