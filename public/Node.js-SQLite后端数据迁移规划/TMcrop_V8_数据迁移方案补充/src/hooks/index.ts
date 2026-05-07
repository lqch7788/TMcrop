/**
 * Hooks 统一导出
 */

// 部门选项相关
export { useDepartmentOptions, useDepartmentOptionsWithValue } from './useDepartmentOptions';

// 生产汇总相关
export { useBatchSummary, useBatchFilterOptions } from './useBatchSummary';

// 每日工单汇总相关
export { useDailyWorkSummary } from './useDailyWorkSummary';

// 每日问题汇总相关
export { useDailyProblemSummary } from './useDailyProblemSummary';

// 生产报表相关
export { useProductionReports } from './useProductionReports';

// localStorage 持久化
export { useLocalStorage, STORAGE_KEYS, hasPersistedData, clearAllPersistedData } from './useLocalStorage';

// 工单持久化
export { usePersistentWorkLogs, INITIAL_WORK_LOGS } from './usePersistentWorkLogs';

// 考勤持久化
export { usePersistentAttendance, INITIAL_ATTENDANCE } from './usePersistentAttendance';

// 问题记录持久化
export { usePersistentProblems, INITIAL_PROBLEMS, type ProblemEntry } from './usePersistentProblems';

// 问题分派
export { useProblemDispatch } from './useProblemDispatch';

// 派工模式配置
export { useDispatchModeConfig } from './useDispatchModeConfig';

// 月度任务规划
export { useMonthlyTaskPlanning } from './useMonthlyTaskPlanning';
export type {
  MonthlyPlan,
  WeeklySummary,
  MaterialRequirement,
  ToolRequirement,
  WorkerRequirement,
  CostBreakdown,
  DailyPlan,
  PredictedTask,
} from './useMonthlyTaskPlanning';

// AI优化建议
export { useAIOptimization } from './useAIOptimization';
export type { UseAIOptimizationReturn } from './useAIOptimization';
