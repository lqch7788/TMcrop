/**
 * AI-06 工时预测推理服务（V1.1 baseline 规则版）
 *
 * 2026-08-22：MVP 实现，用"同类型历史均值 + 优先级调整"作为预测
 * - 当前数据量太少（10 有效样本）训练 ML 不现实
 * - 等数据扩充到 ≥100 行后切 XGBoost ONNX 推理
 * - 现在的规则版 baseline 已经比"完全没预测"好得多
 *
 * 降级安全网（Analyst 建议）：如果 SQL 查询失败 → 返回 V1.1 estimated_hours 字段
 */

import { getDatabase } from '../../db';

export interface WorkhourPredictInput {
  task_type: string;              // 任务类型
  priority?: string;              // urgent/high/normal/low
  greenhouse_id?: string;
  assignee_id?: string;
  task_id?: string;               // 用于查询历史 + 排除自己
}

export interface WorkhourPredictResult {
  predicted_hours: number;
  confidence_low: number;
  confidence_high: number;
  model_version: string;
  model_type: 'rule-based' | 'onnx-xgboost';  // 未来切换
  sample_count: number;           // 历史样本数
  xai_reasons: string[];
  fallback_used: boolean;
}

const MODEL_VERSION = '1.0.0-rule';

/**
 * 规则版 baseline 预测
 * - 核心：同类型任务历史平均工时
 * - 调整：优先级（urgent 缩短工期，low 拉长）
 * - 调整：返工次数（rework_count > 0 加 30%）
 */
export async function predictWorkhour(input: WorkhourPredictInput): Promise<WorkhourPredictResult> {
  const db = getDatabase();
  const xai_reasons: string[] = [];

  try {
    // 1. 查询同类型任务历史平均工时
    // 2026-08-22 双修复：
    //   a) synthetic 行 id 为 NULL，`id != COALESCE(?, '')` 过滤掉 NULL → 仅当 task_id 有值才排除
    //   b) sql.js db.exec 中文参数绑定失败（'采收' 查不到，'planting' 能查到）
    //      → 改用 db.prepare + bind（与 plantings 路由同模式，中文安全）
    const excludeClause = input.task_id ? 'AND id != ?' : '';
    const sql = `
      SELECT actual_hours, estimated_hours, rework_count, priority
      FROM farm_tasks
      WHERE task_type = ?
        AND actual_hours IS NOT NULL AND actual_hours > 0
        ${excludeClause}
      ORDER BY completed_at DESC
      LIMIT 50
    `;
    const stmt = db.prepare(sql);
    if (input.task_id) {
      stmt.bind([input.task_type, input.task_id]);
    } else {
      stmt.bind([input.task_type]);
    }
    const hist: any[] = [];
    while (stmt.step()) {
      hist.push(stmt.getAsObject());
    }
    stmt.free();

    if (hist.length === 0) {
      // 降级：返回 V1.1 estimated_hours 字段（安全网）
      xai_reasons.push('同类型任务历史数据为空');
      return buildFallback(input, xai_reasons);
    }

    const sample_count = hist.length;
    xai_reasons.push(`基于 ${sample_count} 条同类型任务历史平均`);

    // 2. 计算加权平均（最近任务权重更高）
    let weightedSum = 0;
    let weightSum = 0;
    hist.forEach((row, idx) => {
      const weight = 1.0 / (idx + 1);  // 倒数权重
      weightedSum += row.actual_hours * weight;
      weightSum += weight;
    });
    const historicalMean = weightedSum / weightSum;

    // 3. 优先级调整
    const priorityFactor = getPriorityFactor(input.priority);
    if (priorityFactor !== 1.0) {
      xai_reasons.push(`优先级 ${input.priority || 'normal'} 调整系数 ${priorityFactor.toFixed(2)}`);
    }

    // 4. 返工调整（最新 5 条平均返工次数）
    const recentRework = hist.slice(0, 5).reduce((s, r) => s + (r.rework_count || 0), 0) / Math.min(5, hist.length);
    const reworkFactor = 1 + (recentRework * 0.3);
    if (recentRework > 0) {
      xai_reasons.push(`近 5 条平均返工 ${recentRework.toFixed(1)} 次，调整 +${((reworkFactor - 1) * 100).toFixed(0)}%`);
    }

    // 5. 计算预测值 + 置信区间
    const predicted = historicalMean * priorityFactor * reworkFactor;
    const std = Math.sqrt(hist.reduce((s, r) => s + Math.pow(r.actual_hours - historicalMean, 2), 0) / hist.length);
    const confidenceRange = Math.max(std, predicted * 0.2);  // 至少 ±20%

    xai_reasons.push(`历史均值 ${historicalMean.toFixed(1)}h × 优先级系数 ${priorityFactor.toFixed(2)} × 返工系数 ${reworkFactor.toFixed(2)}`);

    return {
      predicted_hours: round1(predicted),
      confidence_low: round1(Math.max(0.1, predicted - confidenceRange)),
      confidence_high: round1(predicted + confidenceRange),
      model_version: MODEL_VERSION,
      model_type: 'rule-based',
      sample_count,
      xai_reasons,
      fallback_used: false,
    };
  } catch (e) {
    // 异常 → 降级到 V1.1 estimated_hours（安全网）
    xai_reasons.push(`预测异常: ${(e as Error).message}`);
    return buildFallback(input, xai_reasons);
  }
}

/**
 * 降级方案：返回 V1.1 现有 estimated_hours 字段
 */
function buildFallback(input: WorkhourPredictInput, xai_reasons: string[]): WorkhourPredictResult {
  try {
    const db = getDatabase();
    const rows = db.exec(`
      SELECT estimated_hours FROM farm_tasks WHERE id = ? LIMIT 1
    `, [input.task_id || '']);
    const est = Number(rows[0]?.values?.[0]?.[0]) || 1.0;
    xai_reasons.push('降级到 V1.1 estimated_hours 字段');
    return {
      predicted_hours: round1(est),
      confidence_low: round1(est * 0.7),
      confidence_high: round1(est * 1.3),
      model_version: MODEL_VERSION,
      model_type: 'rule-based',
      sample_count: 0,
      xai_reasons,
      fallback_used: true,
    };
  } catch {
    return {
      predicted_hours: 1.0,
      confidence_low: 0.5,
      confidence_high: 2.0,
      model_version: MODEL_VERSION,
      model_type: 'rule-based',
      sample_count: 0,
      xai_reasons: [...xai_reasons, '最终降级：默认值 1.0h'],
      fallback_used: true,
    };
  }
}

function getPriorityFactor(priority?: string): number {
  const map: Record<string, number> = {
    urgent: 0.7,    // 赶工会压缩
    high: 0.85,
    normal: 1.0,
    low: 1.2,       // 宽松执行
  };
  return map[priority || 'normal'] || 1.0;
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
