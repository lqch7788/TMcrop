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
  // 2026-09-15：三维评分字段（#1 区域 / #2 技能 / #3 任务类型 / #8 可用性）
  score?: number;
  scoreCapability?: number;
  scoreZone?: number;
  scoreAvailability?: number;
  matchedTeams?: string[]; // 工人所属班（主职+兼职）
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
 * 2026-09-15：三维评分（#1 区域 + #2/#3 能力 + #8 可用性）
 * - scoreCapability：工人 skills 与 taskType 匹配度（0/40/80/100）
 * - scoreZone：工人所在班组是否关联该 zoneId（0/50/100）
 * - scoreAvailability：team_daily_availability.available_hours（0-100 映射）
 * - score = 加权平均
 */
function enrichWithScore(
  recommendations: WorkerRecommendation[],
  taskType: string,
  zoneId: string | undefined,
  date: string,
  db: ReturnType<typeof getDatabase>,
): void {
  if (recommendations.length === 0) return;

  // 1. 批量查每个工人所属班组（含主职+兼职）
  const workerIds = recommendations.map((r) => r.workerId);
  const placeholders = workerIds.map(() => '?').join(',');
  const workerTeamsRes = db.exec(
    `SELECT worker_id, team_id FROM worker_team_assignments WHERE worker_id IN (${placeholders}) AND left_at IS NULL`,
    workerIds,
  );
  const workerTeamMap = new Map<string, string[]>(); // worker_id → team_ids
  if (workerTeamsRes[0]) {
    for (const row of workerTeamsRes[0].values) {
      const wid = String(row[0]);
      if (!workerTeamMap.has(wid)) workerTeamMap.set(wid, []);
      workerTeamMap.get(wid)!.push(String(row[1]));
    }
  }

  // 2. 批量查班组的 task_capabilities
  const allTeamIds = Array.from(new Set(Array.from(workerTeamMap.values()).flat()));
  const teamCapMap = new Map<string, Set<string>>(); // team_id → task_types
  if (allTeamIds.length > 0) {
    const teamPlaceholders = allTeamIds.map(() => '?').join(',');
    const capRes = db.exec(
      `SELECT team_id, task_type FROM team_task_capabilities WHERE team_id IN (${teamPlaceholders})`,
      allTeamIds,
    );
    if (capRes[0]) {
      for (const row of capRes[0].values) {
        const tid = String(row[0]);
        if (!teamCapMap.has(tid)) teamCapMap.set(tid, new Set());
        teamCapMap.get(tid)!.add(String(row[1]));
      }
    }
  }

  // 3. 批量查班组 zone_assignments
  const teamZoneMap = new Map<string, Set<string>>(); // team_id → zone_ids
  if (allTeamIds.length > 0) {
    const teamPlaceholders = allTeamIds.map(() => '?').join(',');
    const zoneRes = db.exec(
      `SELECT team_id, zone_id FROM team_zone_assignments WHERE team_id IN (${teamPlaceholders})`,
      allTeamIds,
    );
    if (zoneRes[0]) {
      for (const row of zoneRes[0].values) {
        const tid = String(row[0]);
        if (!teamZoneMap.has(tid)) teamZoneMap.set(tid, new Set());
        teamZoneMap.get(tid)!.add(String(row[1]));
      }
    }
  }

  // 4. 批量查班组当日可用性
  const teamAvailMap = new Map<string, number>(); // team_id → available_hours
  if (allTeamIds.length > 0) {
    const teamPlaceholders = allTeamIds.map(() => '?').join(',');
    const availRes = db.exec(
      `SELECT team_id, available_hours FROM team_daily_availability WHERE team_id IN (${teamPlaceholders}) AND date = ?`,
      [...allTeamIds, date],
    );
    if (availRes[0]) {
      for (const row of availRes[0].values) {
        teamAvailMap.set(String(row[0]), Number(row[1]) || 0);
      }
    }
  }

  // 5. 给每个候选人算三维分
  for (const rec of recommendations) {
    const teamIds = workerTeamMap.get(rec.workerId) || [];
    rec.matchedTeams = teamIds;

    // 能力分（工人 skills 与 taskType 匹配 + 班组 capability 与 taskType 匹配）
    let capScore = 0;
    try {
      const skills = JSON.parse(rec.skills || '[]');
      if (Array.isArray(skills) && skills.includes(taskType)) capScore += 50;
    } catch { /* ignore */ }
    for (const tid of teamIds) {
      const caps = teamCapMap.get(tid);
      if (caps && caps.has(taskType)) capScore += 50;
    }
    capScore = Math.min(100, capScore);

    // 区域分（任一班组关联该 zone 即满分）
    let zoneScore = 0;
    if (zoneId) {
      for (const tid of teamIds) {
        const zones = teamZoneMap.get(tid);
        if (zones && zones.has(zoneId)) {
          zoneScore = 100;
          break;
        }
      }
    } else {
      zoneScore = 50; // 未传 zoneId 给中性分
    }

    // 可用性分（所有班组当日可用工时平均值 → 0-100 映射；8h = 100）
    let availScore = 0;
    if (teamIds.length > 0) {
      let total = 0;
      let count = 0;
      for (const tid of teamIds) {
        const h = teamAvailMap.get(tid);
        if (h !== undefined) {
          total += h;
          count++;
        }
      }
      const avgHours = count > 0 ? total / count : 8;
      availScore = Math.min(100, Math.round((avgHours / 8) * 100));
    } else {
      availScore = 50;
    }

    rec.scoreCapability = capScore;
    rec.scoreZone = zoneScore;
    rec.scoreAvailability = availScore;
    // 加权：能力 40% + 区域 30% + 可用性 30%
    rec.score = Math.round(capScore * 0.4 + zoneScore * 0.3 + availScore * 0.3);
  }
}

