/**
 * AI-06 工时预测 REST 端点（V1）
 * 2026-08-22：MVP 上线（规则+统计 baseline）
 *
 * POST /api/ai/workhour/predict
 * POST /api/ai/workhour/feedback
 * GET  /api/ai/workhour/predictions?task_id=xxx
 */

import { Router, Request, Response } from 'express';
import { predictWorkhour } from '../../services/ai/workhourPredictor';
import { getDatabase, saveDatabase } from '../../db';

const router = Router();

/**
 * POST /api/ai/workhour/predict
 * 输入任务信息，返回预测工时 + 置信区间 + XAI 推理依据
 */
router.post('/predict', async (req: Request, res: Response) => {
  try {
    const input = req.body || {};

    // 输入校验
    if (!input.task_type) {
      return res.status(400).json({ success: false, error: 'task_type 必填' });
    }

    const result = await predictWorkhour({
      task_type: input.task_type,
      priority: input.priority,
      greenhouse_id: input.greenhouse_id,
      assignee_id: input.assignee_id,
      task_id: input.task_id,
    });

    // 记录预测到 ai_workhour_predictions 表（如果表存在 — 2026-08-22 后续创建）
    // Phase 1 MVP：暂不写库，仅返回结果
    // TODO: Phase 2 加 ai_workhour_predictions 表 + INSERT

    res.json({ success: true, data: result });
  } catch (e: any) {
    console.error('[ai/workhour/predict]', e);
    res.status(500).json({ success: false, error: e.message || '预测失败' });
  }
});

/**
 * POST /api/ai/workhour/feedback
 * 用户反馈实际工时（写入 ai_workhour_predictions 表的 actual_hours 字段）
 */
router.post('/feedback', async (req: Request, res: Response) => {
  try {
    const { task_id, actual_hours, accepted } = req.body || {};
    if (!task_id || actual_hours === undefined) {
      return res.status(400).json({ success: false, error: 'task_id + actual_hours 必填' });
    }
    const db = getDatabase();

    // 直接更新 farm_tasks 表的 actual_hours 字段（同步 AI-06 训练数据）
    const now = new Date().toISOString();
    const ratio = db.exec(`SELECT estimated_hours FROM farm_tasks WHERE id = ?`, [task_id])[0]?.values?.[0]?.[0];
    const ratioValue = (ratio && Number(actual_hours) > 0) ? Number(actual_hours) / Number(ratio) : null;

    db.run(`UPDATE farm_tasks
            SET actual_hours = ?, actual_hours_recorded_at = ?, estimated_vs_actual_ratio = ?
            WHERE id = ?`,
      [Number(actual_hours), now, ratioValue, task_id]);
    saveDatabase();

    res.json({ success: true, data: { task_id, actual_hours, estimated_vs_actual_ratio: ratioValue } });
  } catch (e: any) {
    console.error('[ai/workhour/feedback]', e);
    res.status(500).json({ success: false, error: e.message || '反馈失败' });
  }
});

/**
 * GET /api/ai/workhour/predictions?task_id=xxx
 * 查询某任务的历史预测列表（用于 UI 展示 AI 推理依据）
 */
router.get('/predictions', (req: Request, res: Response) => {
  try {
    const taskId = req.query.task_id as string;
    if (!taskId) {
      return res.status(400).json({ success: false, error: 'task_id 必填' });
    }
    const db = getDatabase();

    // 当前 ai_workhour_predictions 表还没建，先返回任务基本信息
    const taskRows = db.exec(`SELECT id, task_code, task_title, task_type, priority, estimated_hours, actual_hours
                              FROM farm_tasks WHERE id = ?`, [taskId]);
    if (!taskRows[0]) {
      return res.status(404).json({ success: false, error: '任务不存在' });
    }
    const taskCols = taskRows[0].columns;
    const taskObj: any = {};
    taskCols.forEach((c, i) => { taskObj[c] = taskRows[0].values[0][i]; });

    res.json({ success: true, data: { task: taskObj, predictions: [] /* TODO */ } });
  } catch (e: any) {
    res.status(500).json({ success: false, error: e.message });
  }
});

export default router;
