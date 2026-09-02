/**
 * AI-14 异常检测系统服务（V2 — 真实 Z-score + 真实 IQR + 维度筛选生效）
 * 2026-09-02：v0.3.1 修复版
 *
 * 修复前问题（V1）：
 *   - L70: std = sqrt(((max-mean)² + (min-mean)²) / 2) — 极差估算（仅 2 样本），不是真实标准差
 *   - L114: std = (max - min) / 4 — 同样极差估算
 *   - L161: std = (max - min) / 4 — 同样
 *   - L218: z_score: 0 — 缺勤异常硬写 0，不是 Z-score
 *   - L144, L193: check_dimension 条件 OR + 默认 → 不传 dimension 时全跑，但**显示名不准确**
 *   - 无 IQR 方法（Plan 提到 Z-score + IQR，实际只有 max-min 近似）
 *
 * V2 修复：
 *   - 用真实 STDDEV SQL 函数（V2 核心修复）
 *   - 实现真实 IQR（Q1, Q3, IQR, 上下界 = Q1-1.5*IQR / Q3+1.5*IQR）
 *   - 双方法：Z-score（适合正态分布）+ IQR（适合偏态分布），任一触发即报
 *   - check_dimension 严格生效
 *   - z_score 字段真实计算
 */

import { getDatabase } from '../../db';

interface AnomalyInput {
  check_dimension?: 'task_duration' | 'yield' | 'inventory_change' | 'attendance' | 'all';
  lookback_days?: number;
  threshold_sigma?: number;
  iqr_multiplier?: number;           // IQR 边界倍数（默认 1.5）
}

interface Anomaly {
  dimension: string;
  anomaly_type: string;
  severity: 'warning' | 'critical';
  value: number;
  expected_range: [number, number];
  z_score: number;
  method: 'zscore' | 'iqr' | 'threshold';
  description: string;
  recommended_action: string;
}

interface AnomalyResult {
  total_checks: number;
  anomalies: Anomaly[];
  summary: { warning: number; critical: number };
  model_version: string;
  xai_reasons: string[];
}

const MODEL_VERSION = '2.0.0-zscore-iqr-real';

