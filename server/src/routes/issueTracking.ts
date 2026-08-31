/**
 * v0.3 P1-5：问题整改追踪 API 路由
 *
 * 路径：
 *   GET   /api/issues/board                  - 5 列看板（按状态分组）
 *   GET   /api/issues/:id                   - 问题详情
 *   POST  /api/issues/:id/rectify           - 提交整改
 *   POST  /api/issues/:id/recheck           - 提交复检
 *   GET   /api/issues/by-batch/:batchCode   - 按批次查问题
 *
 * 设计原则：
 *   - 不修改任何现有 API
 *   - 问题记录本身已存在（problems 表已扩展字段）
 *   - 仅新增"整改+复检"工作流
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db/index';

const router = Router();

function genId(prefix: string): string {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
}

function rowsToObjects(result: Array<{ columns: string[]; values: unknown[][] }>): Record<string, unknown>[] {
  if (result.length === 0) return [];
  const cols = result[0].columns;
  const out: Record<string, unknown>[] = [];
  for (const row of result[0].values) {
    const obj: Record<string, unknown> = {};
    cols.forEach((c, i) => {
      obj[c] = row[i];
    });
    out.push(obj);
  }
  return out;
}

/**
 * GET /api/issues/board
 * Query: base_id, assignee_id, batch_code, severity
 *
 * 5 列看板分组：
 *   - pending: status='pending' AND rectification_progress=0
 *   - in_progress: status='pending' AND rectification_progress > 0
 *   - recheck_pending: recheck_required=1 AND recheck_result IS NULL
 *   - closed: status='closed'
 *   - recurrence: recurrence_count > 0
 */
