/**
 * 排班管理路由
 *
 * Phase 1.3: 排班管理模块
 *
 * 提供排班数据的CRUD API
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';
import { refreshAvailability } from '../services/teamAvailabilityService';

const router = Router();

/**
 * 2026-09-15：排班事件触发班组可用性刷新（异步，不阻塞响应）
 * 通过 worker_team_assignments 反查工人所属班组（含主职+兼职），对每个班组刷新当天可用性
 * 失败仅日志（不抛错）—— 可用性刷新是辅助，不应阻断主流程
 */
function refreshAvailabilityForStaffAsync(staffId: string, date: string): void {
  setImmediate(() => {
    try {
      const db = getDatabase();
      const teamRes = db.exec(
        `SELECT DISTINCT team_id FROM worker_team_assignments WHERE worker_id = ? AND left_at IS NULL`,
        [staffId],
      );
      if (!teamRes[0] || teamRes[0].values.length === 0) return;
      for (const row of teamRes[0].values) {
        const teamId = String(row[0]);
        refreshAvailability(teamId, date).catch((e) => {
          console.warn(`[可用性刷新失败] team=${teamId} date=${date}:`, (e as Error).message);
        });
      }
    } catch (e) {
      console.warn(`[可用性刷新异常] staff=${staffId} date=${date}:`, (e as Error).message);
    }
  });
}

/**
 * 2026-09-15：直接按班组触发可用性刷新（用于 batch-by-team 路径，已有 teamId）
 */
function refreshAvailabilityForTeamAsync(teamId: string, date: string): void {
  setImmediate(() => {
    refreshAvailability(teamId, date).catch((e) => {
      console.warn(`[可用性刷新失败] team=${teamId} date=${date}:`, (e as Error).message);
    });
  });
}

/**
 * 获取排班列表
 * GET /api/schedules
 */
router.get('/', (req: Request, res: Response) => {
  try {
    const { date, staff_id, start_date, end_date, page = '1', limit = '100' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM schedules WHERE 1=1';
    const params: any[] = [];

    if (date) {
      sql += ' AND date = ?';
      params.push(date);
    }

    if (staff_id) {
      sql += ' AND staff_id = ?';
      params.push(staff_id);
    }

    if (start_date) {
      sql += ' AND date >= ?';
      params.push(start_date);
    }

    if (end_date) {
      sql += ' AND date <= ?';
      params.push(end_date);
    }

    sql += ' ORDER BY date DESC, staff_id';

    // 分页
    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const schedules = db.exec(sql, params);
    const records = schedules.length > 0 ? schedules[0].values.map((row: any) => {
      const columns = schedules[0].columns;
      return columns.reduce((obj: any, col: string, idx: number) => {
        obj[col] = row[idx];
        return obj;
      }, {});
    }) : [];

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM schedules WHERE 1=1';
    const countParams: any[] = [];
    if (date) { countSql += ' AND date = ?'; countParams.push(date); }
    if (staff_id) { countSql += ' AND staff_id = ?'; countParams.push(staff_id); }
    if (start_date) { countSql += ' AND date >= ?'; countParams.push(start_date); }
    if (end_date) { countSql += ' AND date <= ?'; countParams.push(end_date); }

    const countResult = db.exec(countSql, countParams);
    const total = countResult.length > 0 && countResult[0].values[0][0] ? Number(countResult[0].values[0][0]) : 0;

    res.json({
      success: true,
      data: records,
      meta: {
        total,
        page: Number(page),
        limit: Number(limit),
        totalPages: Math.ceil(total / Number(limit)),
      },
    });
  } catch (error) {
    console.error('获取排班列表失败:', error);
    res.status(500).json({ success: false, error: '获取排班列表失败' });
  }
});

/**
 * 获取单个排班
 * GET /api/schedules/:id
 */

// ==================== 排班-派工联动 API（必须在 :id 之前注册，否则会被 :id 匹配） ====================
// 2026-07-29 排班调度与智能派工双向联动 — BATCH 1 后端基础设施

/**
 * 工具：把 sql.js db.exec 结果转成对象数组
 */
function rowsToObjects(result: any[]): any[] {
  if (!result || result.length === 0 || result[0].values.length === 0) return [];
  const columns = result[0].columns;
  return result[0].values.map((row: any[]) =>
    columns.reduce((obj: any, col: string, idx: number) => {
      obj[col] = row[idx];
      return obj;
    }, {})
  );
}

/**
 * GET /api/schedules/occupations?date=YYYY-MM-DD
 *
 * 聚合当日所有员工 + 当日所有已派发任务的占用情况。
 * 用于智能派工侧展示员工排班状态（on_duty/off_duty/no_schedule），
 * 以及排班日历侧显示当日已派任务数（角标）。
 *
 * 字段命名：响应走 camelCaseResponse 中间件，前端拿到的会是 camelCase。
 */
router.get('/occupations', (req: Request, res: Response) => {
  const { date, teamId } = req.query;
  if (!date || typeof date !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'date 参数格式错误 (YYYY-MM-DD)' });
  }
  // 校验日期值合法性：防 2026-13-45 / 2026-02-30 等非法日期
  const parsed = new Date(date);
  if (isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) {
    return res.status(400).json({ success: false, error: 'date 参数值非法（如 2026-13-45）' });
  }

  try {
    const db = getDatabase();

    // 0. 如果传 teamId，先查班组 worker 池；空班组直接返回空 workers
    let workerFilterIds: string[] | null = null;
    if (teamId && typeof teamId === 'string') {
      const teamMembersResult = db.exec(
        'SELECT worker_id FROM team_members WHERE team_id = ?',
        [teamId],
      );
      const teamMembersTable = Array.isArray(teamMembersResult)
        ? teamMembersResult[0]
        : teamMembersResult;
      workerFilterIds = teamMembersTable
        ? teamMembersTable.values.map((row: unknown[]) => row[0] as string)
        : [];

      if (workerFilterIds.length === 0) {
        return res.json({ success: true, data: { date, workers: [] } });
      }
    }

    // 构造 staff_id IN (...) 子句复用片段
    const staffInClause = workerFilterIds
      ? ` AND staff_id IN (${workerFilterIds.map(() => '?').join(',')})`
      : '';
    const assigneeInClause = workerFilterIds
      ? ` AND assignee_id IN (${workerFilterIds.map(() => '?').join(',')})`
      : '';
    const baseParams = workerFilterIds ? [date, ...workerFilterIds] : [date];

    // 1. 当日排班
    const scheduleExec = db.exec(
      `SELECT id, staff_id, staff_name, work_zone, shift, status, dispatched_task_ids
         FROM schedules
        WHERE date = ?${staffInClause}`,
      baseParams
    );
    const scheduleRows = rowsToObjects(scheduleExec);

    // 2. 当日已派发的农事任务（farm_tasks.plan_date 是 TEXT 存 YYYY-MM-DD）
    const farmTaskExec = db.exec(
      `SELECT id, task_code, task_title, task_type, priority, status, assignee_id, assignee_name, estimated_hours
         FROM farm_tasks
        WHERE plan_date = ?
          AND status IN ('pending', 'accepted', 'in_progress')
          AND assignee_id IS NOT NULL
          AND assignee_id != ''${assigneeInClause}`,
      baseParams
    );
    const farmTasks = rowsToObjects(farmTaskExec);

    // 3. 当日已派发的临时任务（temp_tasks.request_date 是 TEXT 存 YYYY-MM-DD）
    const tempTaskExec = db.exec(
      `SELECT id, task_code, task_title, task_type, priority, status, assignee_id, assignee_name, estimated_hours
         FROM temp_tasks
        WHERE request_date = ?
          AND status IN ('pending', 'accepted', 'in_progress')
          AND assignee_id IS NOT NULL
          AND assignee_id != ''${assigneeInClause}`,
      baseParams
    );
    const tempTasks = rowsToObjects(tempTaskExec);

    // 4. 合并员工 + 任务清单
    const allTasks: any[] = [...farmTasks, ...tempTasks];
    const workerMap = new Map<string, any>();

    // 4a. 有排班的员工先初始化
    scheduleRows.forEach((row: any) => {
      let dispatchedIds: string[] = [];
      try {
        dispatchedIds = JSON.parse(row.dispatched_task_ids || '[]');
      } catch {
        dispatchedIds = [];
      }
      const tasks = dispatchedIds
        .map((id: string) => allTasks.find((t: any) => t.id === id))
        .filter(Boolean);

      workerMap.set(row.staff_id, {
        workerId: row.staff_id,
        workerName: row.staff_name,
        workZone: row.work_zone || '',
        scheduleStatus:
          row.status === '已排班' || row.status === '已执行' ? 'on_duty' : 'off_duty',
        shift: row.shift || '',
        assignedTaskCount: tasks.length,
        totalAssignedHours: tasks.reduce(
          (s: number, t: any) => s + (Number(t.estimated_hours) || 0),
          0
        ),
        tasks: tasks.map((t: any) => ({
          taskId: t.id,
          source: farmTasks.find((f: any) => f.id === t.id) ? 'farm' : 'tempTask',
          taskCode: t.task_code,
          title: t.task_title,
          priority: t.priority,
          status: t.status,
        })),
      });
    });

    // 4b. 无排班但有任务的员工（no_schedule）
    allTasks.forEach((t: any) => {
      if (!workerMap.has(t.assignee_id)) {
        workerMap.set(t.assignee_id, {
          workerId: t.assignee_id,
          workerName: t.assignee_name,
          workZone: '',
          scheduleStatus: 'no_schedule',
          shift: '',
          assignedTaskCount: 1,
          totalAssignedHours: Number(t.estimated_hours) || 0,
          tasks: [
            {
              taskId: t.id,
              source: farmTasks.find((f: any) => f.id === t.id) ? 'farm' : 'tempTask',
              taskCode: t.task_code,
              title: t.task_title,
              priority: t.priority,
              status: t.status,
            },
          ],
        });
      } else {
        // 已有排班的员工补加任务（派发时间晚于排班写入）
        const occ = workerMap.get(t.assignee_id);
        if (!occ.tasks.find((ot: any) => ot.taskId === t.id)) {
          occ.tasks.push({
            taskId: t.id,
            source: farmTasks.find((f: any) => f.id === t.id) ? 'farm' : 'tempTask',
            taskCode: t.task_code,
            title: t.task_title,
            priority: t.priority,
            status: t.status,
          });
          occ.assignedTaskCount = occ.tasks.length;
          occ.totalAssignedHours += Number(t.estimated_hours) || 0;
        }
      }
    });

    return res.json({
      success: true,
      data: { date, workers: Array.from(workerMap.values()) },
    });
  } catch (err) {
    console.error('获取排班占用聚合失败:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '获取排班占用聚合失败',
    });
  }
});

