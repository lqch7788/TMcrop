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

// ★ V3.0 Phase 1: 系统配置消费 Hook
export {
  useSystemConfigValue,
  useSystemConfigValueNumber,
  useSystemConfigValueBoolean,
  useSystemConfigValuesByPrefix,
} from './useSystemConfigValue';

// ★ V3.0 Phase 4: 动态主题 Hook
export { useThemeConfig } from './useThemeConfig';

// ★ V3.0 Phase 5: 分页大小 Hook
export { usePageSize } from './usePageSize';

// ★ V3.0 Phase 7: 功能开关 Hook（双轨制）
export { useFeatureFlag, getFeatureFlag } from './useFeatureFlag';

// 生产计划人工成本统计
export { useLaborCostCalc, calculateLaborCost } from './useLaborCostCalc';
export type { LaborCostSummary, LaborCostItem } from './useLaborCostCalc';

// 班组成员管理 Hook
export { useTeamMembers } from './useTeamMembers';
export type { TeamMember, UseTeamMembersResult } from './useTeamMembers';

// 农事任务排班 Hook
export { useFarmTaskSchedule } from './useFarmTaskSchedule';
export type { FarmTaskSchedule, UnscheduledTask, UseFarmTaskScheduleResult } from './useFarmTaskSchedule';
