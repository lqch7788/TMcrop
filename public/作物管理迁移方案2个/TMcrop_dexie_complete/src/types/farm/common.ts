/**
 * 农事管理模块 - 通用类型定义
 * 包含操作类型枚举、状态常量、选项配置等
 */

// ============================================
// 农事操作类型
// ============================================
export const FARM_OPERATION_TYPES = [
  { value: 'planting', label: '定植' },
  { value: 'irrigation', label: '灌溉' },
  { value: 'fertilization', label: '施肥' },
  { value: 'pest_control', label: '病虫害防治' },
  { value: 'pruning', label: '修剪' },
  { value: 'harvest', label: '采收' },
  { value: 'weeding', label: '中耕除草' },
  { value: 'other', label: '其他' },
] as const;

export type FarmOperationType = typeof FARM_OPERATION_TYPES[number]['value'];

// 获取操作类型名称
export function getOperationTypeName(type: string): string {
  const found = FARM_OPERATION_TYPES.find(t => t.value === type);
  return found?.label || type;
}

// ============================================
// 通用状态
// ============================================
export const COMMON_STATUS = {
  PENDING: 'pending',
  IN_PROGRESS: 'in_progress',
  COMPLETED: 'completed',
  CANCELLED: 'cancelled',
} as const;

export type CommonStatus = typeof COMMON_STATUS[keyof typeof COMMON_STATUS];

export const STATUS_LABELS: Record<string, string> = {
  [COMMON_STATUS.PENDING]: '待执行',
  [COMMON_STATUS.IN_PROGRESS]: '进行中',
  [COMMON_STATUS.COMPLETED]: '已完成',
  [COMMON_STATUS.CANCELLED]: '已取消',
  draft: '草稿',
  normal: '正常',
  attention: '需关注',
  critical: '异常',
};

// 获取状态标签
export function getStatusLabel(status: string): string {
  return STATUS_LABELS[status] || status;
}

// ============================================
// 品质等级
// ============================================
export const HARVEST_GRADES = [
  { value: 'A', label: 'A级' },
  { value: 'B', label: 'B级' },
  { value: 'C', label: 'C级' },
] as const;

export type HarvestGrade = typeof HARVEST_GRADES[number]['value'];

// 获取品质等级标签
export function getGradeLabel(grade: string): string {
  const found = HARVEST_GRADES.find(g => g.value === grade);
  return found?.label || grade;
}

// ============================================
// 采收状态
// ============================================
export const HARVEST_STATUS = {
  PENDING: 'pending',       // 待采收
  HARVESTING: 'harvesting', // 采收中
  HARVESTED: 'harvested',   // 已采收
  GRADED: 'graded',         // 已分级
  STORED: 'stored',          // 已入库
} as const;

export const HARVEST_STATUS_LABELS: Record<string, string> = {
  [HARVEST_STATUS.PENDING]: '待采收',
  [HARVEST_STATUS.HARVESTING]: '采收中',
  [HARVEST_STATUS.HARVESTED]: '已采收',
  [HARVEST_STATUS.GRADED]: '已分级',
  [HARVEST_STATUS.STORED]: '已入库',
};

// 获取采收状态标签
export function getHarvestStatusLabel(status: string): string {
  return HARVEST_STATUS_LABELS[status] || status;
}

// ============================================
// 工作量单位
// ============================================
export const WORKLOAD_UNITS = [
  { value: '株', label: '株', desc: '用于定植等按株计数' },
  { value: '㎡', label: '平方米', desc: '用于灌溉、除草等按面积' },
  { value: 'kg', label: '公斤', desc: '用于采收等按重量' },
  { value: '米', label: '米', desc: '用于铺设管道等按长度' },
  { value: '袋', label: '袋', desc: '用于肥料等按袋' },
  { value: '箱', label: '箱', desc: '用于采收包装等' },
] as const;

export type WorkloadUnit = typeof WORKLOAD_UNITS[number]['value'];