/**
 * PATCH /api/schedules/dispatch-tasks
 * Body: { workerId, taskId, action: 'add' | 'remove' }
 *
 * 派发/取消派发时同步 schedules.dispatched_task_ids 数组。
 * 如果员工当日无排班记录，返回 200 + warning（前端继续主流程）。
 */
router.patch('/dispatch-tasks', (req: Request, res: Response) => {
  const { workerId, taskId, action, date: reqDate } = req.body;

  if (!workerId || !taskId || !['add', 'remove'].includes(action)) {
    return res.status(400).json({ success: false, error: '参数错误' });
  }

  // 使用本地日期作为默认值（utc-timezone-id-bug 教训）；caller 可通过 reqDate 指定任务的 plan_date，
  // 避免明天/后天任务被错误同步到当天排班行（Batch 1 review Issue 1）
  const now = new Date();
  const pad = (n: number) => String(n).padStart(2, '0');
  const localToday = `${now.getFullYear()}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
  const date = typeof reqDate === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(reqDate) ? reqDate : localToday;

  try {
    const db = getDatabase();

    const lookup = db.exec(
      'SELECT id, dispatched_task_ids FROM schedules WHERE staff_id = ? AND date = ? LIMIT 1',
      [workerId, date]
    );
    const rows = rowsToObjects(lookup);

    if (rows.length === 0) {
      return res.json({
        success: true,
        warning: `员工当日（${date}）无排班记录，未写入 dispatched_task_ids`,
      });
    }

    const row = rows[0];
    let ids: string[] = [];
    try {
      ids = JSON.parse(row.dispatched_task_ids || '[]');
    } catch {
      ids = [];
    }

    const newIds =
      action === 'add'
        ? Array.from(new Set([...ids, taskId]))
        : ids.filter((id) => id !== taskId);

    db.run('UPDATE schedules SET dispatched_task_ids = ? WHERE id = ?', [
      JSON.stringify(newIds),
      row.id,
    ]);
    saveDatabase();

    return res.json({
      success: true,
      data: { workerId, taskId, action, date, dispatchedTaskIds: newIds },
    });
  } catch (err) {
    console.error('同步派发任务失败:', err);
    return res.status(500).json({
      success: false,
      error: err instanceof Error ? err.message : '同步派发任务失败',
    });
  }
});

/**
 * POST /api/schedules/batch-by-team
 * 为整个班组批量创建某日某班次的排班，并跳过已排班工人。
 */
router.post('/batch-by-team', (req: Request, res: Response) => {
  const { teamId, date, shift, workZone, skipOffDuty = true, workerIds: inputWorkerIds } = req.body || {};

  // 校验批量排班的必填参数和日期格式。
  if (!teamId || !date || !shift) {
    return res.status(400).json({ success: false, error: 'teamId/date/shift 必填' });
  }
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return res.status(400).json({ success: false, error: 'date 格式必须为 YYYY-MM-DD' });
  }

  try {
    const db = getDatabase();
    const teamMembersResult = db.exec(
      'SELECT worker_id FROM team_members WHERE team_id = ?',
      [teamId],
    );
    const teamMembersTable = Array.isArray(teamMembersResult) ? teamMembersResult[0] : teamMembersResult;
    const workerIds: string[] = Array.isArray(inputWorkerIds) && inputWorkerIds.length > 0
      ? inputWorkerIds.filter((x: unknown) => typeof x === 'string' && x.length > 0)
      : (teamMembersTable
        ? teamMembersTable.values.map((row: unknown[]) => row[0] as string)
        : []);

    if (workerIds.length === 0) {
      return res.json({ success: true, data: { created: 0, skipped: [] } });
    }

    const placeholders = workerIds.map(() => '?').join(',');
    // ★ 排班冲突检测（2026-07-31）：检测 (staff_id, date, shift) 重复，不仅是 (staff_id, date)
    const existingResult = db.exec(
      `SELECT staff_id FROM schedules WHERE date = ? AND shift = ? AND staff_id IN (${placeholders})`,
      [date, shift, ...workerIds],
    );
    const existingTable = Array.isArray(existingResult) ? existingResult[0] : existingResult;
    const existingWorkers = new Set(
      existingTable
        ? existingTable.values.map((row: unknown[]) => row[0] as string)
        : [],
    );
    let created = 0;
    const skipped: Array<{ workerId: string; reason: string }> = [];

    // 2026-09-14：补 staff_name / team_name
    const { staffNameMap, teamName } = enrichScheduleNames(db, workerIds, teamId);

    for (const workerId of workerIds) {
      if (existingWorkers.has(workerId) && skipOffDuty) {
        skipped.push({ workerId, reason: '已排班' });
        continue;
      }
      db.run(
        `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
        [`batch-${Date.now()}-${workerId}`, workerId, staffNameMap.get(workerId) || null, date, shift, workZone || null, teamId, teamName],
      );
      created++;
    }

    saveDatabase();
    // 2026-09-15：批量按班组排班后，触发该班组当天可用性刷新
    if (created > 0) {
      const date = req.body?.startDate || req.body?.date;
      if (date) refreshAvailabilityForTeamAsync(teamId, date);
    }
    return res.json({ success: true, data: { created, skipped } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('批量按班组排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
  }
});

