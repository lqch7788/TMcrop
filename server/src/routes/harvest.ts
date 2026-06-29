/**
 * 采收记录只读路由（2026-06-29 精简）
 *
 * 采收入库独立页面已删除，仅保留 GET 接口供前端 3 处只读查询：
 * - useProductionChainStats（生产链统计）
 * - productionPlanService（生产计划关联）
 * - useApprovalBusinessDetail（审批详情）
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db';
import { authenticate } from '../middleware/auth';

const router = Router();
router.use(authenticate);

/** GET /api/harvest — 获取所有采收记录 */
router.get('/', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const rows = (db.prepare('SELECT * FROM harvest_records ORDER BY create_time DESC') as any).all();
    res.json(rows);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

/** GET /api/harvest/:id — 获取单条采收记录 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const row = db.prepare('SELECT * FROM harvest_records WHERE id = ?').get([req.params.id]);
    if (!row) return res.status(404).json({ success: false, error: '记录不存在' });
    res.json(row);
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