// ============================================
// 巡田状态
// ============================================
export const INSPECTION_STATUS = {
  NORMAL: 'normal',         // 正常
  ATTENTION: 'attention',   // 需关注
  CRITICAL: 'critical',     // 异常
} as const;

export const INSPECTION_STATUS_LABELS: Record<string, string> = {
  [INSPECTION_STATUS.NORMAL]: '正常',
  [INSPECTION_STATUS.ATTENTION]: '需关注',
  [INSPECTION_STATUS.CRITICAL]: '异常',
};

// 获取巡田状态标签
export function getInspectionStatusLabel(status: string): string {
  return INSPECTION_STATUS_LABELS[status] || status;
}

// ============================================
// 作物状态
// ============================================
export const CROP_STATUS_OPTIONS = [
  { value: '良好', label: '良好' },
  { value: '一般', label: '一般' },
  { value: '较差', label: '较差' },
  { value: '有病虫害', label: '有病虫害' },
] as const;

// ============================================
// 天气选项
// ============================================
export const WEATHER_OPTIONS = [
  { value: '晴', label: '晴' },
  { value: '多云', label: '多云' },
  { value: '阴', label: '阴' },
  { value: '雨', label: '雨' },
  { value: '雪', label: '雪' },
  { value: '雾', label: '雾' },
] as const;

// ============================================
// 问题严重程度
// ============================================
export const PROBLEM_SEVERITY = {
  LIGHT: '轻微',
  MEDIUM: '中等',
  SERIOUS: '严重',
} as const;

// ============================================
// 问题处理状态（已废弃，请使用 feedbackRequired）
// ============================================
export const PROBLEM_STATUS = {
  PENDING: '待处理',
  PROCESSING: '处理中',
  RESOLVED: '已处理',
} as const;

// ============================================
// 问题分类（用于巡查问题统计）
// ============================================
export const ISSUE_CATEGORIES = [
  { value: 'disease', label: '病害' },
  { value: 'pest', label: '虫害' },
  { value: 'environment', label: '环境' },
  { value: 'growth', label: '长势' },
  { value: 'equipment', label: '设备' },
  { value: 'other', label: '其他' },
] as const;

export type IssueCategory = typeof ISSUE_CATEGORIES[number]['value'];

// ============================================
// 问题预设选项（按分类）
// ============================================
export const ISSUE_PRESETS: Record<IssueCategory, string[]> = {
  disease: ['灰霉病', '病毒病', '白粉病', '枯萎病', '疫病', '叶霉病'],
  pest: ['蚜虫', '红蜘蛛', '白粉虱', '蓟马', '菜青虫', '粉蝶'],
  environment: ['温度过高', '温度过低', '湿度过大', '积水', '通风不良', '光照不足'],
  growth: ['叶片发黄', '萎蔫', '生长缓慢', '畸形', '落花落果', '徒长'],
  equipment: ['滴灌异常', '遮阳网故障', '通风异常', '灌溉系统故障', '施肥系统故障'],
  other: [],
};

// ============================================
// 期望完成时间选项
// ============================================
export const COMPLETION_TIME_OPTIONS = [
  { value: 'today', label: '今天' },
  { value: 'tomorrow', label: '明天' },
  { value: 'three_days', label: '3天内' },
  { value: 'week', label: '本周' },
] as const;

export type CompletionTime = typeof COMPLETION_TIME_OPTIONS[number]['value'];

// 获取期望完成时间标签
export function getCompletionTimeLabel(value: string): string {
  const found = COMPLETION_TIME_OPTIONS.find(t => t.value === value);
  return found?.label || value;
}

// ============================================
// 优先级
// ============================================
export const PRIORITY_OPTIONS = [
  { value: 'high', label: '高', color: 'red' },
  { value: 'medium', label: '中', color: 'yellow' },
  { value: 'low', label: '低', color: 'green' },
] as const;

export type Priority = typeof PRIORITY_OPTIONS[number]['value'];

