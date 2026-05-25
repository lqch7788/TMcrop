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
    const { workerId, role = 'member', operatorId, operatorName } = req.body;

    if (!workerId) {
      return res.status(400).json({ success: false, error: 'workerId不能为空' });
    }

    const member = await teamMemberService.addTeamMember(teamId, workerId, role);
    res.json({ success: true, data: member });
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
    const { workerIds, operatorId, operatorName } = req.body;

    if (!workerIds || !Array.isArray(workerIds)) {
      return res.status(400).json({ success: false, error: 'workerIds必须为数组' });
    }
    if (workerIds.length === 0) {
      return res.status(400).json({ success: false, error: 'workerIds不能为空数组' });
    }

    const members = await teamMemberService.addTeamMembers(teamId, workerIds, operatorId, operatorName);
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
    const { operatorId, operatorName } = req.query;
    await teamMemberService.removeTeamMember(teamId, workerId);
    // TODO: 后续可添加审计日志，记录 operatorId/operatorName
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
