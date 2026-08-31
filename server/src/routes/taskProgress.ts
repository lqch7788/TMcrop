/**
 * v0.3 P0-2：任务进度跟踪 API 路由
 *
 * 路径：
 *   POST /api/farm-tasks/:id/progress       - 增量更新进度（只增不减）
 *   POST /api/farm-tasks/:id/start         - 任务开始（设 progress_pct = max(5, current)）
 *   POST /api/farm-tasks/:id/pause         - 任务暂停（带原因）
 *   POST /api/farm-tasks/:id/resume        - 任务恢复
 *   POST /api/farm-tasks/:id/complete      - 任务完成（设 progress_pct = 100）
 *
 * 设计原则：
 *   - 不修改 farmTask.ts 的现有 handler
 *   - 仅新增独立路由
 *   - progress_pct 只增不减（MAX 防回退）
 *   - 100% 自动标记完成
 *
 * UI 暴露范围（v0.3 阶段 1）：
 *   - 任务详情页：仅"完成"按钮
 *   - 暂停/续做/开始：隐藏在管理后台（v0.4+ 启用）
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

/**
 * 内部工具：原子更新任务进度
 */
function updateProgress(
  taskId: string,
  newPct: number,
  userId: string | undefined,
  eventType: 'start' | 'pause' | 'resume' | 'complete' | 'progress'
): { success: boolean; progressPct: number; autoCompleted: boolean; message?: string } {
  if (newPct < 0 || newPct > 100) {
    return { success: false, progressPct: 0, autoCompleted: false, message: 'pct 必须在 0-100' };
  }

  const db = getDatabase();

  // 读取当前进度（用于只增不减 + 返回最新值）
  const currentResult = db.exec('SELECT progress_pct, status FROM farm_tasks WHERE id = ?', [taskId]);
  if (currentResult.length === 0 || currentResult[0].values.length === 0) {
    return { success: false, progressPct: 0, autoCompleted: false, message: '任务不存在' };
  }
  const currentPct = (currentResult[0].values[0][0] as number) ?? 0;
  const currentStatus = currentResult[0].values[0][1] as string;

  // 只增不减
  const finalPct = Math.max(currentPct, newPct);
  const autoCompleted = finalPct === 100 && currentStatus !== 'completed';

  db.exec('BEGIN IMMEDIATE');
  try {
    // 更新进度
    db.exec('UPDATE farm_tasks SET progress_pct = ? WHERE id = ?', [finalPct, taskId]);

    // 100% 自动完成
    if (autoCompleted) {
      db.exec(
        `UPDATE farm_tasks
         SET status = 'completed',
             actual_end_at = COALESCE(actual_end_at, datetime('now', 'localtime')),
             completion_date = COALESCE(completion_date, datetime('now', 'localtime'))
         WHERE id = ?`,
        [taskId]
      );
    }

    // 记录事件流（写到 task_operation_records）
    if (userId) {
      db.exec(
        `INSERT INTO task_operation_records
         (id, task_id, task_code, action, progress, from_status, to_status, operator_id, operator_name, created_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
        [
          `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
          taskId,
          taskId,
          eventType,
          finalPct,
          currentStatus,
          autoCompleted ? 'completed' : currentStatus,
          userId,
          userId,
        ]
      );
    }

    db.exec('COMMIT');
    saveDatabase();
    return { success: true, progressPct: finalPct, autoCompleted };
  } catch (err) {
    try {
      db.exec('ROLLBACK');
    } catch {
      // ignore
    }
    throw err;
  }
}

/**
 * POST /api/farm-tasks/:id/progress
 * Body: { pct: number }
 */
router.post('/:id/progress', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { pct } = req.body as { pct?: number };
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (pct === undefined || pct === null) {
      res.status(400).json({ success: false, error: 'pct 必填' });
      return;
    }

    const result = updateProgress(id, pct, userId, 'progress');
    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }
    res.json({
      success: true,
      data: {
        progressPct: result.progressPct,
        autoCompleted: result.autoCompleted,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/farm-tasks/:id/complete
 * 直接标记完成（无需 pct 参数）
 */
router.post('/:id/complete', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const result = updateProgress(id, 100, userId, 'complete');
    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }
    res.json({
      success: true,
      data: {
        progressPct: 100,
        autoCompleted: result.autoCompleted,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/farm-tasks/:id/start
 * 任务开始（最小进度 5%）
 */
router.post('/:id/start', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const result = updateProgress(id, 5, userId, 'start');
    if (!result.success) {
      res.status(400).json({ success: false, error: result.message });
      return;
    }
    res.json({ success: true, data: { progressPct: result.progressPct } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/farm-tasks/:id/pause
 * 暂停任务（带原因）
 * Body: { reason: string }
 */
router.post('/:id/pause', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const { reason } = req.body as { reason?: string };
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;

    if (!reason) {
      res.status(400).json({ success: false, error: 'reason 必填' });
      return;
    }

    const db = getDatabase();
    db.exec('BEGIN IMMEDIATE');
    try {
      db.exec(
        `UPDATE farm_tasks
         SET status = 'paused',
             current_pause_reason = ?,
             paused_at = datetime('now', 'localtime')
         WHERE id = ?`,
        [reason, id]
      );
      if (userId) {
        db.exec(
          `INSERT INTO task_operation_records
           (id, task_id, task_code, action, progress, from_status, to_status, operator_id, operator_name, reason, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
          [
            `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            id,
            id,
            'pause',
            0,
            'in_progress',
            'paused',
            userId,
            userId,
            reason,
          ]
        );
      }
      db.exec('COMMIT');
      saveDatabase();
      res.json({ success: true });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/farm-tasks/:id/resume
 * 恢复暂停的任务
 */
router.post('/:id/resume', (req: Request, res: Response): void => {
  try {
    const { id } = req.params;
    const userId = (req as Request & { user?: { userId?: string } }).user?.userId;
    const db = getDatabase();

    db.exec('BEGIN IMMEDIATE');
    try {
      // 累计暂停时长
      db.exec(
        `UPDATE farm_tasks
         SET status = 'in_progress',
             total_pause_seconds = total_pause_seconds +
               (julianday('now', 'localtime') - julianday(COALESCE(paused_at, 'now', 'localtime'))) * 86400,
             resumed_at = datetime('now', 'localtime'),
             current_pause_reason = NULL
         WHERE id = ?`,
        [id]
      );
      if (userId) {
        db.exec(
          `INSERT INTO task_operation_records
           (id, task_id, task_code, action, progress, from_status, to_status, operator_id, operator_name, created_at)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
          [
            `evt_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
            id,
            id,
            'resume',
            0,
            'paused',
            'in_progress',
            userId,
            userId,
          ]
        );
      }
      db.exec('COMMIT');
      saveDatabase();
      res.json({ success: true });
    } catch (err) {
      db.exec('ROLLBACK');
      throw err;
    }
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
