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

/**
 * 2026-09-15：批量任务分配（#9 批量任务分配）
 * POST /batch-assign
 * 输入：template task_id + workers[] + 日期范围
 * 输出：自动生成 N 个 farm_task_schedule（每个 worker × 每个 date）
 *
 * 参数：
 *   taskId - 任务模板 ID（必填）
 *   startDate / endDate - 日期范围（必填）
 *   workers[] - 每个 worker：{ workerId, workerName, teamId, teamName, shiftType?, percentage? }
 *
 * 跳过冲突：同 worker 同日期已有排班则跳过，不阻塞主流程
 */
router.post('/batch-assign', requireAuth, async (req, res) => {
  try {
    const { taskId, startDate, endDate, workers, planStart, planEnd, remarks, createdBy } = req.body || {};

    // 必填校验
    if (!taskId) return res.status(400).json({ success: false, error: 'taskId 必填' });
    if (!startDate || !endDate) return res.status(400).json({ success: false, error: 'startDate/endDate 必填' });
    if (!Array.isArray(workers) || workers.length === 0) {
      return res.status(400).json({ success: false, error: 'workers 必须是非空数组' });
    }

    // 日期范围校验
    const start = new Date(startDate + 'T00:00:00');
    const end = new Date(endDate + 'T00:00:00');
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || end < start) {
      return res.status(400).json({ success: false, error: '日期范围无效' });
    }
    const dayCount = Math.round((end.getTime() - start.getTime()) / (24 * 60 * 60 * 1000)) + 1;
    if (dayCount > 90) {
      return res.status(400).json({ success: false, error: '单次批量最多 90 天' });
    }

    // 生成日期序列
    const dates: string[] = [];
    const cursor = new Date(start);
    while (cursor <= end) {
      const y = cursor.getFullYear();
      const m = String(cursor.getMonth() + 1).padStart(2, '0');
      const d = String(cursor.getDate()).padStart(2, '0');
      dates.push(`${y}-${m}-${d}`);
      cursor.setDate(cursor.getDate() + 1);
    }

    // 逐个 worker × 日期生成
    let created = 0;
    const skipped: Array<{ workerId: string; date: string; reason: string }> = [];
    const errors: string[] = [];

    for (const w of workers) {
      if (!w.workerId) continue;
      for (const date of dates) {
        try {
          // 冲突检测
          const conflicts = await farmTaskScheduleService.checkConflicts(w.workerId, date);
          if (conflicts.length > 0) {
            skipped.push({ workerId: w.workerId, date, reason: '该执行人在同日已有排班' });
            continue;
          }
          await farmTaskScheduleService.createSchedule({
            taskId,
            workerId: w.workerId,
            workerName: w.workerName || '',
            teamId: w.teamId || null,
            teamName: w.teamName || null,
            planDate: date,
            planStart: planStart || null,
            planEnd: planEnd || null,
            shiftType: w.shiftType || null,
            remarks: remarks || null,
          });
          created++;
        } catch (e) {
          errors.push(`${w.workerId}@${date}: ${(e as Error).message}`);
        }
      }
    }

    res.json({
      success: true,
      data: {
        created,
        skipped: skipped.length,
        errors: errors.length,
        details: { skipped, errors: errors.slice(0, 10) }, // 最多返回前 10 个错误
      },
    });
  } catch (error) {
    console.error('批量任务分配失败:', error);
    res.status(500).json({ success: false, error: '批量任务分配失败' });
  }
});

export default router;
