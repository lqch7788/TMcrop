/**
 * 农事任务排班服务
 * 提供排班相关的数据库操作
 */

import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';
import { formatLocalDateISO } from '../utils/dateUtil';

/**
 * 错误处理包装函数
 * 服务层所有函数使用此函数统一处理错误
 */
function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) {
    throw new Error(`${operation}失败: ${error.message}`);
  }
  throw new Error(`${operation}失败: 未知错误`);
}

/**
 * 农事任务排班记录
 */
export interface FarmTaskSchedule {
  id: string;
  task_id: string;
  worker_id: string;
  worker_name: string;
  team_id: string | null;
  team_name: string | null;
  plan_date: string;
  plan_start: string | null;
  plan_end: string | null;
  shift_type: string;
  /** 班次名称（JOIN shifts 表得出，2026-10-20 新增） */
  shift_name?: string | null;
  status: string;
  remarks: string | null;
  created_at: string;
  updated_at: string;
}

/**
 * 创建排班输入参数
 */
export interface CreateScheduleInput {
  taskId: string;
  workerId: string;
  workerName: string;
  teamId?: string;
  teamName?: string;
  planDate: string;
  planStart?: string;
  planEnd?: string;
  shiftType?: string;
  status?: string;
  remarks?: string;
}

/**
 * 排班查询过滤器
 */
export interface ScheduleFilters {
  date?: string;
  workerId?: string;
  teamId?: string;
  status?: string;
}

/**
 * 获取排班列表
 * @param filters - 查询过滤条件
 * @returns 排班记录列表
 */
export async function getSchedules(filters: ScheduleFilters = {}): Promise<FarmTaskSchedule[]> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT fts.*, ft.title as task_title, ft.task_code, s.shift_name
      FROM farm_task_schedules fts
      LEFT JOIN farm_tasks ft ON fts.task_id = ft.id
      LEFT JOIN shifts s ON fts.shift_type = s.shift_code
      WHERE 1=1
    `;
    const params: any[] = [];

    if (filters.date) {
      sql += ' AND fts.plan_date = ?';
      params.push(filters.date);
    }
    if (filters.workerId) {
      sql += ' AND fts.worker_id = ?';
      params.push(filters.workerId);
    }
    if (filters.teamId) {
      sql += ' AND fts.team_id = ?';
      params.push(filters.teamId);
    }
    if (filters.status) {
      sql += ' AND fts.status = ?';
      params.push(filters.status);
    }

    sql += ' ORDER BY fts.plan_date DESC, fts.plan_start ASC';

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const schedules: FarmTaskSchedule[] = [];
    while (stmt.step()) {
      schedules.push(stmt.getAsObject() as unknown as FarmTaskSchedule);
    }
    stmt.free();

    return schedules;
  } catch (error) {
    return handleServiceError(error, '获取排班列表');
  }
}

/**
 * 获取待排班任务（已派工但未排班的农事任务）
 * @returns 待排班任务列表
 */
export async function getUnscheduledTasks(date?: string): Promise<any[]> {
  try {
    const db = getDatabase();

    // 2026-10-22（审核 P3-5）：
    //   · 传入 date 时按 plan_date 收敛（深链 ?date=…&taskId=… 用），不传保持原行为；
    //   · JOIN 条件补 `status <> 'cancelled'` —— 任务被取消后排班行会被置 cancelled，
    //     原 `fts.id IS NULL` 会因为仍存在 cancelled 行而不成立，任务永远进不了待排班列表。
    let sql = `
      SELECT ft.*
      FROM farm_tasks ft
      LEFT JOIN farm_task_schedules fts
        ON ft.id = fts.task_id AND fts.status <> 'cancelled'
      WHERE ft.status IN ('pending', 'accepted')
        AND ft.assignee_id IS NOT NULL
        AND ft.assignee_id <> ''
        AND fts.id IS NULL
    `;
    const params: any[] = [];
    if (date) {
      sql += ' AND ft.plan_date = ?';
      params.push(date);
    }
    sql += ' ORDER BY ft.plan_date ASC, ft.plan_time ASC';

    const stmt = db.prepare(sql);
    if (params.length > 0) stmt.bind(params);

    const tasks: any[] = [];
    while (stmt.step()) {
      tasks.push(stmt.getAsObject());
    }
    stmt.free();

    return tasks;
  } catch (error) {
    return handleServiceError(error, '获取待排班任务');
  }
}

/**
 * 获取单个排班详情
 * @param id - 排班ID
 * @returns 排班记录或null
 */
export async function getScheduleById(id: string): Promise<FarmTaskSchedule | null> {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT fts.*, ft.title as task_title, ft.task_code, s.shift_name
      FROM farm_task_schedules fts
      LEFT JOIN farm_tasks ft ON fts.task_id = ft.id
      LEFT JOIN shifts s ON fts.shift_type = s.shift_code
      WHERE fts.id = ?
    `);
    stmt.bind([id]);

    if (stmt.step()) {
      const result = stmt.getAsObject() as unknown as FarmTaskSchedule;
      stmt.free();
      return result;
    }
    stmt.free();
    return null;
  } catch (error) {
    return handleServiceError(error, '获取排班详情');
  }
}

