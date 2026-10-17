/**
 * 作物管理通用回收站 API
 *
 * GET    /api/recycle-bin               列表
 * GET    /api/recycle-bin/stats         各类型待恢复数量
 * GET    /api/recycle-bin/:id           详情
 * POST   /api/recycle-bin/:id/restore   恢复（管理员/主管）
 * DELETE /api/recycle-bin/:id           彻底删除（仅管理员）
 */
import { Router, Request, Response } from 'express';
import { asyncHandler } from '../middleware/errorHandler';
import { getDatabase } from '../db';
import {
  getRecycleItem,
  getRecycleStats,
  listRecycleItems,
  purgeRecycleItem,
  restoreRecycleItem,
} from '../services/recycleBin.service';

const router = Router();

/** 读取用户角色（JWT role 优先，缺失时查 user_roles 兜底） */
function getUserRoles(req: Request): string[] {
  const fromToken = String((req as any).user?.role || '').toLowerCase();
  const roles = new Set<string>();
  if (fromToken) roles.add(fromToken);
  const userId = (req as any).user?.userId;
  if (userId) {
    try {
      const db = getDatabase();
      const rows = db.exec(
        `SELECT r.role_code FROM user_roles ur
         JOIN roles r ON r.oid = ur.role_oid
         JOIN users u ON u.oid = ur.user_oid
         WHERE u.id = ?`,
        [userId],
      );
      for (const row of rows[0]?.values || []) roles.add(String(row[0]).toLowerCase());
    } catch {
      // 角色表不可用时按 token 角色处理
    }
  }
  return [...roles];
}

function canRestore(req: Request): boolean {
  return getUserRoles(req).some((r) => r === 'admin' || r === 'manager' || r === 'super_admin');
}

function canPurge(req: Request): boolean {
  return getUserRoles(req).some((r) => r === 'admin' || r === 'super_admin');
}

/** GET / — 列表 */
router.get('/', (req: Request, res: Response) => {
  try {
    const result = listRecycleItems({
      entityType: req.query.entityType ? String(req.query.entityType) : undefined,
      status: req.query.status ? String(req.query.status) : undefined,
      keyword: req.query.keyword ? String(req.query.keyword) : undefined,
      startDate: req.query.startDate ? String(req.query.startDate) : undefined,
      endDate: req.query.endDate ? String(req.query.endDate) : undefined,
      page: Number(req.query.page) || 1,
      pageSize: Number(req.query.pageSize) || 20,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || '查询回收站失败' });
  }
});

/** GET /stats — 统计 */
router.get('/stats', (_req: Request, res: Response) => {
  try {
    res.json({ success: true, data: getRecycleStats() });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || '统计回收站失败' });
  }
});

/** GET /:id — 详情 */
router.get('/:id', (req: Request, res: Response) => {
  try {
    const item = getRecycleItem(String(req.params.id));
    if (!item) return res.status(404).json({ success: false, error: '回收站记录不存在' });
    res.json({ success: true, data: item });
  } catch (error: any) {
    res.status(500).json({ success: false, error: error?.message || '查询回收站详情失败' });
  }
});

/** POST /:id/restore — 恢复 */
router.post('/:id/restore', asyncHandler(async (req: Request, res: Response) => {
  if (!canRestore(req)) {
    return res.status(403).json({ success: false, error: '仅管理员/主管可执行恢复操作' });
  }
  try {
    const result = await restoreRecycleItem(String(req.params.id), {
      name: (req as any).user?.name,
      id: (req as any).user?.userId,
      role: (req as any).user?.role,
    });
    res.json({ success: true, data: result });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || '恢复失败' });
  }
}));

/** DELETE /:id — 彻底删除（仅管理员） */
router.delete('/:id', (req: Request, res: Response) => {
  if (!canPurge(req)) {
    return res.status(403).json({ success: false, error: '仅管理员可彻底删除回收站记录' });
  }
  try {
    purgeRecycleItem(String(req.params.id), {
      name: (req as any).user?.name,
      id: (req as any).user?.userId,
      role: (req as any).user?.role,
    });
    res.json({ success: true, data: { id: req.params.id } });
  } catch (error: any) {
    res.status(400).json({ success: false, error: error?.message || '彻底删除失败' });
  }
});

export default router;
