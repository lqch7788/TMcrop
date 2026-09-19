/**
 * 班组成员路由
 *
 * 提供班组成员的增删改查API
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as teamMemberService from '../services/teamMemberService';

// 认证中间件
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, next);
};

const router = Router();

/**
 * 获取班组成员
 * GET /api/teams/:teamId/members
 */
router.get('/teams/:teamId/members', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const members = await teamMemberService.getTeamMembers(teamId);
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('获取班组成员失败:', error);
    res.status(500).json({ success: false, error: '获取班组成员失败' });
  }
});

/**
 * 添加成员
 * POST /api/teams/:teamId/members
 */
router.post('/teams/:teamId/members', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    // 2026-09-15：role 接受扩展枚举（leader/deputy/safety/quality/member）；写日志 + 写主职兼职关联
    const {
      workerId,
      role = 'member',
      isPrimary = true,
      percentage = 100,
      operatorId,
      operatorName,
      reason,
    } = req.body;

    if (!workerId) {
      return res.status(400).json({ success: false, error: 'workerId不能为空' });
    }

    const result = await teamMemberService.addTeamMemberWithLog(
      teamId, workerId, role,
      { isPrimary, percentage, operatorId, operatorName, reason },
    );
    res.json({ success: true, data: result });
  } catch (error) {
    console.error('添加成员失败:', error);
    res.status(500).json({ success: false, error: '添加成员失败' });
  }
});

/**
 * 批量添加成员
 * POST /api/teams/:teamId/members/batch
 */
router.post('/teams/:teamId/members/batch', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const { workerIds, role = 'member', workerRoles, operatorId, operatorName } = req.body;

    if (!workerIds || !Array.isArray(workerIds)) {
      return res.status(400).json({ success: false, error: 'workerIds必须为数组' });
    }
    if (workerIds.length === 0) {
      return res.status(400).json({ success: false, error: 'workerIds不能为空数组' });
    }

    // 2026-09-18：审计 C-1（审计日志伪造）+ workerRoles（每工人独立角色）接入
    // 优先用 JWT 注入的用户身份（authenticate 中间件已写入 req.user）
    const jwtUser = (req as any).user;
    const finalOperatorId = jwtUser?.userId ?? jwtUser?.oid ?? operatorId ?? '';
    // 2026-09-19 修复：JwtPayload 的字段是 name（不是 realName/username），
    // 原写法恒为 undefined，审计日志的操作人永远落到请求体或空字符串
    const finalOperatorName = jwtUser?.name ?? operatorName ?? '';

    // 2026-09-18：审计 C-9 —— 支持每工人独立角色
    //   - 传 workerRoles（Record<workerId, role>）→ 用每个工人的角色
    //   - 不传 → 全部用同一 role（向后兼容）
    const perWorkerRole: Record<string, string> | null =
      workerRoles && typeof workerRoles === 'object'
        ? workerRoles
        : null;

    const members = await teamMemberService.addTeamMembersWithLog(
      teamId, workerIds, role, { operatorId: finalOperatorId, operatorName: finalOperatorName },
      perWorkerRole,
    );
    res.json({ success: true, data: members });
  } catch (error) {
    console.error('批量添加成员失败:', error);
    res.status(500).json({ success: false, error: '批量添加成员失败' });
  }
});

/**
 * 移除成员
 * DELETE /api/teams/:teamId/members/:workerId
 */
router.delete('/teams/:teamId/members/:workerId', requireAuth, async (req, res) => {
  try {
    const { teamId, workerId } = req.params;
    const { operatorId, operatorName, reason } = req.query;
    // 2026-09-15：移除成员同时写变更日志 + 软删除 team_members + 关闭主职兼职关联
    await teamMemberService.removeTeamMemberWithLog(
      teamId, workerId,
      { operatorId: operatorId as string, operatorName: operatorName as string, reason: reason as string },
    );
    res.json({ success: true });
  } catch (error) {
    console.error('移除成员失败:', error);
    res.status(500).json({ success: false, error: '移除成员失败' });
  }
});

/**
 * 获取班组技能标签
 * GET /api/teams/:teamId/skill-tags
 */
router.get('/teams/:teamId/skill-tags', requireAuth, async (req, res) => {
  try {
    const { teamId } = req.params;
    const tags = await teamMemberService.getTeamSkillTags(teamId);
    res.json({ success: true, data: tags });
  } catch (error) {
    console.error('获取技能标签失败:', error);
    res.status(500).json({ success: false, error: '获取技能标签失败' });
  }
});

export default router;