/**
 * 创建排班
 * @param input - 创建排班输入参数
 * @returns 创建的排班记录
 */
export async function createSchedule(input: CreateScheduleInput): Promise<FarmTaskSchedule> {
  try {
    const db = getDatabase();
    const id = generateId();
    const now = new Date().toISOString();

    db.run(`
      INSERT INTO farm_task_schedules (
        id, task_id, worker_id, worker_name, team_id, team_name,
        plan_date, plan_start, plan_end, shift_type, status, remarks,
        created_at, updated_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)
    `, [
      id,
      input.taskId,
      input.workerId,
      input.workerName,
      input.teamId || null,
      input.teamName || null,
      input.planDate,
      input.planStart || null,
      input.planEnd || null,
      // 2026-10-20：shift_type 改存 shifts 表的 shift_code（SH001/SH002/SH003），
      //   不再回落到硬编码 'day'（那不是合法 shift_code，会往库里写脏值）
      input.shiftType || null,
      input.remarks || null,
      now,
      now,
    ]);

    saveDatabase();

    return (await getScheduleById(id)) as FarmTaskSchedule;
  } catch (error) {
    return handleServiceError(error, '创建排班');
  }
}

/**
 * 更新排班
 * @param id - 排班ID
 * @param updates - 更新内容
 * @returns 更新后的排班记录或null
 */
export async function updateSchedule(
  id: string,
  updates: Partial<CreateScheduleInput>
): Promise<FarmTaskSchedule | null> {
  try {
    const existing = await getScheduleById(id);
    if (!existing) return null;

    const db = getDatabase();
    const now = new Date().toISOString();

    db.run(`
      UPDATE farm_task_schedules SET
        worker_id = ?,
        worker_name = ?,
        team_id = ?,
        team_name = ?,
        plan_date = ?,
        plan_start = ?,
        plan_end = ?,
        shift_type = ?,
        status = ?,
        remarks = ?,
        updated_at = ?
      WHERE id = ?
    `, [
      updates.workerId || existing.worker_id,
      updates.workerName || existing.worker_name,
      updates.teamId ?? existing.team_id,
      updates.teamName ?? existing.team_name,
      updates.planDate || existing.plan_date,
      updates.planStart ?? existing.plan_start,
      updates.planEnd ?? existing.plan_end,
      updates.shiftType || existing.shift_type,
      updates.status || existing.status,
      updates.remarks ?? existing.remarks,
      now,
      id,
    ]);

    saveDatabase();

    return getScheduleById(id);
  } catch (error) {
    return handleServiceError(error, '更新排班');
  }
}

/**
 * 删除排班
 * @param id - 排班ID
 */
export async function deleteSchedule(id: string): Promise<void> {
  try {
    const db = getDatabase();
    db.run('DELETE FROM farm_task_schedules WHERE id = ?', [id]);
    saveDatabase();
  } catch (error) {
    return handleServiceError(error, '删除排班');
  }
}

/**
 * 检查排班冲突
 * @param workerId - 工人ID
 * @param planDate - 计划日期
 * @param excludeScheduleId - 排除的排班ID（用于更新时排除自身）
 * @returns 冲突的排班列表
 */
export async function checkConflicts(
  workerId: string,
  planDate: string,
  excludeScheduleId?: string
): Promise<FarmTaskSchedule[]> {
  try {
    const db = getDatabase();

    let sql = `
      SELECT * FROM farm_task_schedules
      WHERE worker_id = ? AND plan_date = ?
    `;
    const params: any[] = [workerId, planDate];

    if (excludeScheduleId) {
      sql += ' AND id != ?';
      params.push(excludeScheduleId);
    }

    sql += " AND status NOT IN ('cancelled')";

    const stmt = db.prepare(sql);
    stmt.bind(params);

    const conflicts: FarmTaskSchedule[] = [];
    while (stmt.step()) {
      conflicts.push(stmt.getAsObject() as unknown as FarmTaskSchedule);
    }
    stmt.free();

    return conflicts;
  } catch (error) {
    return handleServiceError(error, '检查排班冲突');
  }
}

