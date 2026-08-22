/**
 * AI-12 智能问答 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/qa/ask
 */

import { Router, Request, Response } from 'express';
import { answerQuestion } from '../../services/ai/qaAssistant';

const router = Router();

router.post('/ask', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.question) {
      return res.status(400).json({ success: false, error: 'question 必填' });
    }
    const result = await answerQuestion(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '问答失败' });
  }
});

export default router;
