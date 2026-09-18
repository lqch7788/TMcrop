/**
 * 班组可用性日历服务（2026-09-15 Phase 2 - #8 可用性日历）
 *
 * 数据流：排班事件触发 → refreshAvailability(teamId, date)
 * 读路径：派工推荐实时聚合 schedules 表
 */
import { getDatabase, saveDatabase } from '../db';
import { generateId } from '../utils/id';
import { handleServiceError } from '../utils/serviceError';

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
 * 数据源（2026-09-17 统一为 team_members，与排班/批量排班口径一致）：
 *   - total_worker_count = 该组当前在职成员数（team_members where left_at IS NULL）
 *   - busy_hours = 该组所有成员当天的 schedules 班次时长合计
 *   - available_hours = total_worker_count × 班组日产能上限(daily_capacity_hours，默认 8) - busy_hours
 *   - on_leave_count: 暂留 0（未来接入考勤）
 */
export async function refreshAvailability(teamId: string, date: string): Promise<TeamDailyAvailability> {
  try {
    const db = getDatabase();
    // 1. 该组成员数（2026-09-17 修复：改用 team_members —— 与排班/批量排班口径一致）
    //    此前用 worker_team_assignments，两表长期不同步（实测 T002 4人 vs 3人、T004/T005 1人 vs 0人），
    //    导致可用工时的分母与实际可排班人员不符。
    const memberRes = db.exec(
      `SELECT COUNT(DISTINCT worker_id) AS c FROM team_members WHERE team_id = ? AND left_at IS NULL`,
      [teamId],
    );
    const total_worker_count = (memberRes[0]?.values?.[0]?.[0] as number) || 0;

    // 2. 该组当日所有排班的 busy_hours（同样以 team_members 为准）
    const shiftsRes = db.exec(
      `SELECT s.shift, s.staff_id FROM schedules s
       JOIN team_members tm ON tm.worker_id = s.staff_id
       WHERE tm.team_id = ? AND tm.left_at IS NULL AND s.date = ?`,
      [teamId, date],
    );
    let busy_hours = 0;
    const uniqueWorkers = new Set<string>();
    // 2026-09-18 修复 H-4：shifts 是配置表（一般 < 50 行），一次性加载到 Map，
    // 避免循环里每次 db.prepare + bind + step + free（N+1 查询）。
    // 同时 sh 不在 shifts 表里的数据会被忽略（H-9：记录"shift 缺失"的工时丢失静默），
    // 用 console.warn 可见化。
    const shiftHoursMap = new Map<string, { start_time: string; end_time: string }>();
    const shiftsAllRes = db.exec('SELECT shift_name, start_time, end_time FROM shifts');
    if (shiftsAllRes[0]) {
      for (const r of shiftsAllRes[0].values) {
        shiftHoursMap.set(r[0] as string, { start_time: r[1] as string, end_time: r[2] as string });
      }
    }
    if (shiftsRes[0]) {
      for (const row of shiftsRes[0].values) {
        const shiftName = row[0] as string;
        const workerId = row[1] as string;
        uniqueWorkers.add(workerId);
        const shift = shiftHoursMap.get(shiftName);
        if (shift) {
          const [sh, sm] = shift.start_time.split(':').map(Number);
          const [eh, em] = shift.end_time.split(':').map(Number);
          let mins = (eh * 60 + em) - (sh * 60 + sm);
          if (mins < 0) mins += 24 * 60; // 跨日班处理
          busy_hours += Math.round(mins / 60);
        } else {
          // 2026-09-18 修复 H-9：shifts 表里没有这个班次名 → 工时丢失且无告警。
          // 之前是静默吞掉，现在显式记录（不 throw，不阻断主流程）
          console.warn(`[team-availability] shift 名 "${shiftName}" 在 shifts 表里未定义，工人 ${workerId} 当天工时无法计算`);
        }
      }
    }
    // 3. 2026-09-17 修复：可用工时按班组配置的日产能上限计算。
    //    此前硬编码每人 8h，导致"日产能上限"字段填了也不生效（无任何消费方）。
    const capRes = db.exec('SELECT daily_capacity_hours FROM teams WHERE id = ?', [teamId]);
    const capPerPerson = Number(capRes[0]?.values?.[0]?.[0]) || 8;
    const available_hours = Math.max(0, total_worker_count * capPerPerson - busy_hours);
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
      // 2026-09-18 修复 C-5：可用性写入必须持久化（sql.js 内存库），
      // 否则重启后整张表丢失 → 派工读过时数据 → 过度派工/漏派
      saveDatabase();
      return { id: existingId, team_id: teamId, date, available_hours, busy_hours, on_leave_count: 0, scheduled_worker_count, total_worker_count, updated_at: now };
    } else {
      db.run(
        `INSERT INTO team_daily_availability (id, team_id, date, available_hours, busy_hours, on_leave_count, scheduled_worker_count, total_worker_count, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
        [id, teamId, date, available_hours, busy_hours, 0, scheduled_worker_count, total_worker_count, now],
      );
      // 2026-09-18 修复 C-5：同上
      saveDatabase();
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
