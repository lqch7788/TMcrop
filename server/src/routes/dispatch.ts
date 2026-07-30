/**
 * 智能派工推荐路由
 */

import { Request, Response, Router } from 'express';
import { getDatabase, saveDatabase } from '../db';

interface SqlTableResult {
  columns: string[];
  values: unknown[][];
}

interface WorkerRecommendation {
  workerId: string;
  employeeCode: string;
  workerName: string;
  skills: string;
}

type PoolSource = 'team' | 'all';

const router = Router();

/**
 * 将 sql.js 查询结果转换为员工推荐对象。
 */
function mapWorkerRecommendations(result: SqlTableResult[]): WorkerRecommendation[] {
  const table = result[0];
  if (!table) return [];

  const idIndex = table.columns.indexOf('id');
  const codeIndex = table.columns.indexOf('employee_code');
  const nameIndex = table.columns.indexOf('name');
  const skillsIndex = table.columns.indexOf('skills');

  return table.values.map((row) => ({
    workerId: String(row[idIndex] ?? ''),
    employeeCode: String(row[codeIndex] ?? ''),
    workerName: String(row[nameIndex] ?? ''),
    skills: String(row[skillsIndex] ?? ''),
  }));
}

/**
 * POST /api/dispatch/recommend
 * 根据可选班组范围生成智能派工候选列表。
 */
router.post('/recommend', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body as { teamIds?: unknown } | undefined;
    const teamIds = body?.teamIds;

    // teamIds 是 API 边界输入，格式不合法时显式拒绝，不能静默扩大为全员池。
    if (
      teamIds !== undefined
      && (!Array.isArray(teamIds) || teamIds.some((teamId) => typeof teamId !== 'string' || teamId.length === 0))
    ) {
      return res.status(400).json({ success: false, error: 'teamIds 必须是非空字符串数组' });
    }

    let candidateWorkerIds: string[] | null = null;
    let poolSource: PoolSource = 'all';

    // 班组非空时必须先确定候选员工，避免评分流程读取全员池。
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      const normalizedTeamIds = teamIds.filter((teamId): teamId is string => typeof teamId === 'string');
      const placeholders = normalizedTeamIds.map(() => '?').join(',');
      const teamResult = normalizedTeamIds.length > 0
        ? db.exec(
            `SELECT DISTINCT worker_id FROM team_members WHERE team_id IN (${placeholders})`,
            normalizedTeamIds,
          ) as SqlTableResult[]
        : [];
      candidateWorkerIds = teamResult[0]
        ? teamResult[0].values.map((row) => String(row[0]))
        : [];
      poolSource = 'team';
    }

    let workerResult: SqlTableResult[] = [];
    if (candidateWorkerIds === null) {
      workerResult = db.exec(
        "SELECT id, employee_code, name, skills FROM employees WHERE status = 'active' ORDER BY name",
      ) as SqlTableResult[];
    } else if (candidateWorkerIds.length > 0) {
      const placeholders = candidateWorkerIds.map(() => '?').join(',');
      workerResult = db.exec(
        `SELECT id, employee_code, name, skills FROM employees WHERE status = 'active' AND id IN (${placeholders}) ORDER BY name`,
        candidateWorkerIds,
      ) as SqlTableResult[];
    }

    return res.json({
      success: true,
      data: {
        recommendations: mapWorkerRecommendations(workerResult),
        poolSource,
      },
    });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('智能派工推荐失败:', message);
    return res.status(500).json({ success: false, error: message || '智能派工推荐失败' });
  }
});

/**
 * POST /api/dispatch/override
 * 派工接受软警告后记录覆写决策，便于后续复盘。
 */
router.post('/override', (req: Request, res: Response) => {
  const body = req.body as {
    taskId?: unknown;
    workerId?: unknown;
    overrideReason?: unknown;
    conflictType?: unknown;
    createdBy?: unknown;
  } | undefined;
  const taskId = body?.taskId;
  const workerId = body?.workerId;
  const overrideReason = body?.overrideReason;
  const conflictType = body?.conflictType;
  const createdBy = body?.createdBy;

  if (!taskId || !workerId || !overrideReason) {
    return res.status(400).json({
      success: false,
      error: 'taskId/workerId/overrideReason 必填',
    });
  }

  try {
    const db = getDatabase();
    db.run(
      `INSERT INTO dispatch_override_log (id, task_id, worker_id, override_reason, conflict_type, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, datetime('now'))`,
      [
        `override-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
        taskId as string,
        workerId as string,
        overrideReason as string,
        (conflictType as string) || null,
        (createdBy as string) || null,
      ],
    );
    saveDatabase();

    return res.json({ success: true, data: { logged: true } });
  } catch (error: unknown) {
    const message = error instanceof Error ? error.message : String(error);
    console.error('覆写日志写入失败:', message);
    return res.status(500).json({ success: false, error: message || '覆写日志失败' });
  }
});

export default router;
