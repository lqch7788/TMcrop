/**
 * 班组成员变动历史路由（2026-09-15 Phase 2 - #7 人员变动历史）
 */
import { Router, Request, Response } from 'express';
import { listTeamChanges } from '../services/teamMemberChangeService';

const router = Router();

router.get('/:teamId/member-changes', async (req: Request, res: Response) => {
  try {
    const limit = Number(req.query.limit) || 50;
    const list = await listTeamChanges(req.params.teamId, limit);
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