// ============================================
// 导出统一接口
// ============================================
export const farmCommonExports = {
  FARM_OPERATION_TYPES,
  COMMON_STATUS,
  STATUS_LABELS,
  HARVEST_GRADES,
  HARVEST_STATUS,
  HARVEST_STATUS_LABELS,
  WORKLOAD_UNITS,
  INSPECTION_STATUS,
  INSPECTION_STATUS_LABELS,
  CROP_STATUS_OPTIONS,
  WEATHER_OPTIONS,
  PROBLEM_SEVERITY,
  PROBLEM_STATUS,
  PRIORITY_OPTIONS,
};

// ============================================
// 智能推荐类型定义
// ============================================

/**
 * 推荐来源类型
 */
export type RecommendationSourceType =
  | 'env_alert'    // 环境异常预警
  | 'pest_alert'   // 病虫害预警
  | 'stage_task'    // 生长阶段任务
  | 'periodic'      // 例行任务
  | 'weather';     // 天气相关任务

/**
 * 推荐优先级
 */
export type RecommendationPriority = 'urgent' | 'high' | 'medium' | 'low';

/**
 * 推荐状态
 */
export type RecommendationStatus = 'pending' | 'accepted' | 'rejected' | 'expired';

/**
 * 环境参数类型
 */
export type EnvMetricType = 'temperature' | 'humidity' | 'soil_moisture' | 'soil_ec' | 'soil_ph' | 'light' | 'co2';

/**
 * 环境预警规则
 */
export interface EnvAlertRule {
  type: EnvMetricType;
  cropTypes: string[];
  thresholds: { min: number; max: number };
  unit: string;
  action: FarmOperationType[];
  severity: 'warning' | 'critical';
}

/**
 * 环境预警
 */
export interface EnvAlert {
  id: string;
  alertId: string;                    // 预警编号 ALERT20260413-001
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  batchId?: string;
  batchCode?: string;
  metricType: EnvMetricType;
  metricTypeName: string;
  currentValue: number;
  threshold: { min: number; max: number };
  unit: string;
  severity: 'warning' | 'critical';
  recommendedActions: FarmOperationType[];
  suggestedDate: string;
  latestDate?: string;
  source: 'iot_sensor';
  createdAt: string;
}

/**
 * 病虫害预警规则
 */
export interface PestAlertRule {
  keywords: string[];
  cropTypes: string[];
  severity: 'attention' | 'critical';
  action: FarmOperationType[];
  urgencyLevel: number;  // 1-5, 5为最紧急
}

/**
 * 病虫害预警
 */
export interface PestAlert {
  id: string;
  alertId: string;                    // 预警编号 ALERT20260413-001
  greenhouseId: string;
  greenhouseName: string;
  cropName: string;
  batchId?: string;
  batchCode?: string;
  issueType: string;                  // 问题类型
  severity: 'attention' | 'critical';
  recommendedActions: FarmOperationType[];
  urgencyLevel: number;
  suggestedDate: string;
  latestDate?: string;
  source: 'inspection';
  sourceRecordId?: string;
  sourceRecordCode?: string;
  createdAt: string;
}

/**
 * 生长阶段任务推荐
 */
export interface StageTaskRecommendation {
  id: string;
  greenhouseId: string;
  greenhouseName: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  currentStage: string;
  currentStageName: string;
  recommendedTasks: {
    type: FarmOperationType;
    taskName: string;
    reason: string;
    daysSinceLast?: number;
    urgency: RecommendationPriority;
  }[];
  nextStageDate?: string;
  daysToNextStage?: number;
  suggestedDate: string;
  latestDate?: string;
}

/**
 * 推荐证据
 */
export interface RecommendationEvidence {
  type: string;
  label: string;
  value: string;
}

/**
 * 智能推荐
 */
export interface SmartRecommendation {
  id: string;
  recommendId: string;               // 推荐编号 REC20260413-001

  // 来源分析
  source: {
    type: RecommendationSourceType;
    description: string;
    dataReference: string;          // 引用数据ID
  };

