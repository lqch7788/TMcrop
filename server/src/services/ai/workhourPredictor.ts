/**
 * AI-06 工时预测推理服务（V1.1 真实 ML 版）
 *
 * 2026-08-22：接入真实 ML（torch 训练 MLP → JSON 权重 → Node 纯 JS 前向传播）
 * - 特征：task_type one-hot(10) + priority one-hot(4) + estimated_hours + rework_count = 16 维
 * - 训练指标（验证集）：MAPE=12.93%  RMSE=0.73h  n=965（farm_tasks 真实实际工时）
 * - 已删除规则 baseline / mock 数据；模型文件缺失时明确抛错（Fail Loud）
 */

import { getDatabase } from '../../db';
import { buildFeatures, getModelMeta, loadModel, predictWorkhourMl } from './ml/workhourModel';

export interface WorkhourPredictInput {
  task_type: string;              // 任务类型（中文，如 '灌溉'）
  priority?: string;              // urgent/high/normal/low
  greenhouse_id?: string;
  assignee_id?: string;
  task_id?: string;               // 有值时查该任务真实 est/rework 特征
}

export interface WorkhourPredictResult {
  predicted_hours: number;
  confidence_low: number;
  confidence_high: number;
  model_version: string;
  model_type: string;             // 'onnx-mlp'
  sample_count: number;           // 训练样本数
  xai_reasons: string[];
  fallback_used: boolean;
}

/**
 * ML 预测主链路
 * - 模型权重随仓库提交，正常情况必然加载成功
 * - 特征缺失时（无 task_id）用同类型任务平均 estimated_hours 填充（真实统计，非 mock）
 */
export async function predictWorkhour(input: WorkhourPredictInput): Promise<WorkhourPredictResult> {
  // 1. 加载模型（文件缺失 → 抛错，前端可见明确错误）
  loadModel();
  const meta = getModelMeta();
  const xai_reasons: string[] = [];

  // 2. 构造特征：estimated_hours / rework_count
  //    有 task_id → 查该任务真实值；无 → 用同类型历史平均（真实数据统计）
  const db = getDatabase();
  let estimatedHours = 0;
  let reworkCount = 0;
  let featureSource = '无任务上下文，使用同类型平均';
  if (input.task_id) {
    const stmt = db.prepare('SELECT estimated_hours, rework_count FROM farm_tasks WHERE id = ? LIMIT 1');
    stmt.bind([input.task_id]);
    let row: Record<string, any> | null = null;
    if (stmt.step()) row = stmt.getAsObject();
    stmt.free();
    if (row) {
      estimatedHours = Number(row.estimated_hours) || 0;
      reworkCount = Number(row.rework_count) || 0;
      featureSource = `任务 ${input.task_id} 真实特征（计划 ${estimatedHours}h，返工 ${reworkCount} 次）`;
    }
  }
  if (!input.task_id || estimatedHours === 0) {
    // 补充：同类型任务平均计划工时（真实数据统计填充）
    const stmt = db.prepare(`
      SELECT COALESCE(AVG(estimated_hours), 0) AS avg_est, COALESCE(AVG(rework_count), 0) AS avg_rework
      FROM farm_tasks WHERE task_type = ?
    `);
    stmt.bind([input.task_type]);
    if (stmt.step()) {
      const row = stmt.getAsObject();
      if (estimatedHours === 0) estimatedHours = Number(row.avg_est) || 0;
      if (reworkCount === 0) reworkCount = Number(row.avg_rework) || 0;
    }
    stmt.free();
  }
  xai_reasons.push(featureSource);

  // 3. ML 推理
  const features = buildFeatures(input.task_type, input.priority, estimatedHours, reworkCount);
  const predicted = round1(predictWorkhourMl(features));

  // 4. 置信区间：基于训练验证集 RMSE（模型实测误差）
  const rmse = meta.metrics.rmse_hours;
  xai_reasons.push(
    `MLP 模型 ${meta.model_version} 推理，训练样本 ${meta.metrics.n_samples} 条，验证集 MAPE=${meta.metrics.mape_pct}%`,
  );
  if (input.priority) {
    xai_reasons.push(`优先级 ${input.priority} 作为特征输入`);
  }

  return {
    predicted_hours: predicted,
    confidence_low: round1(Math.max(0.1, predicted - rmse)),
    confidence_high: round1(predicted + rmse),
    model_version: meta.model_version,
    model_type: meta.model_type,
    sample_count: meta.metrics.n_samples,
    xai_reasons,
    fallback_used: false,
  };
}

function round1(n: number): number {
  return Math.round(n * 10) / 10;
}
