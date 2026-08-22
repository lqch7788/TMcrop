/**
 * AI-01 派工推荐 REST 端点
 * 2026-08-22：P0 核心 MVP
 *
 * POST /api/ai/dispatch/recommend
 * 输入：任务信息 → 输出：推荐员工列表（按 match_score 降序）
 */

import { Router, Request, Response } from 'express';
import { recommendDispatch } from '../../services/ai/dispatchRecommender';

const router = Router();

router.post('/recommend', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};

    if (!input.task_type) {
      return res.status(400).json({ success: false, error: 'task_type 必填' });
    }

    const recommendations = await recommendDispatch({
      task_type: input.task_type,
      required_skills: input.required_skills,
      greenhouse_id: input.greenhouse_id,
      priority: input.priority,
      batch_id: input.batch_id,
      estimated_hours: input.estimated_hours,
      due_date: input.due_date,
      team_ids: input.team_ids,
    });

    res.json({
      success: true,
      data: {
        recommendations,
        algorithm_version: '1.0.0-7factor',
        total_candidates: recommendations.length,
      },
    });
  } catch (e: any) {
    console.error('[ai/dispatch/recommend]', e);
    res.status(500).json({ success: false, error: e.message || '派工推荐失败' });
  }
});

export default router;
