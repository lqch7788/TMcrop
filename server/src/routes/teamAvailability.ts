/**
 * 班组可用性日历路由（2026-09-15 Phase 2 - #8 可用性日历）
 */
import { Router, Request, Response } from 'express';
import { getAvailability, refreshAvailability } from '../services/teamAvailabilityService';

const router = Router();

router.get('/:teamId/availability', async (req: Request, res: Response) => {
  try {
    const date = (req.query.date as string) || new Date().toISOString().slice(0, 10);
    const row = await getAvailability(req.params.teamId, date);
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('[team] availability 路由失败:', error); // 2026-09-18 修复 C-7
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.post('/:teamId/availability/refresh', async (req: Request, res: Response) => {
  try {
    const date = (req.body?.date as string) || new Date().toISOString().slice(0, 10);
    const row = await refreshAvailability(req.params.teamId, date);
    res.json({ success: true, data: row });
  } catch (error) {
    console.error('[team] availability 路由失败:', error); // 2026-09-18 修复 C-7
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
