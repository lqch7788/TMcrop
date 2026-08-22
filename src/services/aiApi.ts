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

// ============ AI-04 作物生长预测 ============

export interface GrowthPredictInput {
  crop_type: string;               // 必填：番茄/草莓/黄瓜/...
  batch_id?: string;
  greenhouse_id?: string;
  plant_date?: string;              // 种植日期
  expected_harvest_date?: string;
  base_temperature?: number;
  variety?: string;
}

export interface GrowthPredictResult {
  cropType: string;
  currentStage: string;
  daysSincePlanting: number;
  cumulativeGdd: number;
  expectedHarvestDate: string;
  daysToHarvest: number;
  yieldPredictionKg: number;
  yieldConfidenceLow: number;
  yieldConfidenceHigh: number;
  stageEstimate: { stageName: string; stageStart: string; stageEnd: string; cumulativeGdd: number }[];
  alerts: string[];
  modelVersion: string;
  modelType: 'rule-based' | 'onnx-xgboost';
  xaiReasons: string[];
}

// ============ AI-08 路径优化 ============

export interface RouteOptimizeInput {
  worker_start: { lat: number; lng: number };
  tasks: { task_id: string; lat: number; lng: number; name?: string }[];
  original_order?: string[];
}

export interface RouteOptimizeResult {
  optimizedOrder: string[];
  optimizedSteps: { taskId: string; name?: string; distanceFromPrevKm: number; cumulativeDistanceKm: number }[];
  totalDistanceKm: number;
  originalDistanceKm: number;
  savingsPercent: number;
  algorithm: string;
  modelVersion: string;
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

  growth: {
    /**
     * AI-04 作物生长预测（GDD 积温 + 历史产量）
     * 输入：作物类型 + 种植日期 → 输出：当前阶段 + 预期采收 + 产量预测 + 异常预警
     */
    predict: (input: GrowthPredictInput): Promise<{ success: boolean; data: GrowthPredictResult }> =>
      enhancedApiClient.post('/ai/growth/predict', input),
  },

  route: {
    /**
     * AI-08 路径优化（最近邻 + 2-opt）
     * 输入：工人起点 + 任务位置列表 → 输出：最优顺序 + 节省距离 %
     */
    optimize: (input: RouteOptimizeInput): Promise<{ success: boolean; data: RouteOptimizeResult }> =>
      enhancedApiClient.post('/ai/route/optimize', input),
  },

  pest: {
    /**
     * AI-05 病虫害预警（规则版，V1.1 无 IoT → mock 环境数据）
     * 输入：作物类型 + 可选环境数据 → 输出：风险评分 + 预警等级 + 推荐操作
     */
    alert: (input: { crop_type: string; greenhouse_id?: string; env_data?: any; history_days?: number }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/pest/alert', input),
  },

  qa: {
    /**
     * AI-12 智能问答助手（FTS5 + LLM mock）
     * 输入：自然语言问题 → 输出：意图分类 + 模板化回答 + 知识库引用
     */
    ask: (input: { question: string; context?: string }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/qa/ask', input),
  },

  report: {
    /**
     * AI-13 智能报告生成（模板化 + 数据聚合）
     * 输入：报告类型 + 时间段 → 输出：报告 sections + insights + recommendations
     */
    generate: (input: { report_type: 'daily' | 'weekly' | 'monthly' | 'custom'; start_date?: string; end_date?: string; crop_type?: string; greenhouse_id?: string }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/report/generate', input),
  },

  schedule: {
    /**
     * AI-02 智能排班（CSP 贪心）
     * 输入：员工列表 + 任务列表 + 排班规则 → 输出：7 日排班表 + 合规率 + CV
     */
    generate: (input: any): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/schedule/generate', input),
  },

  resource: {
    /**
     * AI-07 资源优化配置（库存预警 + 采购建议）
     * 输入：可选物料名/仓库 ID → 输出：预警列表 + 采购建议 + 估算成本
     */
    optimize: (input: any): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/resource/optimize', input),
  },

  image: {
    /**
     * AI-09 病虫害图像识别（V1 mock 演示）
     * 输入：image_id + 可选文件名/特征 → 输出：top-3 病虫害预测 + 置信度
     */
    identify: (input: { image_id: string; image_name?: string; crop_type?: string; image_features?: any }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/image/identify', input),
  },

  growthState: {
    /**
     * AI-10 作物生长状态识别（mock + 缺素检测）
     */
    identify: (input: { crop_type: string; batch_id?: string; greenhouse_id?: string; current_gdd?: number }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/growth-state/identify', input),
  },

  voice: {
    /**
     * AI-11 智能语音录入（mock ASR）
     * 输入：转写文本 → 输出：意图 + 结构化字段 + 推荐执行人
     */
    transcribe: (input: { transcribed_text: string; audio_url?: string; context?: string; submitter_id?: string }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/voice/transcribe', input),
  },

  anomaly: {
    /**
     * AI-14 异常检测系统（Z-score + IQR）
     */
    detect: (input?: { check_dimension?: string; lookback_days?: number; threshold_sigma?: number }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/anomaly/detect', input || {}),
  },

  attendance: {
    /**
     * AI-15 出勤异常检测（滑动窗口）
     */
    detect: (input?: { lookback_days?: number; z_threshold?: number }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/attendance/detect', input || {}),
  },

  approval: {
    /**
     * AI-03 智能审批辅助（规则 + 历史匹配）
     */
    suggest: (input: { approval_id?: string; applicant_id: string; applicant_role?: string; approval_type: string; amount?: number; duration_days?: number; reason?: string }): Promise<{ success: boolean; data: any }> =>
      enhancedApiClient.post('/ai/approval/suggest', input),
  },
};

export default aiApi;