/**
 * 日期段/周重复 共享工具（2026-09-13 新增）
 * 用于 batch-by-date-range / batch-by-team-and-date-range / batch-by-weekday / batch-by-team-and-weekday。
 */
const MAX_DATE_RANGE_DAYS = 365; // 硬限：单次请求日期跨度最多 365 天

function parseDate(s: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(s + 'T00:00:00');
  if (isNaN(d.getTime())) return null;
  return d;
}

function formatDate(d: Date): string {
  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function expandDates(startDate: string, endDate: string, weekdays?: number[]): string[] {
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end || start > end) return [];
  const result: string[] = [];
  const cursor = new Date(start);
  while (cursor <= end) {
    const day = cursor.getDay(); // 0=周日
    if (!weekdays || weekdays.length === 0 || weekdays.includes(day)) {
      result.push(formatDate(cursor));
    }
    cursor.setDate(cursor.getDate() + 1);
  }
  return result;
}

/**
 * 批量排班写入辅助（2026-09-14 修复）：从 employees/teams 表查名字，补到 INSERT
 * 返回 { staffNameMap: {staffId -> name}, teamName }
 */
function enrichScheduleNames(db: any, workerIds: string[], teamId: string | null): { staffNameMap: Map<string, string>; teamName: string | null } {
  const staffNameMap = new Map<string, string>();
  if (workerIds.length > 0) {
    const placeholders = workerIds.map(() => '?').join(',');
    const empRes = db.exec(
      `SELECT id, name FROM employees WHERE id IN (${placeholders})`,
      workerIds,
    );
    const empTable = Array.isArray(empRes) ? empRes[0] : empRes;
    if (empTable) {
      for (const row of empTable.values) {
        staffNameMap.set(row[0] as string, row[1] as string);
      }
    }
  }
  let teamName: string | null = null;
  if (teamId) {
    const tRes = db.exec('SELECT team_name FROM teams WHERE id = ?', [teamId]);
    const tTable = Array.isArray(tRes) ? tRes[0] : tRes;
    if (tTable && tTable.values.length > 0) {
      teamName = tTable.values[0][0] as string;
    }
  }
  return { staffNameMap, teamName };
}

/**
 * POST /api/schedules/batch-by-date-range
 * 单人日期段批量排班。
 */
