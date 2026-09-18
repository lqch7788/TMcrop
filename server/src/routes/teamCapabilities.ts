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
    console.error('[team] capability 路由失败:', error); // 2026-09-18 修复 C-7
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.post('/:teamId/capabilities', async (req: Request, res: Response) => {
  try {
    const { taskType } = req.body || {};
    if (!taskType) return res.status(400).json({ success: false, error: 'taskType 必填' });
    const result = await addTeamCapability(req.params.teamId, taskType);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[team] capability 路由失败:', error); // 2026-09-18 修复 C-7
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.delete('/:teamId/capabilities/:taskType', async (req: Request, res: Response) => {
  try {
    await removeTeamCapability(req.params.teamId, req.params.taskType);
    res.json({ success: true });
  } catch (error) {
    console.error('[team] capability 路由失败:', error); // 2026-09-18 修复 C-7
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
