/**
 * 排班管理路由
 *
 * Phase 1.3: 排班管理模块
 *
 * 提供排班数据的CRUD API
 */

import { Router, Request, Response } from 'express';
import { getDatabase, saveDatabase } from '../db';

const router = Router();

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
  const { teamId, date, shift, workZone, skipOffDuty = true } = req.body || {};

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
    const workerIds = teamMembersTable
      ? teamMembersTable.values.map((row: unknown[]) => row[0] as string)
      : [];

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

    for (const workerId of workerIds) {
      if (existingWorkers.has(workerId) && skipOffDuty) {
        skipped.push({ workerId, reason: '已排班' });
        continue;
      }
      db.run(
        `INSERT INTO schedules (id, staff_id, date, shift, work_zone, team_id, team_name, status, version, create_time, update_time)
         VALUES (?, ?, ?, ?, ?, ?, ?, '已排班', 1, datetime('now'), datetime('now'))`,
        [`batch-${Date.now()}-${workerId}`, workerId, date, shift, workZone || null, teamId, null],
      );
      created++;
    }

    saveDatabase();
    return res.json({ success: true, data: { created, skipped } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    console.error('批量按班组排班失败:', message);
    return res.status(500).json({ success: false, error: message || '批量排班失败' });
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
    const updates = req.body;
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

    // 版本号递增（乐观锁）
    fields.push('version = version + 1');
    fields.push('update_time = ?');
    values.push(now);
    values.push(id);

    if (fields.length === 0) {
      res.status(400).json({ success: false, error: '没有需要更新的字段' });
      return;
    }

    db.run(`UPDATE schedules SET ${fields.join(', ')} WHERE id = ?`, values);
    saveDatabase();

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

    db.run('DELETE FROM schedules WHERE id = ?', [id]);
    saveDatabase();

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
 */
router.get('/swap-requests/list', (req: Request, res: Response) => {
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
    const { id, requester_id, requester_name, target_id, target_name, original_date, target_date, reason } = req.body;
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
