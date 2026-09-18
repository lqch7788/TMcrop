/**
 * 班组-作业区域关联路由（2026-09-15 Phase 2 - #1 区域结构化关联）
 */
import { Router, Request, Response } from 'express';
import { listTeamZones, addTeamZone, removeTeamZone } from '../services/teamZoneService';

const router = Router();

router.get('/:teamId/zones', async (req: Request, res: Response) => {
  try {
    const zones = await listTeamZones(req.params.teamId);
    res.json({ success: true, data: zones });
  } catch (error) {
    console.error('[team] GET /zones 失败:', error); // 2026-09-18 修复 C-7：服务端保留 stack，响应脱敏
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.post('/:teamId/zones', async (req: Request, res: Response) => {
  try {
    const { zoneId, role = 'allowed' } = req.body || {};
    if (!zoneId) return res.status(400).json({ success: false, error: 'zoneId 必填' });
    const result = await addTeamZone(req.params.teamId, zoneId, role);
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('[team] POST /zones 失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

router.delete('/:teamId/zones/:zoneId', async (req: Request, res: Response) => {
  try {
    const role = (req.query.role as string) || 'allowed';
    await removeTeamZone(req.params.teamId, req.params.zoneId, role);
    res.json({ success: true });
  } catch (error) {
    console.error('[team] DELETE /zones 失败:', error);
    res.status(500).json({ success: false, error: '操作失败' });
  }
});

export default router;