/**
 * 班次配置（shifts 表 —— 班次字典的唯一数据源）
 */
export interface ShiftOption {
  shift_code: string;
  shift_name: string;
  start_time: string | null;
  end_time: string | null;
}

/**
 * 按 shift_code 取班次
 * @param code - 班次编码（SH001/SH002/...）
 */
export async function getShiftByCode(code: string): Promise<ShiftOption | null> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT shift_code, shift_name, start_time, end_time
      FROM shifts
      WHERE shift_code = ?
      LIMIT 1
    `);
    stmt.bind([code]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as ShiftOption;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (error) {
    return handleServiceError(error, '读取班次');
  }
}

/**
 * 取默认班次：shifts 表中第一个启用的班次（按开始时间升序）
 *
 * 用途：派工后自动排班、以及批量分配未指定班次时兜底 ——
 * 保证写入的 shift_type 一定是合法 shift_code，不再落 NULL。
 */
export async function getDefaultShift(): Promise<ShiftOption | null> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`
      SELECT shift_code, shift_name, start_time, end_time
      FROM shifts
      WHERE status != 'deleted'
      ORDER BY start_time ASC
      LIMIT 1
    `);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as ShiftOption;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (error) {
    return handleServiceError(error, '读取默认班次');
  }
}

/**
 * 派工后自动排班（幂等）
 *
 * 业务背景：「待排班任务」列表的口径是"已派工 且 该任务在 farm_task_schedules
 * 里没有任何排班记录"。农事任务中心派工成功只写 farm_tasks.assignee_id，
 * 任务就会一直堆在待排班列表里排不掉。本函数在派工后自动补一条排班记录，
 * 让"派工 → 排班"闭环。
 *
 * 规则：
 *  1. 幂等 —— 同一 taskId 重复调用不会产生第二条排班；
 *  2. 已有排班时只更新执行人 / 班组，**保留**用户手排的日期与班次（不覆盖人工安排）；
 *  3. 无排班时按 planDate（入参 → 任务 plan_date → 今天）+ 默认班次新建；
 *  4. 冲突 —— 该执行人在目标日期已有其它排班则跳过并返回原因，不静默覆盖。
 */
export interface AutoAssignInput {
  taskId: string;
  workerId: string;
  workerName?: string;
  planDate?: string;
  teamId?: string | null;
  teamName?: string | null;
  shiftType?: string | null;
}

export interface AutoAssignResult {
  /** 是否新建了一条排班 */
  created: boolean;
  /** 是否更新了已有排班的执行人 */
  updated: boolean;
  /** 排班记录（created/updated 为 true 时有值） */
  schedule: FarmTaskSchedule | null;
  /** 跳过原因 */
  reason?: string;
}

/** 自动排班时读取的任务字段（服务端权威口径） */
interface FarmTaskAutoAssignRow {
  id: string;
  plan_date: string | null;
  team_id: string | null;
  team_name: string | null;
  assignee_id: string | null;
  assignee_name: string | null;
}

/**
 * 把派工用的执行人标识归一化成 employees.id
 *
 * 背景：farm_tasks.assignee_id 存在多套 ID 体系并存的历史问题
 *   （EMP_001 属 employees.id；EMP_98404 / W38406 是姓名哈希；user-admin 是登录账号 oid），
 *   而 farm_task_schedules.worker_id 外键指向 employees(id)，且服务启动时
 *   `PRAGMA foreign_keys = ON` —— 直接把 assignee_id 当 worker_id 写会外键失败。
 *
 * 归一化顺序：worker_id 命中 employees.id → worker_name 命中 employees.name → 失败。
 *
 * @param workerId - 派工侧的执行人标识
 * @param workerName - 执行人姓名（第二层兜底）
 * @returns 归一化后的 employees.id / 姓名；无法归一化时返回 null
 */
export async function resolveEmployeeId(
  workerId: string,
  workerName?: string
): Promise<{ id: string; name: string } | null> {
  try {
    const db = getDatabase();

    if (workerId) {
      const byId = db.prepare('SELECT id, name FROM employees WHERE id = ? LIMIT 1');
      byId.bind([workerId]);
      if (byId.step()) {
        const row = byId.getAsObject() as { id: string; name: string };
        byId.free();
        return row;
      }
      byId.free();
    }

    if (workerName) {
      const byName = db.prepare(
        "SELECT id, name FROM employees WHERE name = ? AND status = 'active' LIMIT 1"
      );
      byName.bind([workerName]);
      if (byName.step()) {
        const row = byName.getAsObject() as { id: string; name: string };
        byName.free();
        return row;
      }
      byName.free();
    }

    return null;
  } catch (error) {
    return handleServiceError(error, '归一化执行人');
  }
}

export async function autoAssignSchedule(input: AutoAssignInput): Promise<AutoAssignResult> {
  try {
    const db = getDatabase();

    // 1. 取任务（服务端权威：plan_date / team_id / team_name / assignee）
    const taskStmt = db.prepare(
      'SELECT id, plan_date, team_id, team_name, assignee_id, assignee_name FROM farm_tasks WHERE id = ?'
    );
    taskStmt.bind([input.taskId]);
    let task: FarmTaskAutoAssignRow | null = null;
    if (taskStmt.step()) task = taskStmt.getAsObject() as unknown as FarmTaskAutoAssignRow;
    taskStmt.free();

    if (!task) {
      return { created: false, updated: false, schedule: null, reason: '农事任务不存在' };
    }

    // 2. 执行人归一化到 employees.id（外键约束要求），失败则跳过（不产生孤儿排班）
    const employee = await resolveEmployeeId(
      input.workerId || task.assignee_id || '',
      input.workerName || task.assignee_name || ''
    );
    if (!employee) {
      return {
        created: false,
        updated: false,
        schedule: null,
        reason: '执行人不在员工档案中，无法自动排班，请到「排班调度 → 任务排班」手动安排',
      };
    }
    const workerId = employee.id;
    const workerName = employee.name;

    // 3. 班次：入参 → 默认班次（保证 shift_type 落的是合法 shift_code）
    const defaultShift = input.shiftType ? null : await getDefaultShift();
    const shiftCode = input.shiftType || defaultShift?.shift_code || null;
    const shiftCfg = shiftCode ? await getShiftByCode(shiftCode) : null;

    const teamId = input.teamId ?? task.team_id ?? null;
    const teamName = input.teamName ?? task.team_name ?? null;

    // 4. 幂等：该任务已有的排班（按 task_id 找）
    const existStmt = db.prepare('SELECT * FROM farm_task_schedules WHERE task_id = ? LIMIT 1');
    existStmt.bind([input.taskId]);
    let existing: FarmTaskSchedule | null = null;
    if (existStmt.step()) existing = existStmt.getAsObject() as unknown as FarmTaskSchedule;
    existStmt.free();

    if (existing) {
      // 已有排班：只更新执行人 / 班组，保留人工排好的日期与班次
      // 冲突检查：该执行人在**排班当天**已有别的任务排班 → 跳过
      const conflicts = await checkConflicts(workerId, existing.plan_date, existing.id);
      if (conflicts.length > 0) {
        return { created: false, updated: false, schedule: null, reason: '该执行人在同日已有其它排班' };
      }
      const now = new Date().toISOString();
      db.run(
        `UPDATE farm_task_schedules
         SET worker_id = ?, worker_name = ?, team_id = ?, team_name = ?, updated_at = ?
         WHERE id = ?`,
        [workerId, workerName, teamId, teamName, now, existing.id],
      );
      saveDatabase();
      return { created: false, updated: true, schedule: await getScheduleById(existing.id) };
    }

    // 5. 新建：目标日期 = 入参 → 任务 plan_date → 今天（本地日期，不用 UTC）
    const planDate = (input.planDate || task.plan_date || formatLocalDateISO()).slice(0, 10);

    // 冲突检查：同一执行人同一天不能有两班
    const conflicts = await checkConflicts(workerId, planDate);
    if (conflicts.length > 0) {
      return { created: false, updated: false, schedule: null, reason: '该执行人在同日已有排班' };
    }

    const id = generateId();
    const now = new Date().toISOString();
    db.run(
      `INSERT INTO farm_task_schedules (
         id, task_id, worker_id, worker_name, team_id, team_name,
         plan_date, plan_start, plan_end, shift_type, status, remarks,
         created_at, updated_at
       ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, 'scheduled', ?, ?, ?)`,
      [
        id,
        input.taskId,
        workerId,
        workerName,
        teamId,
        teamName,
        planDate,
        shiftCfg?.start_time ?? null,
        shiftCfg?.end_time ?? null,
        shiftCode,
        '派工后自动生成',
        now,
        now,
      ],
    );
    saveDatabase();
    return { created: true, updated: false, schedule: await getScheduleById(id) };
  } catch (error) {
    return handleServiceError(error, '自动排班');
  }
}
