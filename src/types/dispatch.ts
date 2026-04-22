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
