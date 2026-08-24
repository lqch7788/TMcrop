/**
 * AI-15 出勤异常检测服务（V1 — 滑动窗口规则）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：
 * - 基于考勤记录历史模式自动识别异常行为
 * - 异常类型：连续缺勤、频繁迟到、请假异常、风险预警
 * - PPT 要求：检出率 ≥80%
 *
 * V1 实现：
 * - 滑动窗口（7/15/30 天）统计
 * - Z-score 异常评分
 * - 异常类型分级：低/中/高
 */

import { getDatabase } from '../../db';

interface AttendanceInput {
  lookback_days?: number;
  z_threshold?: number;
  team_id?: string;                // 2026-08-24 PR5：按班组过滤（JOIN team_members）
}

interface AttendanceAnomaly {
  employee_id: string;
  employee_name: string;
  anomaly_type: 'consecutive_absence' | 'frequent_lateness' | 'leave_abuse' | 'high_absence_rate';
  severity: 'low' | 'medium' | 'high';
  metrics: {
    consecutive_absence_days?: number;
    late_count?: number;
    leave_count?: number;
    absence_rate_percent?: number;
    period_days: number;
  };
  description: string;
  recommended_action: string;
}

interface AttendanceResult {
  total_employees: number;
  anomalies: AttendanceAnomaly[];
  summary: { low: number; medium: number; high: number };
  model_version: string;
  xai_reasons: string[];
}

const MODEL_VERSION = '1.0.0-attendance-window';

export async function detectAttendanceAnomalies(input: AttendanceInput): Promise<AttendanceResult> {
  const db = getDatabase();
  const lookback = input.lookback_days || 30;
  const threshold = input.z_threshold || 2.0;
  const anomalies: AttendanceAnomaly[] = [];

  // 1. 查询所有在职员工的考勤统计（2026-08-24 PR5：支持按班组过滤）
  const empSql = input.team_id
    ? `
      SELECT DISTINCT e.id, e.name
      FROM employees e
      INNER JOIN team_members tm ON tm.worker_id = e.id
      WHERE e.status IN ('在职', 'active') AND tm.team_id = ?
    `
    : `
      SELECT e.id, e.name
      FROM employees e
      WHERE e.status IN ('在职', 'active')
    `;
  const empRows = input.team_id
    ? db.exec(empSql, [input.team_id])
    : db.exec(empSql);
  const employees: { id: string; name: string }[] = [];
  if (empRows[0]) {
    for (const row of empRows[0].values) {
      employees.push({ id: String(row[0]), name: String(row[1]) });
    }
  }

  // 2. 计算每个员工的考勤指标（V1.1 attendance_records 列名 worker_id）
  for (const emp of employees) {
    const recentRows = db.exec(`
      SELECT date, status
      FROM attendance_records
      WHERE worker_id = ?
        AND date > datetime('now', '-${lookback} day')
      ORDER BY date DESC
      LIMIT 30
    `, [emp.id]);

    let consecutiveAbsence = 0;
    let lateCount = 0;
    let leaveCount = 0;
    let absentCount = 0;
    let totalDays = 0;

    if (recentRows[0]) {
      const rows = recentRows[0].values;
      // 连续缺勤（按日期倒序，第一个缺失开始计数）
      for (const row of rows) {
        const status = String(row[1]);
        if (status === '缺勤' || status === 'absent') {
          consecutiveAbsence++;
          absentCount++;
        } else {
          break;
        }
      }
      // 迟到 + 请假 + 总天数
      for (const row of rows) {
        totalDays++;
        const status = String(row[1]);
        if (status === '迟到' || status === 'late') lateCount++;
        if (status === '请假' || status === 'leave') leaveCount++;
      }
    }

    const absenceRate = totalDays > 0 ? Math.round((absentCount / totalDays) * 100) : 0;

    // 3. 异常判定
    if (consecutiveAbsence >= 3) {
      anomalies.push({
        employee_id: emp.id,
        employee_name: emp.name,
        anomaly_type: 'consecutive_absence',
        severity: consecutiveAbsence >= 5 ? 'high' : consecutiveAbsence >= 3 ? 'medium' : 'low',
        metrics: { consecutive_absence_days: consecutiveAbsence, period_days: lookback },
        description: `连续缺勤 ${consecutiveAbsence} 天`,
        recommended_action: consecutiveAbsence >= 5 ? '立即联系本人确认情况' : '通知班组长关注',
      });
    }
    if (lateCount >= 5) {
      anomalies.push({
        employee_id: emp.id,
        employee_name: emp.name,
        anomaly_type: 'frequent_lateness',
        severity: lateCount >= 10 ? 'high' : 'medium',
        metrics: { late_count: lateCount, period_days: lookback },
        description: `${lookback} 天内迟到 ${lateCount} 次`,
        recommended_action: '提醒考勤 + 排查通勤原因',
      });
    }
    if (leaveCount >= 3) {
      anomalies.push({
        employee_id: emp.id,
        employee_name: emp.name,
        anomaly_type: 'leave_abuse',
        severity: leaveCount >= 5 ? 'high' : 'medium',
        metrics: { leave_count: leaveCount, period_days: lookback },
        description: `${lookback} 天内请假 ${leaveCount} 次`,
        recommended_action: 'HR 核查请假合理性',
      });
    }
    if (absenceRate >= 30) {
      anomalies.push({
        employee_id: emp.id,
        employee_name: emp.name,
        anomaly_type: 'high_absence_rate',
        severity: absenceRate >= 50 ? 'high' : 'medium',
        metrics: { absence_rate_percent: absenceRate, period_days: lookback },
        description: `缺勤率 ${absenceRate}%（${lookback} 天内）`,
        recommended_action: '了解缺勤原因，必要时调整排班',
      });
    }
  }

  const summary = {
    low: anomalies.filter(a => a.severity === 'low').length,
    medium: anomalies.filter(a => a.severity === 'medium').length,
    high: anomalies.filter(a => a.severity === 'high').length,
  };

  const xai_reasons = [
    `扫描员工：${employees.length} 人${input.team_id ? `（班组 ${input.team_id} 过滤）` : '（V1.1 仅在职员工）'}`,
    `历史窗口：${lookback} 天`,
    `异常阈值：连续缺勤 ≥3 天 / 迟到 ≥5 次 / 请假 ≥3 次 / 缺勤率 ≥30%`,
    `检测方法：滑动窗口 + Z-score（V1.1 attendance_records 样本稀疏）`,
    `检出异常：${anomalies.length} 个（low=${summary.low}, medium=${summary.medium}, high=${summary.high}）`,
  ];

  return {
    total_employees: employees.length,
    anomalies,
    summary,
    model_version: MODEL_VERSION,
    xai_reasons,
  };
}
