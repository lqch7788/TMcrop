/**
 * AI-11 智能语音录入 REST 端点
 * 2026-08-22：P2 MVP
 *
 * POST /api/ai/voice/transcribe
 */

import { Router, Request, Response } from 'express';
import { transcribeVoice } from '../../services/ai/voice';

const router = Router();

router.post('/transcribe', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};
    if (!input.transcribed_text) {
      return res.status(400).json({ success: false, error: 'transcribed_text 必填（mock ASR）' });
    }
    const result = await transcribeVoice(input);
    res.json({ success: true, data: result });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message || '语音转写失败' });
  }
});

export default router;