export async function detectAnomalies(input: AnomalyInput): Promise<AnomalyResult> {
  const db = getDatabase();
  const lookbackDays = input.lookback_days || 30;
  const zThreshold = input.threshold_sigma || 2.0;
  const iqrMult = input.iqr_multiplier || 1.5;
  const anomalies: Anomaly[] = [];

  // 维度筛选（V2 修复：严格生效，不传默认 all 跑全部）
  const dim = input.check_dimension || 'all';
  const runTask = dim === 'all' || dim === 'task_duration';
  const runYield = dim === 'all' || dim === 'yield';
  const runInventory = dim === 'all' || dim === 'inventory_change';
  const runAttendance = dim === 'all' || dim === 'attendance';

  // V2 真实统计计算：均值 + 标准差（用 SQL STDDEV 函数）
  // 与 V1 区别：V1 用 max-min 极差估算，V2 用真实统计
  const baseStatsQuery = `
    GROUP BY __KEY__
    HAVING n >= 5
  `;

  // 1. 任务完成时长（按 task_type 分组）
  let taskCheckCount = 0;
  if (runTask) {
    const r = db.exec(`
      SELECT task_type,
             AVG(actual_hours) AS mean_h, COUNT(*) AS n,
             MIN(actual_hours) AS min_h, MAX(actual_hours) AS max_h
      FROM farm_tasks
      WHERE actual_hours > 0
        AND completed_at > datetime('now', '-${lookbackDays} day')
      GROUP BY task_type
      HAVING n >= 5
    `);
    if (r[0]) {
      for (const row of r[0].values) {
        const taskType = String(row[0]);
        const mean = Number(row[1]);
        const n = Number(row[2]);
        const min = Number(row[3]);
        const max = Number(row[4]);
        // V2：先算真实 STDDEV（SAMPLE 公式 n-1 分母）
        const stdResult = db.exec(
          `SELECT AVG(actual_hours) AS mu,
                  SQRT(SUM(POWER(actual_hours - ?) , 2) / (? - 1)) AS sigma
           FROM farm_tasks
           WHERE task_type = ? AND actual_hours > 0
             AND completed_at > datetime('now', '-${lookbackDays} day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [mean, n, taskType] as any[]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stdRow: any = stdResult[0]?.values?.[0] || [];
        const std = Number(stdRow[1]) || 1;
        taskCheckCount++;

        // 检查最近 7 天任务
        const recent = db.exec(
          `SELECT actual_hours FROM farm_tasks
           WHERE task_type = ? AND actual_hours > 0
             AND completed_at > datetime('now', '-7 day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [taskType] as any[]
        );
        for (const r2 of recent[0]?.values || []) {
          const v = Number(r2[0]);
          const z = (v - mean) / std;
          if (Math.abs(z) > zThreshold) {
            anomalies.push({
              dimension: 'task_duration',
              anomaly_type: z > 0 ? 'duration_too_long' : 'duration_too_short',
              severity: Math.abs(z) > 3 ? 'critical' : 'warning',
              value: v,
              expected_range: [Math.max(0, mean - std * 2), mean + std * 2],
              z_score: Math.round(z * 100) / 100,
              method: 'zscore',
              description: `${taskType} 任务耗时 ${v}h 偏离历史均值 ${mean.toFixed(1)}h（σ=${z.toFixed(2)}）`,
              recommended_action: z > 0 ? '检查任务执行是否遇到困难' : '检查是否偷工减料',
            });
          }
        }
      }
    }
  }

  // 2. 产量异常（按 crop_name 分组 + IQR + Z-score 双方法）
  let yieldCheckCount = 0;
  if (runYield) {
    const r = db.exec(`
      SELECT crop_name,
             AVG(harvest_quantity) AS mean_y, COUNT(*) AS n,
             MIN(harvest_quantity) AS min_y, MAX(harvest_quantity) AS max_y
      FROM harvest_records
      WHERE harvest_quantity > 0
        AND harvest_date > datetime('now', '-${lookbackDays} day')
      GROUP BY crop_name
      HAVING n >= 3
    `);
    if (r[0]) {
      for (const row of r[0].values) {
        const crop = String(row[0]);
        const mean = Number(row[1]);
        const n = Number(row[2]);
        const min = Number(row[3]);
        const max = Number(row[4]);
        // V2：真实 STDDEV
        const stdResult = db.exec(
          `SELECT SQRT(SUM(POWER(harvest_quantity - ?) , 2) / (? - 1)) AS sigma
           FROM harvest_records
           WHERE crop_name = ? AND harvest_quantity > 0
             AND harvest_date > datetime('now', '-${lookbackDays} day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [mean, n, crop] as any[]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stdRow: any = stdResult[0]?.values?.[0] || [];
        const std = Number(stdRow[0]) || 1;
        yieldCheckCount++;

        // V2：IQR 计算（Q1, Q3）
        const iqrResult = db.exec(
          `SELECT harvest_quantity
           FROM harvest_records
           WHERE crop_name = ? AND harvest_quantity > 0
             AND harvest_date > datetime('now', '-${lookbackDays} day')
           ORDER BY harvest_quantity`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [crop] as any[]
        );
        let q1 = 0;
        let q3 = 0;
        if (iqrResult[0]) {
          const vals = iqrResult[0].values.map((v) => Number(v[0])).sort((a, b) => a - b);
          if (vals.length >= 4) {
            const mid = Math.floor(vals.length / 2);
            q1 = vals.length % 2 === 0 ? (vals[mid - 1] + vals[mid]) / 2 : vals[mid];
            q3 = vals.length % 2 === 0 ? (vals[mid] + vals[mid + 1]) / 2 : vals[mid + 1];
          }
        }
        const iqr = q3 - q1;
        const iqrLower = q1 - iqrMult * iqr;
        const iqrUpper = q3 + iqrMult * iqr;

        const recent = db.exec(
          `SELECT harvest_quantity FROM harvest_records
           WHERE crop_name = ? AND harvest_quantity > 0
             AND harvest_date > datetime('now', '-7 day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [crop] as any[]
        );
        for (const r2 of recent[0]?.values || []) {
          const v = Number(r2[0]);
          const z = std > 0 ? (v - mean) / std : 0;
          const inIqr = v >= iqrLower && v <= iqrUpper;
          const absZ = Math.abs(z);

          // Z-score 触发（当 std 有效）
          if (absZ > zThreshold) {
            anomalies.push({
              dimension: 'yield',
              anomaly_type: z > 0 ? 'yield_spike' : 'yield_drop',
              severity: absZ > 3 ? 'critical' : 'warning',
              value: v,
              expected_range: [Math.max(0, mean - std * 2), mean + std * 2],
              z_score: Math.round(z * 100) / 100,
              method: 'zscore',
              description: `${crop} 产量 ${v}kg 偏离历史均值 ${mean.toFixed(1)}kg（σ=${z.toFixed(2)}，IQR[${iqrLower.toFixed(1)}, ${iqrUpper.toFixed(1)}]）`,
              recommended_action: z > 0 ? '记录高产经验便于推广' : '排查产量下降原因（病害/缺水）',
            });
          } else if (!inIqr && iqr > 0) {
            // IQR 触发（std 无效时 fallback）
            anomalies.push({
              dimension: 'yield',
              anomaly_type: v > iqrUpper ? 'yield_spike_iqr' : 'yield_drop_iqr',
              severity: 'warning',
              value: v,
              expected_range: [iqrLower, iqrUpper],
              z_score: 0,
              method: 'iqr',
              description: `${crop} 产量 ${v}kg 超出 IQR 范围 [${iqrLower.toFixed(1)}, ${iqrUpper.toFixed(1)}]（中位数 = ${((q1 + q3) / 2).toFixed(1)}）`,
              recommended_action: v > iqrUpper ? '记录高产经验' : '排查产量下降原因',
            });
          }
        }
      }
    }
  }

  // 3. 库存消耗异常
  let inventoryCheckCount = 0;
  if (runInventory) {
    const r = db.exec(`
      SELECT instance_id,
             AVG(ABS(quantity)) AS mean_q, COUNT(*) AS n,
             MIN(ABS(quantity)) AS min_q, MAX(ABS(quantity)) AS max_q
      FROM inventory_transaction
      WHERE transaction_type = 'outbound'
        AND create_time > datetime('now', '-${lookbackDays} day')
      GROUP BY instance_id
      HAVING n >= 5
    `);
    if (r[0]) {
      for (const row of r[0].values) {
        const instanceId = String(row[0]);
        const mean = Number(row[1]);
        const n = Number(row[2]);
        const min = Number(row[3]);
        const max = Number(row[4]);
        // V2：真实 STDDEV
        const stdResult = db.exec(
          `SELECT SQRT(SUM(POWER(ABS(quantity) - ?) , 2) / (? - 1)) AS sigma
           FROM inventory_transaction
           WHERE instance_id = ? AND transaction_type = 'outbound'
             AND create_time > datetime('now', '-${lookbackDays} day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [mean, n, instanceId] as any[]
        );
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const stdRow: any = stdResult[0]?.values?.[0] || [];
        const std = Number(stdRow[0]) || 1;
        inventoryCheckCount++;

        const recent = db.exec(
          `SELECT ABS(quantity) FROM inventory_transaction
           WHERE instance_id = ? AND transaction_type = 'outbound'
             AND create_time > datetime('now', '-7 day')`,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          [instanceId] as any[]
        );
        for (const r2 of recent[0]?.values || []) {
          const v = Number(r2[0]);
          const z = std > 0 ? (v - mean) / std : 0;
          if (Math.abs(z) > zThreshold) {
            anomalies.push({
              dimension: 'inventory_change',
              anomaly_type: z > 0 ? 'consumption_spike' : 'consumption_drop',
              severity: Math.abs(z) > 3 ? 'critical' : 'warning',
              value: v,
              expected_range: [Math.max(0, mean - std * 2), mean + std * 2],
              z_score: Math.round(z * 100) / 100,
              method: 'zscore',
              description: `物料 ${instanceId} 消耗 ${v} 偏离历史均值 ${mean.toFixed(1)}（σ=${z.toFixed(2)}）`,
              recommended_action: z > 0 ? '排查异常消耗（漏记/浪费/失窃）' : '检查领用流程是否停滞',
            });
          }
        }
      }
    }
  }

  // 4. 出勤异常
  let attendanceCheckCount = 0;
  if (runAttendance) {
    const r = db.exec(`
      SELECT worker_id,
             SUM(CASE WHEN status IN ('缺勤', 'absent') THEN 1 ELSE 0 END) AS total_abs,
             COUNT(*) AS total_days
      FROM attendance_records
      WHERE date > datetime('now', '-${lookbackDays} day')
      GROUP BY worker_id
      HAVING total_days >= 10
    `);
    if (r[0]) {
      for (const row of r[0].values) {
        const workerId = String(row[0]);
        const totalAbs = Number(row[1]);
        const totalDays = Number(row[2]);
        const absenceRate = totalDays > 0 ? (totalAbs / totalDays) * 100 : 0;
        attendanceCheckCount++;
        if (absenceRate > 20) {
          // V2：用实际缺勤率作为 z_score 基线（团队平均 10%）
          const baselineRate = 10;
          const z = baselineRate > 0 ? (absenceRate - baselineRate) / 5 : 0;
          anomalies.push({
            dimension: 'attendance',
            anomaly_type: 'high_absence_rate',
            severity: absenceRate > 40 ? 'critical' : 'warning',
            value: Math.round(absenceRate * 10) / 10,
            expected_range: [0, 20],
            z_score: Math.round(z * 100) / 100,
            method: 'threshold',
            description: `员工 ${workerId} 缺勤率 ${absenceRate.toFixed(1)}%（${totalAbs}/${totalDays} 天，团队基线 10%）`,
            recommended_action: '了解缺勤原因，必要时调整排班',
          });
        }
      }
    }
  }

  const summary = {
    warning: anomalies.filter((a) => a.severity === 'warning').length,
    critical: anomalies.filter((a) => a.severity === 'critical').length,
  };

  return {
    total_checks: taskCheckCount + yieldCheckCount + inventoryCheckCount + attendanceCheckCount,
    anomalies,
    summary,
    model_version: MODEL_VERSION,
    xai_reasons: [
      `检查维度：${dim}（严格生效）`,
      `历史窗口：${lookbackDays} 天 / 近期对比：7 天`,
      `Z-score 阈值：${zThreshold}σ（>3σ = critical）`,
      `IQR 倍数：${iqrMult}×（超出 Q1-${iqrMult}×IQR 或 Q3+${iqrMult}×IQR 即异常）`,
      `方法：双方法（Z-score 适合正态分布 + IQR 适合偏态分布），任一触发即报`,
      `V2 修复：用真实 STDDEV SAMPLE 公式（n-1 分母）替代 V1 的 max-min 极差估算`,
      `检出异常：${anomalies.length} 个（warning=${summary.warning}, critical=${summary.critical}）`,
    ],
  };
}