  // 任务信息
  task: {
    types: FarmOperationType[];
    typeLabels: string[];
    field: string;
    fieldId: string;
    crop: string;
    batchId?: string;
    batchCode?: string;
    workload?: number;
    unit?: string;
    estimatedHours?: number;
    suggestedDate: string;
    latestDate?: string;
  };

  // 推荐理由
  reason: {
    primary: string;                 // 主要原因
    secondary: string[];             // 次要原因
    evidence: RecommendationEvidence[];
  };

  // 人员匹配
  assignment: {
    recommendedWorkerId: string;
    recommendedWorkerName: string;
    matchScore: number;              // 0-100
    skillsMatch: {
      required: string;
      workerHas: boolean;
    }[];
    alternatives: {                 // 备选人员
      workerId: string;
      workerName: string;
      matchScore: number;
    }[];
  };

  // 优先级
  priority: {
    level: RecommendationPriority;
    score: number;                   // 0-100
    factors: {
      name: string;
      weight: number;
      value: number;
    }[];
  };

  // 状态
  status: RecommendationStatus;
  createdAt: string;
  expiresAt?: string;
}

/**
 * 作物阶段任务定义
 */
export interface CropStageTasks {
  tasks: FarmOperationType[];
  nextStage?: string;
  duration?: number;
  intervalDays?: number;             // 任务间隔天数
}

/**
 * 作物阶段任务映射
 */
export type CropStageTaskMap = Record<string, Record<string, CropStageTasks>>;

/**
 * 技能到农事操作的映射
 */
export type SkillOperationMap = Record<FarmOperationType, string[]>;

/**
 * 工人技能匹配结果
 */
export interface WorkerSkillMatch {
  workerId: string;
  workerName: string;
  taskType: FarmOperationType;
  matchScore: number;
  factors: {
    skillMatch: {
      required: string;
      workerHas: boolean;
      proficiency?: string;
    }[];
    score: number;
  };
  locationMatch: {
    workZone: string;
    taskZone: string;
    distance?: number;
    score: number;
  };
  workloadMatch: {
    currentLoad: number;             // 0-100%
    availableCapacity: number;
    score: number;
  };
  performanceMatch?: {
    avgCompletionRate: number;
    avgOnTimeRate: number;
    score: number;
  };
}

/**
 * 推荐规则
 */
export interface RecommendationRule {
  id: string;
  name: string;
  type: 'env' | 'pest' | 'stage' | 'periodic' | 'workload' | 'weather';
  enabled: boolean;
  conditions: {
    field: string;
    operator: '>' | '<' | '>=' | '<=' | '==' | 'contains' | '!=';
    value: string | number | boolean;
  }[];
  actions: {
    taskTypes: FarmOperationType[];
    priority: RecommendationPriority;
    assignRule: 'auto' | 'manual' | 'skill_match';
    notifyUsers?: string[];
  };
  cooldownHours: number;             // 推荐间隔（小时）
  priority: number;                  // 规则优先级
}

/**
 * 智能推荐筛选器
 */
export interface RecommendationFilters {
  sourceTypes?: RecommendationSourceType[];
  priorityLevels?: RecommendationPriority[];
  fieldIds?: string[];
  cropTypes?: string[];
  onlyUrgent?: boolean;
  onlyMine?: boolean;                // 仅显示我负责的
  startDate?: string;
  endDate?: string;
}

/**
 * 智能推荐 Hook 返回类型
 */
export interface UseSmartRecommendationReturn {
  // 状态
  recommendations: SmartRecommendation[];
  envAlerts: EnvAlert[];
  pestAlerts: PestAlert[];
  stageRecommendations: StageTaskRecommendation[];
  isLoading: boolean;
  error: string | null;

  // 筛选
  filters: RecommendationFilters;
  setFilters: (filters: RecommendationFilters) => void;

  // 操作
  refresh: () => void;
  acceptRecommendation: (id: string) => void;
  rejectRecommendation: (id: string) => void;
  acceptAll: (ids: string[]) => void;

  // 统计数据
  stats: {
    total: number;
    urgent: number;
    high: number;
    medium: number;
    low: number;
  };
}
