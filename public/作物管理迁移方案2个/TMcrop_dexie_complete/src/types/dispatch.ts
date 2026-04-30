/**
 * 智能派工系统类型定义
 * 包含配置、权重、置信度、建议动作等类型
 */

// ============================================
// 派工权重配置
// ============================================

/** 静态权重配置 */
export interface DispatchWeights {
  skillMatch: number;        // 技能匹配度
  location: number;           // 地理位置
  currentLoad: number;        // 当前负荷
  historicalPerformance: number; // 历史表现
  urgency: number;            // 紧急程度
  batchFamiliarity: number;  // 批次熟悉度
  growthStageMatch: number;   // 生长周期适配
}

/** 动态权重调整规则 */
export interface DynamicWeightAdjustment {
  skill?: number;
  load?: number;
  location?: number;
  performance?: number;
}

/** 派工配置 */
export interface DispatchConfig {
  weights: DispatchWeights;
  thresholds: {
    confidenceHigh: number;    // 高置信度阈值 >= 80
    confidenceMedium: number;   // 中置信度阈值 >= 60
    maxTasksPerWorker: number; // 每人最大任务数
    overdueDays: number;       // 超期天数阈值
  };
  dynamicAdjustments: {
    urgentTask: DynamicWeightAdjustment;
    largeArea: DynamicWeightAdjustment;
    pestControl: DynamicWeightAdjustment;
  };
}

// ============================================
// AI推荐配置
// ============================================

/** AI推荐配置 */
export interface AIRecommendConfig {
  showTopN: number;                // 显示前N条推荐
  defaultSelectTop: boolean;        // 默认选中第一名
  enableReRecommend: boolean;       // 允许重新推荐
  enableManualSelect: boolean;      // 允许手动选择
  scoreThreshold: number;          // 分数阈值
  optimizationThreshold: number;    // 优化建议阈值（默认15分）
}

/** 默认AI推荐配置 */
export const DEFAULT_AI_RECOMMEND_CONFIG: AIRecommendConfig = {
  showTopN: 3,
  defaultSelectTop: true,
  enableReRecommend: true,
  enableManualSelect: true,
  scoreThreshold: 60,
  optimizationThreshold: 15,
};

/** 统一任务输入（用于AI推荐面板） */
export interface UnifiedTaskInput {
  id: string;
  taskCode: string;                // 任务编号
  title: string;                   // 任务标题
  type: string;                    // 任务类型
  typeName: string;                // 类型名称
  priority: 'urgent' | 'high' | 'normal' | 'low'; // 优先级
  workZone: string;                // 工作区域
  greenhouse: string;               // 温室/大棚
  cropName: string;                // 作物名称
  batchId?: string;               // 关联批次ID
  batchCode?: string;              // 关联批次编号
  requiredSkills: string[];        // 所需技能标签
  estimatedHours: number;           // 预计工时
  dueDate: string;                 // 截止日期
  assigneeId?: string;             // 当前执行人ID
  assigneeName?: string;           // 当前执行人姓名
}

/** AI优化建议 */
export interface AIOptimizationSuggestion {
  taskId: string;                  // 任务ID
  originalWorkerId: string;         // 原执行人ID
  originalWorkerName: string;       // 原执行人姓名
  suggestedWorkerId: string;        // 建议执行人ID
  suggestedWorkerName: string;      // 建议执行人姓名
  confidenceScore: number;          // 置信度评分
  originalScore: number;            // 原执行人评分
  suggestedScore: number;            // 建议执行人评分
  scoreDiff: number;                // 分数差值
  reason: string;                  // 优化理由
}

/** 默认派工配置 */
export const DEFAULT_DISPATCH_CONFIG: DispatchConfig = {
  weights: {
    skillMatch: 0.30,
    location: 0.20,
    currentLoad: 0.20,
    historicalPerformance: 0.15,
    urgency: 0.10,
    batchFamiliarity: 0.03,
    growthStageMatch: 0.02,
  },
  thresholds: {
    confidenceHigh: 80,
    confidenceMedium: 60,
    maxTasksPerWorker: 2,
    overdueDays: 2,
  },
  dynamicAdjustments: {
    urgentTask: { performance: 0.25, load: 0.15 },
    largeArea: { skillMatch: 0.45, load: 0.15 },
    pestControl: { skillMatch: 0.50, load: 0.15 },
  },
};

