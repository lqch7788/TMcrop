/**
 * 班组可用性日历服务（2026-09-15 Phase 2 - #8 可用性日历）
 *
 * 数据流：排班事件触发 → refreshAvailability(teamId, date)
 * 读路径：派工推荐实时聚合 schedules 表
 */
import { getDatabase } from '../db';
import { generateId } from '../utils/id';

function handleServiceError(error: unknown, operation: string): never {
  console.error(`${operation}失败:`, error);
  if (error instanceof Error) throw new Error(`${operation}失败: ${error.message}`);
  throw new Error(`${operation}失败: 未知错误`);
}

export interface TeamDailyAvailability {
  id: string;
  team_id: string;
  date: string;
  available_hours: number;
  busy_hours: number;
  on_leave_count: number;
  scheduled_worker_count: number;
  total_worker_count: number;
  updated_at: string;
}

/**
 * 刷新（重算）某班组某天的可用性
 * 数据源：
 *   - busy_hours = 该组所有成员当天的 schedules 班次时长合计
 *   - total_worker_count = 该组当前成员数（team_members where left_at IS NULL）
 *   - available_hours = total_worker_count × 8 - busy_hours
 *   - on_leave_count: 暂留 0（未来接入考勤）
 */
export async function refreshAvailability(teamId: string, date: string): Promise<TeamDailyAvailability> {
  try {
    const db = getDatabase();
    // 1. 该组成员数（含主职+兼职）
    const memberRes = db.exec(
      `SELECT COUNT(DISTINCT worker_id) AS c FROM worker_team_assignments WHERE team_id = ? AND left_at IS NULL`,
      [teamId],
    );
    const total_worker_count = (memberRes[0]?.values?.[0]?.[0] as number) || 0;

    // 2. 该组当日所有排班的 busy_hours
    const shiftsRes = db.exec(
      `SELECT s.shift, s.staff_id FROM schedules s
       JOIN worker_team_assignments wta ON wta.worker_id = s.staff_id
       WHERE wta.team_id = ? AND wta.left_at IS NULL AND s.date = ?`,
      [teamId, date],
    );
    let busy_hours = 0;
    const uniqueWorkers = new Set<string>();
    if (shiftsRes[0]) {
      for (const row of shiftsRes[0].values) {
        const shiftName = row[0] as string;
        const workerId = row[1] as string;
        uniqueWorkers.add(workerId);
        // 2026-09-15：每次循环重新 prepare（sql.js 的 prepared statement bind 后 step 一次需 reset 才能复用）
        const shiftHoursStmt = db.prepare(`SELECT shift_name, start_time, end_time FROM shifts WHERE shift_name = ?`);
        shiftHoursStmt.bind([shiftName]);
        if (shiftHoursStmt.step()) {
          const r = shiftHoursStmt.getAsObject() as { start_time: string; end_time: string };
          const [sh, sm] = r.start_time.split(':').map(Number);
          const [eh, em] = r.end_time.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60; // 跨日班处理
          busy_hours += Math.round(mins / 60);
        }
        shiftHoursStmt.free();
      }
    }
    const available_hours = Math.max(0, total_worker_count * 8 - busy_hours);
    const scheduled_worker_count = uniqueWorkers.size;

    // 3. upsert
    const id = generateId('TDA');
    const now = new Date().toISOString();
    const existingRes = db.exec(
      `SELECT id FROM team_daily_availability WHERE team_id = ? AND date = ?`,
      [teamId, date],
    );
    const existingId = existingRes[0]?.values?.[0]?.[0] as string | undefined;
    if (existingId) {
      db.run(
        `UPDATE team_daily_availability SET available_hours=?, busy_hours=?, on_leave_count=?, scheduled_worker_count=?, total_worker_count=?, updated_at=? WHERE id=?`,
        [available_hours, busy_hours, 0, scheduled_worker_count, total_worker_count, now, existingId],
      );
      return { id: existingId, team_id: teamId, date, available_hours, busy_hours, on_leave_count: 0, scheduled_worker_count, total_worker_count, updated_at: now };
    } else {
      db.run(
        `INSERT INTO team_daily_availability (id, team_id, date, available_hours, busy_hours, on_leave_count, scheduled_worker_count, total_worker_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, teamId, date, available_hours, busy_hours, 0, scheduled_worker_count, total_worker_count, now],
      );
      return { id, team_id: teamId, date, available_hours, busy_hours, on_leave_count: 0, scheduled_worker_count, total_worker_count, updated_at: now };
    }
  } catch (error) {
    return handleServiceError(error, '刷新班组可用性');
  }
}

export async function getAvailability(teamId: string, date: string): Promise<TeamDailyAvailability | null> {
  try {
    const db = getDatabase();
    const stmt = db.prepare(`SELECT * FROM team_daily_availability WHERE team_id = ? AND date = ?`);
    stmt.bind([teamId, date]);
    if (stmt.step()) {
      const row = stmt.getAsObject() as unknown as TeamDailyAvailability;
      stmt.free();
      return row;
    }
    stmt.free();
    return null;
  } catch (error) {
    return handleServiceError(error, '获取班组可用性');
  }
}
