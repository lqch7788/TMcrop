/**
 * v0.3 P1-A：考勤数据接入 API 路由
 *
 * 路径：
 *   GET  /api/attendance/employee/:employeeId          - 员工当月工时统计
 *   GET  /api/attendance/employee/:employeeId/breakdown - 员工当月工时按任务分解
 *   GET  /api/attendance/team/:month                  - 团队月度统计
 *   POST /api/attendance/check-in                      - 签到（worker 移动端）
 *
 * 设计原则：
 *   - 不修改现有 attendance_records 表
 *   - 工时来源：farm_operation_records.duration（HIGH FREQ 数据）
 *   - 出勤数据来源：attendance_records.check_in/out（LOW FREQ 数据）
 *   - 两个数据源通过 operator_id 关联
 */

import { Router, Request, Response } from 'express';
import { getDatabase } from '../db/index';

const router = Router();

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
 * GET /api/attendance/employee/:employeeId
 * Query: month (YYYY-MM, 默认本月)
 *
 * 返回当月工时统计
 */
router.get('/employee/:employeeId', async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);

    const db = getDatabase();

    // 1. 工时统计（从 farm_operation_records）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const workResult = db.exec(
      `SELECT
         COUNT(*) AS operation_count,
         SUM(COALESCE(duration, 0)) AS total_duration_hours,
         SUM(COALESCE(workers, 0)) AS total_worker_count,
         SUM(COALESCE(workload, 0)) AS total_workload,
         COUNT(DISTINCT operation_date) AS work_days
       FROM farm_operation_records
       WHERE operator_id = ?
         AND operation_date LIKE ? || '%'`,
      [employeeId, month] as any[]
    );
    const workStats = rowsToObjects(workResult)[0] ?? {};

    // 2. 出勤统计（从 attendance_records）
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const attendResult = db.exec(
      `SELECT
         COUNT(*) AS attendance_count,
         SUM(CASE WHEN check_in IS NOT NULL AND check_out IS NOT NULL
             THEN (julianday(check_out) - julianday(check_in)) * 24
             ELSE 0 END) AS total_attendance_hours
       FROM attendance_records
       WHERE employee_id = ?
         AND date LIKE ? || '%'`,
      [employeeId, month] as any[]
    );
    const attendStats = rowsToObjects(attendResult)[0] ?? {};

    res.json({
      success: true,
      data: {
        employeeId,
        month,
        workStats,
        attendStats,
        // 综合指标
        summary: {
          totalHours: Number(workStats.total_duration_hours ?? 0),
          operationCount: Number(workStats.operation_count ?? 0),
          attendanceDays: Number(attendStats.attendance_count ?? workStats.work_days ?? 0),
          avgHoursPerDay: Number(workStats.work_days ?? 0) > 0
            ? Number(workStats.total_duration_hours ?? 0) / Number(workStats.work_days)
            : 0,
        },
      },
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/attendance/employee/:employeeId/breakdown
 * 按任务类型分解
 */
router.get('/employee/:employeeId/breakdown', async (req: Request, res: Response): Promise<void> => {
  try {
    const { employeeId } = req.params;
    const month = (req.query.month as string) ?? new Date().toISOString().slice(0, 7);

    const db = getDatabase();
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(
      `SELECT
         operation_type,
         operation_type_name,
         COUNT(*) AS cnt,
         SUM(COALESCE(duration, 0)) AS hours
       FROM farm_operation_records
       WHERE operator_id = ?
         AND operation_date LIKE ? || '%'
       GROUP BY operation_type
       ORDER BY hours DESC`,
      [employeeId, month] as any[]
    );

    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * GET /api/attendance/team/:month
 * 团队月度统计
 */
router.get('/team/:month', async (req: Request, res: Response): Promise<void> => {
  try {
    const { month } = req.params;
    const db = getDatabase();

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const result = db.exec(
      `SELECT
         operator_id,
         operator_name,
         COUNT(*) AS operation_count,
         SUM(COALESCE(duration, 0)) AS total_hours,
         COUNT(DISTINCT operation_date) AS work_days
       FROM farm_operation_records
       WHERE operation_date LIKE ? || '%'
       GROUP BY operator_id
       ORDER BY total_hours DESC
       LIMIT 100`,
      [month] as any[]
    );

    res.json({ success: true, data: rowsToObjects(result) });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

/**
 * POST /api/attendance/check-in
 * Body: { employee_id, date?, check_in?, check_out? }
 *
 * 简化签到：upsert 一天一条 attendance_records
 */
router.post('/check-in', async (req: Request, res: Response): Promise<void> => {
  try {
    const { employee_id, date, check_in, check_out } = req.body as {
      employee_id: string;
      date?: string;
      check_in?: string;
      check_out?: string;
    };
    if (!employee_id) {
      res.status(400).json({ success: false, error: 'employee_id 必填' });
      return;
    }
    const db = getDatabase();
    const today = date ?? new Date().toISOString().slice(0, 10);
    const now = new Date().toISOString();

    db.exec('BEGIN IMMEDIATE');
    try {
      // 检查今日是否已有记录
      const existing = db.exec(
        'SELECT id, check_in, check_out FROM attendance_records WHERE employee_id = ? AND date = ?',
        [employee_id, today]
      );

      if (existing.length > 0 && existing[0].values.length > 0) {
        // 更新
        const id = existing[0].values[0][0] as string;
        db.exec(
          `UPDATE attendance_records
           SET check_in = COALESCE(?, check_in),
               check_out = COALESCE(?, check_out),
               updated_at = ?
           WHERE id = ?`,
          [check_in ?? null, check_out ?? null, now, id]
        );
      } else {
        // 插入
        const id = `att_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
        db.exec(
          `INSERT INTO attendance_records
           (id, employee_id, date, check_in, check_out, status, created_at, updated_at)
           VALUES (?, ?, ?, ?, ?, 'present', ?, ?)`,
          [id, employee_id, today, check_in ?? null, check_out ?? null, now, now]
        );
      }
      db.exec('COMMIT');
    } catch (e) {
      db.exec('ROLLBACK');
      throw e;
    }

    res.json({ success: true, data: { employee_id, date: today } });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    res.status(500).json({ success: false, error: message });
  }
});

export default router;