// ============================================
// 置信度与建议动作
// ============================================

/** 置信度等级 */
export type ConfidenceLevel = 'high' | 'medium' | 'low';

/** 建议动作 */
export type SuggestedAction = 'dispatch' | 'delay' | 'split' | 'manual';

/** 增强版推荐结果 */
export interface EnhancedRecommendation {
  worker: {
    id: string;
    name: string;
    workerType: string;
    workZone: string;
    skills: string[];
    currentLoad: number;
    availableHoursToday: number;
    recentPerformance: number;
    distance: Record<string, number>;
    batchFamiliarity: Record<string, number>;
    attendanceStatus: 'working' | 'off' | 'on_break';
  };
  matchScore: number;              // 综合得分
  skillMatchRate: number;         // 技能匹配度
  locationScore: number;          // 位置得分
  loadScore: number;              // 负荷得分
  performanceScore: number;        // 表现得分
  batchFamiliarityScore: number;  // 批次熟悉度得分

  // 置信度
  confidenceLevel: ConfidenceLevel;
  confidenceScore: number;

  // 建议动作
  suggestedAction: SuggestedAction;

  // 推荐理由（增强版）
  reasons: {
    positive: string[];   // 正面理由
    warning: string[];    // 警告提示
  };

  // 风险警告
  riskWarnings: string[];

  // 状态信息
  isAvailable: boolean;
  currentTaskCount: number;
  attendanceStatus: 'working' | 'off' | 'on_break';
}

// ============================================
// 派发状态与模式
// ============================================

/**
 * 派发状态枚举
 * 用于跟踪任务派发的完整生命周期
 */
export type DispatchStatus =
  | 'draft'           // 草稿
  | 'pending_ai'      // 待AI推荐
  | 'recommended'     // AI已推荐
  | 'pending'         // 已派发
  | 'accepted'       // 已接受
  | 'in_progress'    // 执行中
  | 'completed'       // 已完成
  | 'rejected';       // 已驳回

/**
 * 派发模式枚举
 * 定义任务派发的方式
 */
export type DispatchMode = 'manual' | 'ai_assisted' | 'ai_auto';

/**
 * 模式配置
 * 定义各派发模式的详细参数
 */
export interface DispatchModeConfig {
  mode: DispatchMode;  // 当前模式
  // 手动模式配置
  manual: {
    enabled: boolean;
  };
  // AI辅助模式配置
  ai_assisted: {
    enabled: boolean;
    showRecommendationOnCreate: boolean;   // 创建时显示推荐
    defaultSelectTopWorker: boolean;        // 默认选择最优工人
    requireConfirmation: boolean;          // 需要确认
  };
  // AI自动模式配置
  ai_auto: {
    enabled: boolean;
    autoPredictTasks: boolean;              // 自动预测任务
    autoRecommendWorkers: boolean;          // 自动推荐工人
    requireBatchConfirmation: boolean;     // 需要批量确认
    confidenceThreshold: number;            // 置信度阈值
    notifyWorkers: boolean;                 // 通知工人
  };
  // 模式切换配置
  allowModeSwitch: boolean;  // 是否允许模式切换
  defaultMode: DispatchMode; // 默认模式
}

/**
 * 默认模式配置
 */
export const DEFAULT_DISPATCH_MODE_CONFIG: DispatchModeConfig = {
  mode: 'ai_assisted',
  manual: {
    enabled: true,
  },
  ai_assisted: {
    enabled: true,
    showRecommendationOnCreate: true,
    defaultSelectTopWorker: false,
    requireConfirmation: true,
  },
  ai_auto: {
    enabled: false,
    autoPredictTasks: true,
    autoRecommendWorkers: true,
    requireBatchConfirmation: true,
    confidenceThreshold: 80,
    notifyWorkers: true,
  },
  allowModeSwitch: true,
  defaultMode: 'ai_assisted',
};
