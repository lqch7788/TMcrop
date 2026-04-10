/**
 * Hooks 统一导出
 */

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