router.post('/batch-by-date-range', (req: Request, res: Response) => {
  const { staffId, startDate, endDate, shift, workZone, skipExisting = true } = req.body || {};

  if (!staffId || !startDate || !endDate || !shift) {
    return res.status(400).json({ success: false, error: 'staffId/startDate/endDate/shift 必填' });
  }
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ success: false, error: '日期格式必须为 YYYY-MM-DD' });
  }
  if (start > end) {
    return res.status(400).json({ success: false, error: '开始日期不能晚于结束日期' });
  }
  const dates = expandDates(startDate, endDate);
  if (dates.length === 0) {
    return res.status(400).json({ success: false, error: '日期段为空' });
  }
  if (dates.length > MAX_DATE_RANGE_DAYS) {
    return res.status(400).json({ success: false, error: `日期段最多 ${MAX_DATE_RANGE_DAYS} 天` });
  }

  try {
    const db = getDatabase();
    let created = 0;
    const skipped: Array<{ date: string; reason: string }> = [];

    for (const date of dates) {
      if (skipExisting) {
        const exist = db.exec(
          'SELECT id FROM schedules WHERE staff_id = ? AND date = ? AND shift = ?',
          [staffId, date, shift],
        );
        const existTable = Array.isArray(exist) ? exist[0] : exist;
        if (existTable && existTable.values.length > 0) {
          skipped.push({ date, reason: '已排班' });
          continue;
        }
      }
      db.run(
        `INSERT INTO schedules (id, staff_id, date, shift, work_zone, status, version, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
        [`range-${Date.now()}-${date}-${staffId}`, staffId, date, shift, workZone || null],
      );
      created++;
    }
    saveDatabase();
    return res.json({
      success: true,
      data: {
        created,
        skipped,
        total: dates.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('单人日期段批量排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
  }
});

/**
 * POST /api/schedules/batch-by-team-and-date-range
 * 班组日期段批量排班。
 */
router.post('/batch-by-team-and-date-range', (req: Request, res: Response) => {
  const { teamId, startDate, endDate, shift, workZone, skipExisting = true, workerIds: inputWorkerIds } = req.body || {};

  if (!teamId || !startDate || !endDate || !shift) {
    return res.status(400).json({ success: false, error: 'teamId/startDate/endDate/shift 必填' });
  }
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ success: false, error: '日期格式必须为 YYYY-MM-DD' });
  }
  if (start > end) {
    return res.status(400).json({ success: false, error: '开始日期不能晚于结束日期' });
  }
  const dates = expandDates(startDate, endDate);
  if (dates.length === 0) {
    return res.status(400).json({ success: false, error: '日期段为空' });
  }
  if (dates.length > MAX_DATE_RANGE_DAYS) {
    return res.status(400).json({ success: false, error: `日期段最多 ${MAX_DATE_RANGE_DAYS} 天` });
  }

  try {
    const db = getDatabase();
    const teamMembersResult = db.exec(
      'SELECT worker_id FROM team_members WHERE team_id = ?',
      [teamId],
    );
    const teamMembersTable = Array.isArray(teamMembersResult) ? teamMembersResult[0] : teamMembersResult;
    const workerIds: string[] = Array.isArray(inputWorkerIds) && inputWorkerIds.length > 0
      ? inputWorkerIds.filter((x: unknown) => typeof x === 'string' && x.length > 0)
      : (teamMembersTable
        ? teamMembersTable.values.map((row: unknown[]) => row[0] as string)
        : []);

    if (workerIds.length === 0) {
      return res.json({ success: true, data: { created: 0, skipped: [], total: 0 } });
    }

    // 2026-09-14：补 staff_name / team_name
    const { staffNameMap, teamName } = enrichScheduleNames(db, workerIds, teamId);

    let created = 0;
    const skipped: Array<{ workerId: string; date: string; reason: string }> = [];

    for (const date of dates) {
      if (skipExisting) {
        const placeholders = workerIds.map(() => '?').join(',');
        const exist = db.exec(
          `SELECT staff_id FROM schedules WHERE date = ? AND shift = ? AND staff_id IN (${placeholders})`,
          [date, shift, ...workerIds],
        );
        const existTable = Array.isArray(exist) ? exist[0] : exist;
        const existingSet = new Set<string>(
          existTable ? existTable.values.map((row: unknown[]) => row[0] as string) : [],
        );
        for (const wid of workerIds) {
          if (existingSet.has(wid)) {
            skipped.push({ workerId: wid, date, reason: '已排班' });
          } else {
            db.run(
              `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
              [`teamrange-${Date.now()}-${date}-${wid}`, wid, staffNameMap.get(wid) || null, date, shift, workZone || null, teamId, teamName],
            );
            created++;
          }
        }
      } else {
        for (const wid of workerIds) {
          db.run(
            `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
            [`teamrange-${Date.now()}-${date}-${wid}`, wid, staffNameMap.get(wid) || null, date, shift, workZone || null, teamId, teamName],
          );
          created++;
        }
      }
    }
    saveDatabase();
    return res.json({
      success: true,
      data: {
        created,
        skipped,
        total: dates.length * workerIds.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('班组日期段批量排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
  }
});

/**
 * POST /api/schedules/batch-by-weekday
 * 单人周重复批量排班。
 */
router.post('/batch-by-weekday', (req: Request, res: Response) => {
  const { staffId, startDate, endDate, weekdays, shift, workZone, skipExisting = true } = req.body || {};

  if (!staffId || !startDate || !endDate || !shift || !Array.isArray(weekdays) || weekdays.length === 0) {
    return res.status(400).json({ success: false, error: 'staffId/startDate/endDate/weekdays/shift 必填' });
  }
  // 校验 weekdays：必须是 0-6 整数数组
  const validWeekdays: number[] = [];
  for (const d of weekdays as unknown[]) {
    if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6) {
      validWeekdays.push(d);
    }
  }
  if (validWeekdays.length === 0) {
    return res.status(400).json({ success: false, error: 'weekdays 必须是非空 0-6 整数数组（0=周日）' });
  }
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ success: false, error: '日期格式必须为 YYYY-MM-DD' });
  }
  if (start > end) {
    return res.status(400).json({ success: false, error: '开始日期不能晚于结束日期' });
  }
  const dates = expandDates(startDate, endDate, validWeekdays);
  if (dates.length === 0) {
    return res.status(400).json({ success: false, error: '未匹配到任何日期' });
  }
  if (dates.length > MAX_DATE_RANGE_DAYS) {
    return res.status(400).json({ success: false, error: `日期段最多 ${MAX_DATE_RANGE_DAYS} 天` });
  }

  try {
    const db = getDatabase();
    // 2026-09-14：补 staff_name
    const { staffNameMap } = enrichScheduleNames(db, [staffId], null);
    let created = 0;
    const skipped: Array<{ date: string; reason: string }> = [];

    for (const date of dates) {
      if (skipExisting) {
        const exist = db.exec(
          'SELECT id FROM schedules WHERE staff_id = ? AND date = ? AND shift = ?',
          [staffId, date, shift],
        );
        const existTable = Array.isArray(exist) ? exist[0] : exist;
        if (existTable && existTable.values.length > 0) {
          skipped.push({ date, reason: '已排班' });
          continue;
        }
      }
      db.run(
        `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, status, version, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
        [`weekday-${Date.now()}-${date}-${staffId}`, staffId, staffNameMap.get(staffId) || null, date, shift, workZone || null],
      );
      created++;
    }
    saveDatabase();
    return res.json({
      success: true,
      data: { created, skipped, total: dates.length },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('单人周重复批量排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
  }
});

/**
 * POST /api/schedules/batch-by-team-and-weekday
 * 班组周重复批量排班。
 */
router.post('/batch-by-team-and-weekday', (req: Request, res: Response) => {
  const { teamId, startDate, endDate, weekdays, shift, workZone, skipExisting = true, workerIds: inputWorkerIds } = req.body || {};

  if (!teamId || !startDate || !endDate || !shift || !Array.isArray(weekdays) || weekdays.length === 0) {
    return res.status(400).json({ success: false, error: 'teamId/startDate/endDate/weekdays/shift 必填' });
  }
  const validWeekdays: number[] = [];
  for (const d of weekdays as unknown[]) {
    if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6) {
      validWeekdays.push(d);
    }
  }
  if (validWeekdays.length === 0) {
    return res.status(400).json({ success: false, error: 'weekdays 必须是非空 0-6 整数数组（0=周日）' });
  }
  const start = parseDate(startDate);
  const end = parseDate(endDate);
  if (!start || !end) {
    return res.status(400).json({ success: false, error: '日期格式必须为 YYYY-MM-DD' });
  }
  if (start > end) {
    return res.status(400).json({ success: false, error: '开始日期不能晚于结束日期' });
  }
  const dates = expandDates(startDate, endDate, validWeekdays);
  if (dates.length === 0) {
    return res.status(400).json({ success: false, error: '未匹配到任何日期' });
  }
  if (dates.length > MAX_DATE_RANGE_DAYS) {
    return res.status(400).json({ success: false, error: `日期段最多 ${MAX_DATE_RANGE_DAYS} 天` });
  }

  try {
    const db = getDatabase();
    const teamMembersResult = db.exec(
      'SELECT worker_id FROM team_members WHERE team_id = ?',
      [teamId],
    );
    const teamMembersTable = Array.isArray(teamMembersResult) ? teamMembersResult[0] : teamMembersResult;
    const workerIds: string[] = Array.isArray(inputWorkerIds) && inputWorkerIds.length > 0
      ? inputWorkerIds.filter((x: unknown) => typeof x === 'string' && x.length > 0)
      : (teamMembersTable
        ? teamMembersTable.values.map((row: unknown[]) => row[0] as string)
        : []);

    if (workerIds.length === 0) {
      return res.json({ success: true, data: { created: 0, skipped: [], total: 0 } });
    }

    // 2026-09-14：补 staff_name / team_name
    const { staffNameMap, teamName } = enrichScheduleNames(db, workerIds, teamId);

    let created = 0;
    const skipped: Array<{ workerId: string; date: string; reason: string }> = [];

    for (const date of dates) {
      if (skipExisting) {
        const placeholders = workerIds.map(() => '?').join(',');
        const exist = db.exec(
          `SELECT staff_id FROM schedules WHERE date = ? AND shift = ? AND staff_id IN (${placeholders})`,
          [date, shift, ...workerIds],
        );
        const existTable = Array.isArray(exist) ? exist[0] : exist;
        const existingSet = new Set<string>(
          existTable ? existTable.values.map((row: unknown[]) => row[0] as string) : [],
        );
        for (const wid of workerIds) {
          if (existingSet.has(wid)) {
            skipped.push({ workerId: wid, date, reason: '已排班' });
          } else {
            db.run(
              `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
               VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
              [`teamwd-${Date.now()}-${date}-${wid}`, wid, staffNameMap.get(wid) || null, date, shift, workZone || null, teamId, teamName],
            );
            created++;
          }
        }
      } else {
        for (const wid of workerIds) {
          db.run(
            `INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
             VALUES (?, ?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
            [`teamwd-${Date.now()}-${date}-${wid}`, wid, staffNameMap.get(wid) || null, date, shift, workZone || null, teamId, teamName],
          );
          created++;
        }
      }
    }
    saveDatabase();
    return res.json({
      success: true,
      data: {
        created,
        skipped,
        total: dates.length * workerIds.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('班组周重复批量排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
  }
});

/**
 * POST /api/schedules/preview-batch
 * 批量排班预览（2026-09-13 新增）：不写入，只返回冲突计划
 *
 * 入参支持 4 种组合：
 *   - { mode: 'single', staffId, date, shift }
 *   - { mode: 'single-team', teamId, date, shift, workerIds? }
 *   - { mode: 'range', staffId|teamId, startDate, endDate, shift, workerIds? }
 *   - { mode: 'weekday', staffId|teamId, startDate, endDate, weekdays, shift, workerIds? }
 *
 * 返回：{ toCreate: number, willSkip: [{workerId, date, reason}], dates: [...] }
 */
router.post('/preview-batch', (req: Request, res: Response) => {
  const body = req.body || {};
  const { mode } = body;

  // 校验 mode
  if (!['single', 'single-team', 'range', 'weekday'].includes(mode)) {
    return res.status(400).json({ success: false, error: 'mode 必须是 single/single-team/range/weekday' });
  }

  try {
    const db = getDatabase();
    const willSkip: Array<{ workerId: string; date: string; reason: string }> = [];
    const willCreate: Array<{ workerId: string; date: string; shift: string }> = [];

    // 计算目标员工 ID 列表
    let targetWorkerIds: string[] = [];
    if (mode === 'single') {
      if (!body.staffId) return res.status(400).json({ success: false, error: 'staffId 必填' });
      targetWorkerIds = [body.staffId];
    } else {
      // 班组模式：优先用传入的 workerIds，否则查 team_members
      if (Array.isArray(body.workerIds) && body.workerIds.length > 0) {
        targetWorkerIds = body.workerIds.filter((x: unknown) => typeof x === 'string' && x.length > 0);
      } else if (body.teamId) {
        const tm = db.exec('SELECT worker_id FROM team_members WHERE team_id = ?', [body.teamId]);
        const tmTable = Array.isArray(tm) ? tm[0] : tm;
        targetWorkerIds = tmTable ? tmTable.values.map((row: unknown[]) => row[0] as string) : [];
      } else {
        return res.status(400).json({ success: false, error: 'teamId 或 workerIds 必填其一' });
      }
    }
    if (targetWorkerIds.length === 0) {
      return res.json({
        success: true,
        data: {
          toCreate: 0,
          willSkip: [],
          willCreate: [],
          total: 0,
          message: '无目标员工',
        },
      });
    }

    // 计算目标日期列表
    let targetDates: string[] = [];
    if (mode === 'single' || mode === 'single-team') {
      if (!body.date) return res.status(400).json({ success: false, error: 'date 必填' });
      targetDates = [body.date];
    } else {
      if (!body.startDate || !body.endDate) {
        return res.status(400).json({ success: false, error: 'startDate/endDate 必填' });
      }
      if (!Array.isArray(body.weekdays) || body.weekdays.length === 0) {
        targetDates = expandDates(body.startDate, body.endDate);
      } else {
        const validWeekdays: number[] = [];
        for (const d of body.weekdays as unknown[]) {
          if (typeof d === 'number' && Number.isInteger(d) && d >= 0 && d <= 6) {
            validWeekdays.push(d);
          }
        }
        targetDates = expandDates(body.startDate, body.endDate, validWeekdays);
      }
    }
    if (targetDates.length === 0) {
      return res.json({
        success: true,
        data: { toCreate: 0, willSkip: [], willCreate: [], total: 0, message: '日期范围为空' },
      });
    }

    // shift 必填
    if (!body.shift) return res.status(400).json({ success: false, error: 'shift 必填' });
    const shift = body.shift;

    // 对每个日期检测冲突
    for (const date of targetDates) {
      const placeholders = targetWorkerIds.map(() => '?').join(',');
      const exist = db.exec(
        `SELECT staff_id FROM schedules WHERE date = ? AND shift = ? AND staff_id IN (${placeholders})`,
        [date, shift, ...targetWorkerIds],
      );
      const existTable = Array.isArray(exist) ? exist[0] : exist;
      const existingSet = new Set<string>(
        existTable ? existTable.values.map((row: unknown[]) => row[0] as string) : [],
      );
      for (const wid of targetWorkerIds) {
        if (existingSet.has(wid)) {
          willSkip.push({ workerId: wid, date, reason: '已排班' });
        } else {
          willCreate.push({ workerId: wid, date, shift });
        }
      }
    }

    return res.json({
      success: true,
      data: {
        toCreate: willCreate.length,
        willSkip,
        willCreate,
        total: targetDates.length * targetWorkerIds.length,
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('预览批量排班失败:', message);
    return res.status(500).json({ success: false, error: message || '预览失败' });
  }
});

/**
 * 调班申请路由（2026-09-15：必须注册在 GET /:id 之前，否则 /swap-requests 被当成 :id='swap-requests' 匹配到 schedules 表返回「排班记录不存在」）
 */
// 获取调班申请列表
router.get('/swap-requests', (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM swap_requests WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY create_time DESC';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const result = db.exec(sql, params);
    const records = result.length > 0 ? result[0].values.map((row: any) => {
      const columns = result[0].columns;
      return columns.reduce((obj: any, col: string, idx: number) => {
        obj[col] = row[idx];
        return obj;
      }, {});
    }) : [];

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取调班申请列表失败:', error);
    res.status(500).json({ success: false, error: '获取调班申请列表失败' });
  }
});

// 提交调班申请
router.post('/swap-requests', (req: Request, res: Response) => {
  try {
    // 兼容 camelCase 和 snake_case（前端 store spread camelCase；旧逻辑用 snake_case）
    const body = req.body || {};
    const id = body.id;
    const requester_id = body.requester_id ?? body.requesterId;
    const requester_name = body.requester_name ?? body.requesterName;
    const target_id = body.target_id ?? body.targetId;
    const target_name = body.target_name ?? body.targetName;
    const original_date = body.original_date ?? body.originalDate;
    const target_date = body.target_date ?? body.targetDate;
    const reason = body.reason;
    const newId = id || `SWAP-${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO swap_requests (id, requester_id, requester_name, target_id, target_name, original_date, target_date, reason, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, requester_id, requester_name, target_id, target_name, original_date, target_date, reason, '待审批', now, now]);

    saveDatabase();

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        requester_id,
        requester_name,
        target_id,
        target_name,
        original_date,
        target_date,
        reason,
        status: '待审批',
        create_time: now,
      },
    });
  } catch (error) {
    console.error('提交调班申请失败:', error);
    res.status(500).json({ success: false, error: '提交调班申请失败' });
  }
});

// 处理调班申请
router.put('/swap-requests/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    if (!['已同意', '已拒绝'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的审批状态' });
      return;
    }

    db.run('UPDATE swap_requests SET status = ?, update_time = ? WHERE id = ?', [status, now, id]);
    saveDatabase();

    res.json({ success: true, data: { id, status } });
  } catch (error) {
    console.error('处理调班申请失败:', error);
    res.status(500).json({ success: false, error: '处理调班申请失败' });
  }
});

router.get('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    const result = db.exec('SELECT * FROM schedules WHERE id = ?', [id]);
    if (result.length === 0 || result[0].values.length === 0) {
      res.status(404).json({ success: false, error: '排班记录不存在' });
      return;
    }

    const columns = result[0].columns;
    const record = columns.reduce((obj: any, col: string, idx: number) => {
      obj[col] = result[0].values[0][idx];
      return obj;
    }, {});

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('获取排班详情失败:', error);
    res.status(500).json({ success: false, error: '获取排班详情失败' });
  }
});

/**
 * 创建排班
 * POST /api/schedules
 *
 * 向后兼容：原有字段（staff_id/staff_name/status/check_in/check_out/remarks）保持位置不变。
 * 2026-07-30 新增可选字段 team_id/team_name（排班调度 × 班组分配贯通），不传时为 null。
 */
router.post('/', (req: Request, res: Response) => {
  try {
    // 字段解构：原有字段顺序保持不变，team_id/team_name 加在末尾
    const { id, staff_id, staff_name, date, shift, work_zone, status, check_in, check_out, remarks, team_id, team_name } = req.body;
    const newId = id || `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const now = new Date().toISOString();

    const db = getDatabase();

    // ★ 排班冲突检测（2026-07-31）：同一员工同一日期同一班次不可重复排班
    const existing = db.exec(
      'SELECT id FROM schedules WHERE staff_id = ? AND date = ? AND shift = ? LIMIT 1',
      [staff_id, date, shift],
    );
    if (existing[0]?.values?.length > 0) {
      return res.status(409).json({
        success: false,
        error: `员工 ${staff_name || staff_id} 在 ${date} ${shift} 已有排班记录`,
        conflict: true,
      });
    }

    // INSERT 语句：原有列保持位置不变，team_id/team_name 列加在末尾
    db.run(`
      INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, status, check_in, check_out, remarks, version, create_time, update_time, team_id, team_name)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, staff_id, staff_name, date, shift, work_zone || null, status || '已排班', check_in || null, check_out || null, remarks || null, 1, now, now, team_id || null, team_name || null]);

    saveDatabase();
    // 2026-09-15：触发班组可用性刷新（异步）
    refreshAvailabilityForStaffAsync(staff_id, date);

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        staff_id,
        staff_name,
        date,
        shift,
        work_zone,
        status: status || '已排班',
        check_in,
        check_out,
        remarks,
        version: 1,
        create_time: now,
        update_time: now,
        team_id: team_id || null,
        team_name: team_name || null,
      },
    });
  } catch (error) {
    console.error('创建排班失败:', error);
    res.status(500).json({ success: false, error: '创建排班失败' });
  }
});

/**
 * 批量创建排班
 * POST /api/schedules/batch
 */
router.post('/batch', (req: Request, res: Response) => {
  try {
    const { schedules } = req.body;
    if (!Array.isArray(schedules) || schedules.length === 0) {
      res.status(400).json({ success: false, error: '请提供排班数据数组' });
      return;
    }

    const db = getDatabase();
    const now = new Date().toISOString();
    const insertedIds: string[] = [];

    for (const schedule of schedules) {
      // ★ 排班冲突检测（2026-07-31）：同一员工同一日期同一班次不可重复排班
      const existing = db.exec(
        'SELECT id FROM schedules WHERE staff_id = ? AND date = ? AND shift = ? LIMIT 1',
        [schedule.staff_id, schedule.date, schedule.shift],
      );
      if (existing[0]?.values?.length > 0) {
        // 跳过冲突记录，继续处理其它
        continue;
      }

      const newId = schedule.id || `SCH-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      db.run(`
        INSERT INTO schedules (id, staff_id, staff_name, date, shift, work_zone, status, remarks, version, create_time, update_time)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `, [
        newId,
        schedule.staff_id,
        schedule.staff_name,
        schedule.date,
        schedule.shift,
        schedule.work_zone || null,
        schedule.status || '已排班',
        schedule.remarks || null,
        1,
        now,
        now,
      ]);
      insertedIds.push(newId);
    }

    saveDatabase();

    res.status(201).json({
      success: true,
      data: { inserted: insertedIds, count: insertedIds.length },
    });
  } catch (error) {
    console.error('批量创建排班失败:', error);
    res.status(500).json({ success: false, error: '批量创建排班失败' });
  }
});

/**
 * 更新排班
 * PUT /api/schedules/:id
 */
router.put('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    // 2026-09-14：兼容 camelCase / snake_case 入参
    const raw = req.body || {};
    const updates = {
      staff_id: raw.staff_id ?? raw.staffId,
      staff_name: raw.staff_name ?? raw.staffName,
      date: raw.date,
      shift: raw.shift,
      work_zone: raw.work_zone ?? raw.workZone,
      status: raw.status,
      check_in: raw.check_in ?? raw.checkIn,
      check_out: raw.check_out ?? raw.checkOut,
      remarks: raw.remarks,
      // 2026-09-15：调班申请 ID 关联，调班审批通过时写入
      swap_record_id: raw.swap_record_id ?? raw.swapRecordId,
    };
    const now = new Date().toISOString();

    const db = getDatabase();

    // 先检查记录是否存在
    const checkResult = db.exec('SELECT * FROM schedules WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      res.status(404).json({ success: false, error: '排班记录不存在' });
      return;
    }

    // 构建更新SQL
    const fields: string[] = [];
    const values: any[] = [];

    if (updates.staff_id !== undefined) { fields.push('staff_id = ?'); values.push(updates.staff_id); }
    if (updates.staff_name !== undefined) { fields.push('staff_name = ?'); values.push(updates.staff_name); }
    if (updates.date !== undefined) { fields.push('date = ?'); values.push(updates.date); }
    if (updates.shift !== undefined) { fields.push('shift = ?'); values.push(updates.shift); }
    if (updates.work_zone !== undefined) { fields.push('work_zone = ?'); values.push(updates.work_zone); }
    if (updates.status !== undefined) { fields.push('status = ?'); values.push(updates.status); }
    if (updates.check_in !== undefined) { fields.push('check_in = ?'); values.push(updates.check_in); }
    if (updates.check_out !== undefined) { fields.push('check_out = ?'); values.push(updates.check_out); }
    if (updates.remarks !== undefined) { fields.push('remarks = ?'); values.push(updates.remarks); }
    // 2026-09-15：调班申请 ID 关联写入
    if (updates.swap_record_id !== undefined) { fields.push('swap_record_id = ?'); values.push(updates.swap_record_id); }

    // 版本号递增（乐观锁）
    fields.push('version = version + 1');
    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    // 2026-09-14：签到/签退后自动设 status='已执行'（仅当请求里带了 check_in 或 check_out）
    // 业务语义：员工登记了签到或签退时间，表示该班次已执行
    if ((updates.check_in !== undefined && updates.check_in) ||
        (updates.check_out !== undefined && updates.check_out)) {
      // 检查现有 status（避免覆盖"已取消"）
      const curRes = db.exec('SELECT status FROM schedules WHERE id = ?', [id]);
      const curTable = Array.isArray(curRes) ? curRes[0] : curRes;
      const curStatus = curTable && curTable.values.length > 0 ? curTable.values[0][0] as string : null;
      if (curStatus !== '已取消') {
        // 移除原 updates.status 加入 '已执行'
        const idx = fields.indexOf('status = ?');
        if (idx >= 0) {
          fields[idx] = 'status = ?';
          values[idx] = '已执行';
        } else {
          fields.push('status = ?');
          values.push('已执行');
        }
      }
    }

    db.run(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();
    // 2026-09-15：触发班组可用性刷新（异步，staff_id/date 变化时）
    const newStaffId = (updates.staff_id as string) || req.body?.staff_id;
    const newDate = (updates.date as string) || req.body?.date;
    if (newStaffId && newDate) {
      refreshAvailabilityForStaffAsync(newStaffId, newDate);
    }

    // 返回更新后的记录
    const result = db.exec('SELECT * FROM schedules WHERE id = ?', [id]);
    const columns = result[0].columns;
    const record = columns.reduce((obj: any, col: string, idx: number) => {
      obj[col] = result[0].values[0][idx];
      return obj;
    }, {});

    res.json({ success: true, data: record });
  } catch (error) {
    console.error('更新排班失败:', error);
    res.status(500).json({ success: false, error: '更新排班失败' });
  }
});

/**
 * 删除排班
 * DELETE /api/schedules/:id
 */
router.delete('/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const db = getDatabase();

    // 先检查记录是否存在
    const checkResult = db.exec('SELECT * FROM schedules WHERE id = ?', [id]);
    if (checkResult.length === 0 || checkResult[0].values.length === 0) {
      res.status(404).json({ success: false, error: '排班记录不存在' });
      return;
    }
    // 2026-09-15：取出 staff_id + date 用于触发可用性刷新
    const recordColumns = checkResult[0].columns;
    const staffIdIdx = recordColumns.indexOf('staff_id');
    const dateIdx = recordColumns.indexOf('date');
    const deletedStaffId = String(checkResult[0].values[0][staffIdIdx]);
    const deletedDate = String(checkResult[0].values[0][dateIdx]);

    db.run('DELETE FROM schedules WHERE id = ?', [id]);
    saveDatabase();
    // 2026-09-15：触发班组可用性刷新（异步）
    refreshAvailabilityForStaffAsync(deletedStaffId, deletedDate);

    res.json({ success: true, data: { id } });
  } catch (error) {
    console.error('删除排班失败:', error);
    res.status(500).json({ success: false, error: '删除排班失败' });
  }
});

/**
 * 批量删除排班
 * DELETE /api/schedules/batch
 */
router.delete('/batch', (req: Request, res: Response) => {
  try {
    const { ids } = req.body;
    if (!Array.isArray(ids) || ids.length === 0) {
      res.status(400).json({ success: false, error: '请提供要删除的ID数组' });
      return;
    }

    const db = getDatabase();
    const placeholders = ids.map(() => '?').join(',');
    db.run(`DELETE FROM schedules WHERE id IN (${placeholders})`, ids);
    saveDatabase();

    res.json({ success: true, data: { deleted: ids, count: ids.length } });
  } catch (error) {
    console.error('批量删除排班失败:', error);
    res.status(500).json({ success: false, error: '批量删除排班失败' });
  }
});

// ==================== 调班申请 API ====================

/**
 * 获取调班申请列表
 * GET /api/schedules/swap-requests
 * 2026-09-15：路径从 /swap-requests/list 改为 /swap-requests（与 POST/PUT 统一 REST 风格）
 */
router.get('/swap-requests', (req: Request, res: Response) => {
  try {
    const { status, page = '1', limit = '50' } = req.query;
    const db = getDatabase();

    let sql = 'SELECT * FROM swap_requests WHERE 1=1';
    const params: any[] = [];

    if (status) {
      sql += ' AND status = ?';
      params.push(status);
    }

    sql += ' ORDER BY create_time DESC';

    const offset = (Number(page) - 1) * Number(limit);
    sql += ` LIMIT ${Number(limit)} OFFSET ${offset}`;

    const result = db.exec(sql, params);
    const records = result.length > 0 ? result[0].values.map((row: any) => {
      const columns = result[0].columns;
      return columns.reduce((obj: any, col: string, idx: number) => {
        obj[col] = row[idx];
        return obj;
      }, {});
    }) : [];

    res.json({ success: true, data: records });
  } catch (error) {
    console.error('获取调班申请列表失败:', error);
    res.status(500).json({ success: false, error: '获取调班申请列表失败' });
  }
});

/**
 * 提交调班申请
 * POST /api/schedules/swap-requests
 */
router.post('/swap-requests', (req: Request, res: Response) => {
  try {
    // 兼容 camelCase 和 snake_case（前端 store spread camelCase；旧逻辑用 snake_case）
    const body = req.body || {};
    const id = body.id;
    const requester_id = body.requester_id ?? body.requesterId;
    const requester_name = body.requester_name ?? body.requesterName;
    const target_id = body.target_id ?? body.targetId;
    const target_name = body.target_name ?? body.targetName;
    const original_date = body.original_date ?? body.originalDate;
    const target_date = body.target_date ?? body.targetDate;
    const reason = body.reason;
    const newId = id || `SWAP-${Date.now()}`;
    const now = new Date().toISOString();

    const db = getDatabase();
    db.run(`
      INSERT INTO swap_requests (id, requester_id, requester_name, target_id, target_name, original_date, target_date, reason, status, create_time, update_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
    `, [newId, requester_id, requester_name, target_id, target_name, original_date, target_date, reason, '待审批', now, now]);

    saveDatabase();

    res.status(201).json({
      success: true,
      data: {
        id: newId,
        requester_id,
        requester_name,
        target_id,
        target_name,
        original_date,
        target_date,
        reason,
        status: '待审批',
        create_time: now,
      },
    });
  } catch (error) {
    console.error('提交调班申请失败:', error);
    res.status(500).json({ success: false, error: '提交调班申请失败' });
  }
});

/**
 * 处理调班申请
 * PUT /api/schedules/swap-requests/:id
 */
router.put('/swap-requests/:id', (req: Request, res: Response) => {
  try {
    const { id } = req.params;
    const { status } = req.body;
    const now = new Date().toISOString();

    const db = getDatabase();

    if (!['已同意', '已拒绝'].includes(status)) {
      res.status(400).json({ success: false, error: '无效的审批状态' });
      return;
    }

    db.run('UPDATE swap_requests SET status = ?, update_time = ? WHERE id = ?', [status, now, id]);
    saveDatabase();

    res.json({ success: true, data: { id, status } });
  } catch (error) {
    console.error('处理调班申请失败:', error);
    res.status(500).json({ success: false, error: '处理调班申请失败' });
  }
});

export default router;
