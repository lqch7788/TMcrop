/**
 * 班组任务类型能力路由（2026-09-15 Phase 2 - #3 任务类型能力矩阵）
 */
import { Router, Request, Response } from 'express';
import { listTeamCapabilities, addTeamCapability, removeTeamCapability } from '../services/teamCapabilityService';

const router = Router();

router.get('/:teamId/capabilities', async (req: Request, res: Response) => {
  try {
    const caps = await listTeamCapabilities(req.params.teamId);
    res.json({ success: true, data: caps });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.post('/:teamId/capabilities', async (req: Request, res: Response) => {
  try {
    const { taskType } = req.body || {};
    if (!taskType) return res.status(400).json({ success: false, error: 'taskType 必填' });
    const result = await addTeamCapability(req.params.teamId, taskType);
    res.json({ success: true, data: result });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

router.delete('/:teamId/capabilities/:taskType', async (req: Request, res: Response) => {
  try {
    await removeTeamCapability(req.params.teamId, req.params.taskType);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ success: false, error: (error as Error).message });
  }
});

export default router;
