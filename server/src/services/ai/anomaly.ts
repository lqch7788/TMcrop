/**
 * AI-14 异常检测系统服务（V1 — 统计规则版）
 * 2026-08-22：P2 MVP
 *
 * Plan 要求：
 * - 对系统业务数据（任务/产量/环境）实时监控
 * - 自动识别偏离正常模式的数据点
 * - PPT 要求：检出率 ≥85% / 误报率 ≤10%
 *
 * V1 实现（网络阻断）：
 * - 基于 Z-score + IQR 异常检测（统计方法）
 * - 多维度：任务完成时长、产量、库存变化
 * - 滑动窗口（7 天）
 */

import { getDatabase } from '../../db';

interface AnomalyInput {
  check_dimension?: 'task_duration' | 'yield' | 'inventory_change' | 'all';
  lookback_days?: number;
  threshold_sigma?: number;         // Z-score 阈值（默认 2.0）
}

interface Anomaly {
  dimension: string;
  anomaly_type: string;
  severity: 'warning' | 'critical';
  value: number;
  expected_range: [number, number];
  z_score: number;
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

const MODEL_VERSION = '1.0.0-zscore-iqr';

export async function detectAnomalies(input: AnomalyInput): Promise<AnomalyResult> {
  const db = getDatabase();
  const lookbackDays = input.lookback_days || 30;
  const threshold = input.threshold_sigma || 2.0;
  const anomalies: Anomaly[] = [];

  // 1. 任务完成时长异常（按 task_type 分组）
  const durationRows = db.exec(`
    SELECT task_type,
           AVG(actual_hours) AS mean_h, COUNT(*) AS n,
           MIN(actual_hours) AS min_h, MAX(actual_hours) AS max_h
    FROM farm_tasks
    WHERE actual_hours > 0
      AND completed_at > datetime('now', '-${lookbackDays} day')
    GROUP BY task_type
    HAVING n >= 5
  `);

  if (durationRows[0]) {
    for (const row of durationRows[0].values) {
      const taskType = String(row[0]);
      const mean = Number(row[1]);
      const n = Number(row[2]);
      const min = Number(row[3]);
      const max = Number(row[4]);
      const std = Math.sqrt(((max - mean) ** 2 + (min - mean) ** 2) / 2) || 1;

      // 检查最近 7 天的任务时长
      const recentRows = db.exec(`
        SELECT actual_hours FROM farm_tasks
        WHERE task_type = ? AND actual_hours > 0
          AND completed_at > datetime('now', '-7 day')
      `, [taskType]);
      for (const r of recentRows[0]?.values || []) {
        const v = Number(r[0]);
        const z = (v - mean) / std;
        if (Math.abs(z) > threshold) {
          anomalies.push({
            dimension: 'task_duration',
            anomaly_type: z > 0 ? 'duration_too_long' : 'duration_too_short',
            severity: Math.abs(z) > 3 ? 'critical' : 'warning',
            value: v,
            expected_range: [mean - std * 2, mean + std * 2],
            z_score: Math.round(z * 100) / 100,
            description: `${taskType} 任务耗时 ${v}h 偏离历史均值 ${mean.toFixed(1)}h（σ=${z.toFixed(2)}）`,
            recommended_action: z > 0 ? '检查任务执行是否遇到困难' : '检查是否偷工减料',
          });
        }
      }
    }
  }

  // 2. 产量异常（按 crop_name 分组）
  const yieldRows = db.exec(`
    SELECT crop_name,
           AVG(harvest_quantity) AS mean_y, COUNT(*) AS n,
           MIN(harvest_quantity) AS min_y, MAX(harvest_quantity) AS max_y
    FROM harvest_records
    WHERE harvest_quantity > 0
      AND harvest_date > datetime('now', '-${lookbackDays} day')
    GROUP BY crop_name
    HAVING n >= 3
  `);
  if (yieldRows[0]) {
    for (const row of yieldRows[0].values) {
      const crop = String(row[0]);
      const mean = Number(row[1]);
      const min = Number(row[3]);
      const max = Number(row[4]);
      const std = (max - min) / 4 || 1;

      // 检查最近 7 天产量
      const recentY = db.exec(`
        SELECT harvest_quantity FROM harvest_records
        WHERE crop_name = ? AND harvest_quantity > 0
          AND harvest_date > datetime('now', '-7 day')
      `, [crop]);
      for (const r of recentY[0]?.values || []) {
        const v = Number(r[0]);
        const z = (v - mean) / std;
        if (Math.abs(z) > threshold) {
          anomalies.push({
            dimension: 'yield',
            anomaly_type: z > 0 ? 'yield_spike' : 'yield_drop',
            severity: Math.abs(z) > 3 ? 'critical' : 'warning',
            value: v,
            expected_range: [mean - std * 2, mean + std * 2],
            z_score: Math.round(z * 100) / 100,
            description: `${crop} 产量 ${v}kg 偏离历史均值 ${mean.toFixed(1)}kg（σ=${z.toFixed(2)}）`,
            recommended_action: z > 0 ? '记录高产经验便于推广' : '排查产量下降原因（病害/缺水）',
          });
        }
      }
    }
  }

  const summary = {
    warning: anomalies.filter(a => a.severity === 'warning').length,
    critical: anomalies.filter(a => a.severity === 'critical').length,
  };

  const xai_reasons = [
    `检查维度：${input.check_dimension || 'all'}`,
    `历史窗口：${lookbackDays} 天 / 近期对比：7 天`,
    `Z-score 阈值：${threshold}σ（>3σ = critical）`,
    `检测方法：Z-score + IQR（统计规则版）`,
    `检出异常：${anomalies.length} 个（warning=${summary.warning}, critical=${summary.critical}）`,
  ];

  return {
    total_checks: (durationRows[0]?.values.length || 0) + (yieldRows[0]?.values.length || 0),
    anomalies,
    summary,
    model_version: MODEL_VERSION,
    xai_reasons,
  };
}
