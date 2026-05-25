/**
 * 农事任务排班服务
 * 提供排班相关的数据库操作
 */

import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';

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
      SELECT fts.*, ft.title as task_title, ft.task_code
      FROM farm_task_schedules fts
      LEFT JOIN farm_tasks ft ON fts.task_id = ft.id
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
export async function getUnscheduledTasks(): Promise<any[]> {
  try {
    const db = getDatabase();

    const stmt = db.prepare(`
      SELECT ft.*
      FROM farm_tasks ft
      LEFT JOIN farm_task_schedules fts ON ft.id = fts.task_id
      WHERE ft.status IN ('pending', 'accepted')
        AND ft.assignee_id IS NOT NULL
        AND fts.id IS NULL
      ORDER BY ft.plan_date ASC, ft.plan_time ASC
    `);

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
      SELECT fts.*, ft.title as task_title, ft.task_code
      FROM farm_task_schedules fts
      LEFT JOIN farm_tasks ft ON fts.task_id = ft.id
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
      input.shiftType || 'day',
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
