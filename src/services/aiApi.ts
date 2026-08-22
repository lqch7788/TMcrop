/**
 * AI 服务前端封装（V1）
 * 2026-08-22：智能任务中心 AI-06 工时预测 MVP
 *
 * 所有 /api/ai/* 端点统一入口，组件不直接调用 enhancedApiClient。
 * 与 V1.1 现有 services/apiDispatchService.ts 等模式一致。
 */

import { enhancedApiClient } from '@/lib/apiClient';

// ============ AI-06 工时预测 ============

export interface WorkhourPredictInput {
  task_type: string;              // 必填：任务类型（planting/fertilization/irrigation/...）
  priority?: string;              // urgent/high/normal/low
  greenhouse_id?: string;
  assignee_id?: string;
  task_id?: string;
}

export interface WorkhourPredictResult {
  predictedHours: number;
  confidenceLow: number;
  confidenceHigh: number;
  modelVersion: string;
  modelType: 'rule-based' | 'onnx-xgboost';
  sampleCount: number;
  xaiReasons: string[];
  fallbackUsed: boolean;
}

export interface WorkhourFeedbackInput {
  task_id: string;
  actual_hours: number;
  accepted: boolean;
}

// ============ AI-01 派工推荐 ============

export interface DispatchRecommendInput {
  task_type: string;               // 必填
  required_skills?: string[];       // 任务所需技能
  greenhouse_id?: string;
  priority?: 'urgent' | 'high' | 'normal' | 'low';
  batch_id?: string;
  estimated_hours?: number;
  due_date?: string;
  team_ids?: string[];              // 班组过滤
}

export interface WorkerRecommendation {
  worker_id: string;
  worker_name: string;
  match_score: number;
  factor_scores: Record<string, number>;
  xai_reasons: string[];
}

export interface DispatchRecommendResult {
  recommendations: WorkerRecommendation[];
  algorithm_version: string;
  total_candidates: number;
}

// ============ AI API 封装 ============

export const aiApi = {
  workhour: {
    /**
     * AI-06 工时预测
     * 输入：任务信息 → 输出：预计工时 + 置信区间 + XAI 推理依据
     */
    predict: (input: WorkhourPredictInput): Promise<{ success: boolean; data: WorkhourPredictResult }> =>
      enhancedApiClient.post('/ai/workhour/predict', input),

    /**
     * 反馈实际工时（写入 farm_tasks.actual_hours）
     * AI 训练数据采集入口
     */
    feedback: (input: WorkhourFeedbackInput): Promise<{ success: boolean; data: { taskId: string; actualHours: number; estimatedVsActualRatio: number } }> =>
      enhancedApiClient.post('/ai/workhour/feedback', input),

    /**
     * 查询任务的历史预测列表
     */
    list: (taskId: string): Promise<{ success: boolean; data: { task: any; predictions: any[] } }> =>
      enhancedApiClient.get(`/ai/workhour/predictions?task_id=${taskId}`),
  },

  dispatch: {
    /**
     * AI-01 派工推荐（7 因子加权评分）
     * 输入：任务信息 → 输出：推荐员工列表（按 match_score 降序）
     */
    recommend: (input: DispatchRecommendInput): Promise<{ success: boolean; data: DispatchRecommendResult }> =>
      enhancedApiClient.post('/ai/dispatch/recommend', input),
  },
};

export default aiApi;
