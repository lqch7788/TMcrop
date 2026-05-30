/**
 * 智能派工系统 - 规划类型定义
 * 包含每日/月度任务规划相关的类型定义
 */

// ============================================
// 预测任务类型
// ============================================

/** 预测任务 */
export interface PredictedTask {
  id: string;
  batchId: string;
  batchCode: string;
  cropName: string;
  greenhouseId: string;
  greenhouseName: string;
  plantingArea: number;
  stage: string;
  stageName: string;
  taskType: string;
  taskTypeName: string;
  suggestedDate: string;
  estimatedHours: number;
  estimatedWorkers: number;
  priority: 'high' | 'medium' | 'low';
  urgency: 'urgent' | 'high' | 'normal';
  reason: string;
  isOverdue: boolean;
  daysSinceLastTask: number;
  intervalDays: number;
}

// ============================================
// 日计划类型
// ============================================

/** 日计划 */
export interface DailyPlan {
  date: string;
  tasks: PredictedTask[];
  totalTasks: number;
  totalHours: number;
  requiredWorkers: number;
  // AI派工建议
  workerSuggestions?: {
    workerId: string;
    workerName: string;
    taskId: string;
    confidenceScore: number;
  }[];
}

/** API存储用的日计划类型（包含元数据） */
export interface DailyPlanRecord {
  id?: string;
  planDate: string;
  planData: DailyPlan | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 周汇总类型
// ============================================

/** 周汇总 */
export interface WeeklySummary {
  weekNumber: number;
  startDate: string;
  endDate: string;
  taskCount: number;
  totalHours: number;
  keyCrops: string[];
  keyTasks: string[];
  requiredWorkers: number;
}

// ============================================
// 资源需求类型
// ============================================

/** 物资需求 */
export interface MaterialRequirement {
  materialName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
  category?: 'fertilizer' | 'pesticide' | 'water' | 'other';
}

/** 工具需求 */
export interface ToolRequirement {
  toolName: string;
  specification: string;
  quantity: number;
  unit: string;
  estimatedUnitPrice: number;
  estimatedTotalPrice: number;
  status: 'available' | 'need_repair' | 'need_purchase';
  notes?: string;
}

/** 人员需求 */
export interface WorkerRequirement {
  role: string;
  skill: string;
  requiredCount: number;
  estimatedHours: number;
  suggestedWorkers?: string[];
}

// ============================================
// 成本明细类型
// ============================================

/** 成本明细 */
export interface CostBreakdown {
  materialCost: number;
  toolCost: number;
  laborCost: number;
  total: number;
}

// ============================================
// 月度计划类型
// ============================================

/** 月度计划 */
export interface MonthlyPlan {
  month: string;
  batches: string[];
  totalTasks: number;
  totalHours: number;
  totalCost: number;
  weeklySummaries: WeeklySummary[];
  taskTypeBreakdown: Record<string, number>;
  dailyPlans: Record<string, DailyPlan>;
  materialRequirements: MaterialRequirement[];
  toolRequirements: ToolRequirement[];
  workerRequirements: WorkerRequirement[];
  costBreakdown: CostBreakdown;
  generatedAt: string;
  generatedBy: string;
  planningHorizon: 'monthly';
}

/** API存储用的月度计划类型（包含元数据） */
export interface MonthlyPlanRecord {
  id?: string;
  planMonth: string;
  planData: MonthlyPlan | null;
  createdBy?: string;
  createdAt?: string;
  updatedAt?: string;
}

// ============================================
// 每日工单汇总报告类型
// ============================================

/** 任务进度分析 */
export interface TaskProgressAnalysis {
  taskId: string;
  taskName: string;
  plannedDate: string;
  actualCompletionDate?: string;
  progressStatus: 'on_track' | 'ahead' | 'delayed' | 'cancelled';
  delayDays?: number;
  delayReason?: string;
  originalAssignee?: string;
  actualAssignee?: string;
  taskType?: string;
  greenhouse?: string;
}

/** 人员负荷分析 */
export interface WorkerLoadAnalysis {
  workerId: string;
  workerName: string;
  todayTasks: number;
  completedTasks: number;
  completionRate: number;
  loadStatus: 'normal' | 'busy' | 'overloaded';
  availability: 'available' | 'busy';
  currentTasks?: string[];
}

/** 天气数据 */
export interface WeatherData {
  date: string;
  temperature?: number;
  condition?: string;
  rainfall?: number;
  windSpeed?: number;
  forecast?: string;
  recommendation?: string;
}

/** 每日工单汇总报告 */
export interface DailyWorkOrderReport {
  date: string;
  totalTasks: number;
  pendingTasks: number;
  inProgressTasks: number;
  completedTasks: number;
  overdueTasks: number;
  aheadTasks: TaskProgressAnalysis[];
  onTrackTasks: TaskProgressAnalysis[];
  delayedTasks: TaskProgressAnalysis[];
  unfinishedTasks: TaskProgressAnalysis[];
  workerLoadAnalysis: WorkerLoadAnalysis[];
  aiRecommendations: string[];
  weatherForecast?: WeatherData;
}

// ============================================
// 定时任务类型
// ============================================

/** 定时任务配置 */
export interface ScheduledTaskConfig {
  id: string;
  name: string;
  cronExpression: string;
  enabled: boolean;
  description?: string;
  lastRunAt?: string;
  nextRunAt?: string;
  runCount: number;
  successCount: number;
  failureCount: number;
}

/** 定时任务类型枚举 */
export type ScheduledTaskType =
  | 'daily_planning'      // 每日任务规划
  | 'daily_report'        // 每日工单汇总
  | 'weather_sync'        // 天气同步
  | 'iot_data_sync'       // IoT数据同步
  | 'task_prediction'     // 任务预测更新
  | 'notification_send';  // 通知发送

// ============================================
// 规划视图类型
// ============================================

/** 日历任务项 */
export interface CalendarTaskItem {
  date: string;
  tasks: {
    id: string;
    title: string;
    type: 'predicted' | 'scheduled' | 'urgent';
    priority: 'high' | 'medium' | 'low';
    status: 'pending' | 'in_progress' | 'completed';
    color?: string;
  }[];
}

/** 导出格式 */
export type ExportFormat = 'excel' | 'pdf' | 'csv';

/** 规划导出配置 */
export interface PlanningExportConfig {
  format: ExportFormat;
  includeMaterials: boolean;
  includeTools: boolean;
  includeWorkers: boolean;
  includeCost: boolean;
  includeCalendar: boolean;
}
