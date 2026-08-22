/**
 * AI-06 工时预测 — MLP 模型推理（Node 纯 JS 前向传播，零依赖）
 *
 * 2026-08-22：真实 ML 接入（替换规则 baseline）
 * - 权重由 server/tools/ml/train_workhour_mlp.py 用 torch 训练导出为 JSON
 * - 模型结构：Linear(16→32) + ReLU + Linear(32→16) + ReLU + Linear(16→1)
 * - 训练指标（验证集）：MAPE=12.93%  RMSE=0.73h  n=965
 * - 特征（与训练脚本严格一致）：task_type one-hot(10) + priority one-hot(4) + estimated_hours + rework_count = 16 维
 */

import fs from 'fs';
import path from 'path';

const WEIGHTS_PATH = path.join(__dirname, '../../../../models/workhour_weights.json');
const META_PATH = path.join(__dirname, '../../../../models/workhour_meta.json');

/** MLP 权重（torch state_dict 导出） */
interface MLPWeights {
  fc1_w: number[][];
  fc1_b: number[];
  fc2_w: number[][];
  fc2_b: number[];
  fc3_w: number[][];
  fc3_b: number[];
}

/** 模型元数据（训练信息，与特征枚举对齐） */
export interface WorkhourModelMeta {
  model_version: string;
  model_type: string;
  task_types: string[];
  priorities: string[];
  feature_dim: number;
  metrics: { mape_pct: number; rmse_hours: number; n_samples: number };
  trained_at: string;
}

let weightsCache: MLPWeights | null = null;
let metaCache: WorkhourModelMeta | null = null;

/** 模型是否已加载 */
export function isModelLoaded(): boolean {
  return weightsCache !== null;
}

/** 加载权重 + 元数据（首次调用时执行，文件缺失时明确抛错 — Fail Loud） */
export function loadModel(): void {
  if (weightsCache) return;
  if (!fs.existsSync(WEIGHTS_PATH)) {
    throw new Error(`工时预测模型权重缺失: ${WEIGHTS_PATH}，请先运行 python tools/ml/train_workhour_mlp.py 训练导出`);
  }
  if (!fs.existsSync(META_PATH)) {
    throw new Error(`工时预测模型元数据缺失: ${META_PATH}`);
  }
  weightsCache = JSON.parse(fs.readFileSync(WEIGHTS_PATH, 'utf-8')) as MLPWeights;
  metaCache = JSON.parse(fs.readFileSync(META_PATH, 'utf-8')) as WorkhourModelMeta;
}

/** 获取模型元数据（未加载则先加载） */
export function getModelMeta(): WorkhourModelMeta {
  if (!metaCache) loadModel();
  return metaCache as WorkhourModelMeta;
}

/** 构建 16 维输入特征（与训练脚本 build_features 严格一致） */
export function buildFeatures(
  taskType: string,
  priority: string | undefined,
  estimatedHours: number,
  reworkCount: number,
): number[] {
  const meta = getModelMeta();
  const taskTypes = meta.task_types;
  const priorities = meta.priorities;

  const vec: number[] = [];
  // task_type one-hot
  vec.push(...taskTypes.map(t => (taskType === t ? 1 : 0)));
  // priority one-hot
  vec.push(...priorities.map(p => (priority === p ? 1 : 0)));
  // 数值特征
  vec.push(estimatedHours, reworkCount);
  return vec;
}

/** 矩阵乘向量 + 偏置（MLP 全连接层前向） */
function matVec(w: number[][], b: number[], x: number[]): number[] {
  return w.map((row, i) => row.reduce((sum, v, j) => sum + v * x[j], 0) + b[i]);
}

function relu(x: number): number {
  return x > 0 ? x : 0;
}

/**
 * MLP 前向传播推理
 * 返回预测工时（下限保护 0.1h，与训练评估一致）
 */
export function predictWorkhourMl(features: number[]): number {
  if (!weightsCache) loadModel();
  const w = weightsCache as MLPWeights;
  const h1 = matVec(w.fc1_w, w.fc1_b, features).map(relu);
  const h2 = matVec(w.fc2_w, w.fc2_b, h1).map(relu);
  const out = matVec(w.fc3_w, w.fc3_b, h2);
  return Math.max(0.1, out[0]);
}
