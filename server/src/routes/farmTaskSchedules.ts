/**
 * 农事任务排班路由
 * 提供排班相关的 RESTful API 接口
 */

import { Router, Request, Response, NextFunction } from 'express';
import { authenticate } from '../middleware/auth';
import * as farmTaskScheduleService from '../services/farmTaskScheduleService';

// 认证中间件
const requireAuth = (req: Request, res: Response, next: NextFunction) => {
  authenticate(req, res, next);
};

const router = Router();

/**
 * 获取排班列表
 * GET /list?date=xxx&workerId=xxx&teamId=xxx&status=xxx
 */
router.get('/list', requireAuth, async (req, res) => {
  try {
    const { date, workerId, teamId, status } = req.query;
    const schedules = await farmTaskScheduleService.getSchedules({
      date: date as string,
      workerId: workerId as string,
      teamId: teamId as string,
      status: status as string,
    });
    res.json({ success: true, data: schedules });
  } catch (error) {
    console.error('获取排班列表失败:', error);
    res.status(500).json({ success: false, error: '获取排班列表失败' });
  }
});

/**
 * 获取待排班任务
 * GET /unscheduled
 */
router.get('/unscheduled', requireAuth, async (req, res) => {
  try {
    const tasks = await farmTaskScheduleService.getUnscheduledTasks();
    res.json({ success: true, data: tasks });
  } catch (error) {
    console.error('获取待排班任务失败:', error);
    res.status(500).json({ success: false, error: '获取待排班任务失败' });
  }
});

/**
 * 获取单个排班详情
 * GET /:id
 */
router.get('/:id', requireAuth, async (req, res) => {
  try {
    const schedule = await farmTaskScheduleService.getScheduleById(req.params.id);
    if (!schedule) {
      return res.status(404).json({ success: false, error: '排班不存在' });
    }
    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('获取排班详情失败:', error);
    res.status(500).json({ success: false, error: '获取排班详情失败' });
  }
});

/**
 * 创建排班
 * POST /
 */
router.post('/', requireAuth, async (req, res) => {
  try {
    const { taskId, workerId, workerName, teamId, teamName, planDate, planStart, planEnd, shiftType, remarks } = req.body;

    // 必填字段校验
    if (!taskId || !workerId || !planDate) {
      return res.status(400).json({ success: false, error: '缺少必填字段' });
    }

    // 检查冲突：同一执行人在同一天不能有多个排班
    const conflicts = await farmTaskScheduleService.checkConflicts(workerId, planDate);
    if (conflicts.length > 0) {
      return res.status(409).json({
        success: false,
        error: '该执行人在同日已有排班',
        data: conflicts,
      });
    }

    const schedule = await farmTaskScheduleService.createSchedule({
      taskId,
      workerId,
      workerName,
      teamId,
      teamName,
      planDate,
      planStart,
      planEnd,
      shiftType,
      remarks,
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('创建排班失败:', error);
    res.status(500).json({ success: false, error: '创建排班失败' });
  }
});

/**
 * 更新排班
 * PUT /:id
 */
router.put('/:id', requireAuth, async (req, res) => {
  try {
    const { workerId, workerName, teamId, teamName, planDate, planStart, planEnd, shiftType, status, remarks } = req.body;

    // 如果变更了执行人或日期，检查冲突
    if (workerId || planDate) {
      const existing = await farmTaskScheduleService.getScheduleById(req.params.id);
      if (existing) {
        const conflicts = await farmTaskScheduleService.checkConflicts(
          workerId || existing.worker_id,
          planDate || existing.plan_date,
          req.params.id
        );
        if (conflicts.length > 0) {
          return res.status(409).json({
            success: false,
            error: '该执行人在同日已有排班',
            data: conflicts,
          });
        }
      }
    }

    const schedule = await farmTaskScheduleService.updateSchedule(req.params.id, {
      workerId,
      workerName,
      teamId,
      teamName,
      planDate,
      planStart,
      planEnd,
      shiftType,
      status,
      remarks,
    });

    res.json({ success: true, data: schedule });
  } catch (error) {
    console.error('更新排班失败:', error);
    res.status(500).json({ success: false, error: '更新排班失败' });
  }
});

/**
 * 删除排班
 * DELETE /:id
 */
router.delete('/:id', requireAuth, async (req, res) => {
  try {
    await farmTaskScheduleService.deleteSchedule(req.params.id);
    res.json({ success: true });
  } catch (error) {
    console.error('删除排班失败:', error);
    res.status(500).json({ success: false, error: '删除排班失败' });
  }
});

export default router;