router.get('/board', async (req: Request, res: Response): Promise<void> => {
  try {
    const { assignee_id, batch_code, severity } = req.query as Record<string, string | undefined>;
    const db = getDatabase();
    const whereClauses: string[] = [];
    const params: unknown[] = [];
    if (assignee_id) {
      whereClauses.push('assignee_id = ?');
      params.push(assignee_id);
    }
    if (batch_code) {
      whereClauses.push('related_batch_code = ?');
      params.push(batch_code);
    }
    if (severity) {
      whereClauses.push('severity = ?');
      params.push(severity);
    }
    const whereClause = whereClauses.length > 0 ? 'WHERE ' + whereClauses.join(' AND ') : '';
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(`SELECT * FROM problems ${whereClause} ORDER BY create_time DESC LIMIT 500`, params as any[]);

    const all = rowsToObjects(result);
    const board = {
      pending: all.filter((p) => p.status === 'pending' && !p.rectification_progress),
      in_progress: all.filter((p) => p.status === 'pending' && p.rectification_progress && (p.rectification_progress as number) > 0),
      recheck_pending: all.filter((p) => p.recheck_required && !p.recheck_result),
      closed: all.filter((p) => p.status === 'closed'),
      recurrence: all.filter((p) => (p.recurrence_count as number) > 0),
    };

    res.json({
      success: true,
      data: {
        board,
        counts: {
          pending: board.pending.length,
          in_progress: board.in_progress.length,
          recheck_pending: board.recheck_pending.length,
          closed: board.closed.length,
          recurrence: board.recurrence.length,
          total: all.length,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/issues/:id
 */
router.get('/:id', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const db = getDatabase();
    const result = db.exec('SELECT * FROM problems WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ success: false, error: '问题不存在' });
      return;
    }
    res.json({ success: true, data: rowsToObjects(result)[0] });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/issues/:id/rectify
 * Body: { progress: number, remark?: string, actor_id: string }
 *
 * 更新整改进度
 */
router.post('/:id/rectify', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { progress, remark, actor_id } = req.body as { progress: number; remark?: string; actor_id?: string };
    const db = getDatabase();

    if (progress === undefined || progress < 0 || progress > 100) {
      res.status(400).json({ success: false, error: 'progress 必须在 0-100' });
      return;
    }

    db.exec('BEGIN IMMEDIATE');
    try {
      // 取当前最大 progress（只增不减）
      const currentResult = db.exec('SELECT rectification_progress FROM problems WHERE id = ?', [id]);
      if (currentResult.length === 0 || currentResult[0].values.length === 0) {
        res.status(404).json({ success: false, error: '问题不存在' });
        return;
      }
      const currentProgress = (currentResult[0].values[0][0] as number) ?? 0;
      const finalProgress = Math.max(currentProgress, progress);

      db.exec(
        `UPDATE problems
         SET rectification_progress = ?,
             recheck_required = CASE WHEN ? = 100 THEN 1 ELSE 0 END,
             updated_at = datetime('now', 'localtime')
         WHERE id = ?`,
        [finalProgress, finalProgress, id]
      );

      // 写入 problem_flow_records（如果存在）
      try {
        db.exec(
          `INSERT INTO problem_flow_records
           (id, problem_id, action, actor_id, actor_name, comment, create_time)
           VALUES (?, ?, ?, ?, ?, ?, datetime('now', 'localtime'))`,
          [
            genId('flow'),
            id,
            'rectify',
            actor_id ?? null,
            actor_id ?? null,
            remark ?? `整改进度更新为 ${finalProgress}%`,
          ]
        );
      } catch {
        // 表可能不存在
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    saveDatabase();
    res.json({ success: true, data: { id, rectification_progress: progress } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/issues/:id/recheck
 * Body: { result: 'pass' | 'fail', comment?, actor_id }
 *
 * 复检结果：
 *   - pass: status='closed', recheck_result='pass'
 *   - fail: recurrence_count += 1, rectification_progress 重置为 0
 */
router.post('/:id/recheck', async (req: Request, res: Response): Promise<void> => {
  try {
    const { id } = req.params;
    const { result, comment, actor_id } = req.body as { result: 'pass' | 'fail'; comment?: string; actor_id?: string };
    if (result !== 'pass' && result !== 'fail') {
      res.status(400).json({ success: false, error: 'result 必须是 pass 或 fail' });
      return;
    }
    const db = getDatabase();
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      if (result === 'pass') {
        db.exec(
          `UPDATE problems
           SET status = 'closed',
               recheck_result = 'pass',
               recheck_at = datetime('now', 'localtime'),
               rechecker_id = ?,
               updated_at = datetime('now', 'localtime')
           WHERE id = ?`,
          [actor_id ?? null, id]
        );
      } else {
        // fail: 复发计数 +1，进度重置
        db.exec(
          `UPDATE problems
           SET recheck_result = 'fail',
               recheck_at = datetime('now', 'localtime'),
               rechecker_id = ?,
               recurrence_count = COALESCE(recurrence_count, 0) + 1,
               rectification_progress = 0,
               status = 'pending',
               updated_at = datetime('now', 'localtime')
           WHERE id = ?`,
          [actor_id ?? null, id]
        );
      }

      try {
        db.exec(
          `INSERT INTO problem_flow_records
           (id, problem_id, action, actor_id, actor_name, comment, create_time)
           VALUES (?, ?, ?, ?, ?, ?, ?)`,
          [
            genId('flow'),
            id,
            result === 'pass' ? 'close' : 'reopen',
            actor_id ?? null,
            actor_id ?? null,
            comment ?? (result === 'pass' ? '复检通过' : '复检未通过，重新整改'),
            now,
          ]
        );
      } catch {
        // ignore
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }
    saveDatabase();
    res.json({ success: true, data: { id, result } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/issues/by-batch/:batchCode
 */
router.get('/by-batch/:batchCode', async (req: Request, res: Response): Promise<void> => {
  try {
    const { batchCode } = req.params;
    const db = getDatabase();
    const result = db.exec(
      'SELECT * FROM problems WHERE related_batch_code = ? ORDER BY create_time DESC',
      [batchCode]
    );
    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
