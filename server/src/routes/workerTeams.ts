/**
 * 工人-班组兼职路由（2026-09-15 Phase 2 - #10 跨班组成员共享）
 */
import { Router, Request, Response } from 'express';
import { listWorkerTeams, addWorkerTeam, removeWorkerTeam } from '../services/workerTeamAssignmentService';

const router = Router();

router.get('/:workerId/teams', async (req: Request, res: Response) => {
  try {
    const list = await listWorkerTeams(req.params.workerId);
    res.json({ success: true, data: list });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:workerId/teams', async (req: Request, res: Response) => {
  try {
    const { teamId, role = 'member', percentage = 100, isPrimary = false } = req.body || {};
    if (!teamId) return res.status(400).json({ success: false, error: 'teamId 必填' });
    const result = await addWorkerTeam(req.params.workerId, teamId, role, percentage, isPrimary);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/:workerId/teams/:teamId', async (req: Request, res: Response) => {
  try {
    await removeWorkerTeam(req.params.workerId, req.params.teamId);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