/**
 * POST /api/dispatch/recommend
 * 根据可选班组范围生成智能派工候选列表。
 */
router.post('/recommend', (req: Request, res: Response) => {
  try {
    const db = getDatabase();
    const body = req.body as { teamIds?: unknown; taskType?: string; zoneId?: string; date?: string } | undefined;
    const teamIds = body?.teamIds;
    // 2026-09-15：三维评分参数（taskType 必传才启用评分，否则向后兼容只返回基础列表）
    const taskType = body?.taskType;
    const zoneId = body?.zoneId;
    const date = body?.date || new Date().toISOString().slice(0, 10);

    // teamIds 是 API 边界输入，格式不合法时显式拒绝，不能静默扩大为全员池。
    if (
      teamIds !== undefined
      && (!Array.isArray(teamIds) || teamIds.some((teamId) => typeof teamId !== 'string' || teamId.length === 0))
    ) {
      return res.status(400).json({ success: false, error: 'teamIds 必须是非空字符串数组' });
    }

    let candidateWorkerIds: string[] | null = null;
    let poolSource: PoolSource = 'all';

    // 班组非空时必须先确定候选员工（2026-09-15：兼容 worker_team_assignments 主职+兼职）
    if (Array.isArray(teamIds) && teamIds.length > 0) {
      const normalizedTeamIds = teamIds.filter((teamId): teamId is string => typeof teamId === 'string');
      const placeholders = normalizedTeamIds.map(() => '?').join(',');
      const teamResult = normalizedTeamIds.length > 0
        ? db.exec(
            `SELECT DISTINCT worker_id FROM worker_team_assignments WHERE team_id IN (${placeholders}) AND left_at IS NULL`,
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

    // 2026-09-15：三维评分（能力 + 区域 + 可用工时），不传 taskType 时只返回基础列表（向后兼容）
    const recommendations = mapWorkerRecommendations(workerResult);
    if (taskType) {
      enrichWithScore(recommendations, taskType, zoneId, date, db);
      recommendations.sort((a, b) => (b.score || 0) - (a.score || 0));
    }

    return res.json({
      success: true,
      data: {
        recommendations,
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
 * POST /api/dispatch/worker-tasks-and-location
 * 2026-08-24 PR4：AI-08 路径优化的工人数据查询端点
 * - 工人位置：优先从 greenhouses 取其默认温室坐标；无默认则取其最近任务 greenhouse 坐标
 * - 今日任务：从 farm_tasks JOIN greenhouses 取 lat/lng
 * - 返回 { worker: {id, name, lat, lng}, tasks: [{id, lat, lng, name}] }
 */
router.post('/worker-tasks-and-location', (req: Request, res: Response) => {
  const body = req.body as { worker_id?: unknown; date?: unknown };
  const workerId = typeof body.worker_id === 'string' ? body.worker_id : '';
  const date = typeof body.date === 'string' ? body.date : new Date().toISOString().split('T')[0];
  if (!workerId) {
    return res.status(400).json({ success: false, error: 'worker_id 必填' });
  }

  const db = getDatabase();

  // 1. 工人信息
  const empStmt = db.prepare('SELECT id, name FROM employees WHERE id = ? LIMIT 1');
  empStmt.bind([workerId]);
  const hasEmp = empStmt.step();
  const empRow = hasEmp ? empStmt.getAsObject() : null;
  empStmt.free();
  if (!hasEmp || !empRow) {
    return res.status(404).json({ success: false, error: `工人 ${workerId} 不存在` });
  }

  // 2. 工人默认温室坐标（employees 表无默认温室字段，从最近任务最多访问的 greenhouse 反查）
  const locRows = db.exec(`
    SELECT g.lat, g.lng, g.name AS gh_name
    FROM farm_tasks t
    JOIN greenhouses g ON g.id = t.greenhouse_id
    WHERE t.assignee_id = ? AND g.lat != 0 AND g.lng != 0
    GROUP BY g.id
    ORDER BY COUNT(*) DESC
    LIMIT 1
  `, [workerId]);
  let workerLat = 0;
  let workerLng = 0;
  if (locRows[0]?.values?.[0]) {
    workerLat = Number(locRows[0].values[0][0]);
    workerLng = Number(locRows[0].values[0][1]);
  }
  if (workerLat === 0 && workerLng === 0) {
    return res.status(400).json({
      success: false,
      error: `工人 ${workerId} 无可用坐标（最近任务 greenhouse 缺失 lat/lng），无法启动路径优化`,
    });
  }

  // 3. 今日任务（plan_date = date）
  const taskRows = db.exec(`
    SELECT t.id, g.lat, g.lng, g.name AS gh_name, t.task_type
    FROM farm_tasks t
    LEFT JOIN greenhouses g ON g.id = t.greenhouse_id
    WHERE t.assignee_id = ?
      AND DATE(t.plan_date) = ?
      AND t.status IN ('pending_acceptance', 'accepted', 'in_progress')
    ORDER BY t.priority DESC, t.plan_date ASC
  `, [workerId, date]);
  const tasks: { id: string; lat: number; lng: number; name: string; task_type: string }[] = [];
  if (taskRows[0]) {
    for (const row of taskRows[0].values) {
      tasks.push({
        id: String(row[0]),
        lat: Number(row[1]) || 0,
        lng: Number(row[2]) || 0,
        name: row[3] ? String(row[3]) : `任务${String(row[0])}`,
        task_type: String(row[4] || ''),
      });
    }
  }

  return res.json({
    success: true,
    data: {
      worker: {
        id: String(empRow.id),
        name: String(empRow.name),
        lat: workerLat,
        lng: workerLng,
      },
      date,
      tasks,
    },
  });
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
