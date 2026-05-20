/**
 * 农事任务配置 — V3.0 双轨制
 *
 * 数据流: getXxx() → getSystemConfigValue(新key) → Store.getState() → API/DB
 *                          ↓ 未命中
 *                      兜底 DEFAULTS 常量（静态编译时安全网）
 *
 * 旧代码兼容: 原有 as const 导出保留，标记 @deprecated
 * 新代码推荐: 使用 getXxx() 运行时函数，支持系统参数页面动态调整
 */

import { getSystemConfigValue, getSystemConfigValueNumber } from './systemConfigReader';

// ============================================
// 常量兜底值（编译时安全网，值与原有导出相同）
// ============================================

export const OVERTIME_DEFAULTS = {
  acceptWarningHours: 12,
  acceptCriticalHours: 24,
  executionWarningHours: 24,
  executionCriticalHours: 48,
  acceptanceWarningHours: 24,
  acceptanceCriticalHours: 48,
  checkIntervalMs: 5 * 60 * 1000,
} as const;

export const DEADLINE_DEFAULTS = {
  maxExtensions: 3,
  maxExtensionHours: 72,
  totalMaxExtensionHours: 168,
} as const;

export const REMINDER_DEFAULTS = {
  minIntervalMinutes: 60,
  maxRemindersPerDay: 5,
  autoReminderHours: 12,
} as const;

export const REWORK_DEFAULTS = {
  maxReworkCount: 2,
} as const;

export const STORAGE_DEFAULTS = {
  maxRecordsPerTask: 100,
  maxRecords: 500,
  archiveAfterDays: 90,
  warnThreshold: 0.8,
  criticalThreshold: 0.95,
} as const;

// ============================================
// 运行时读取函数（优先Store，兜底常量）
// ============================================

/** 超时配置（7个参数，前缀 task.overtime.*） */
export function getOvertimeConfig(): typeof OVERTIME_DEFAULTS {
  return {
    acceptWarningHours: getSystemConfigValueNumber('task.overtime.accept-warning-hours', OVERTIME_DEFAULTS.acceptWarningHours),
    acceptCriticalHours: getSystemConfigValueNumber('task.overtime.accept-critical-hours', OVERTIME_DEFAULTS.acceptCriticalHours),
    executionWarningHours: getSystemConfigValueNumber('task.overtime.execution-warning-hours', OVERTIME_DEFAULTS.executionWarningHours),
    executionCriticalHours: getSystemConfigValueNumber('task.overtime.execution-critical-hours', OVERTIME_DEFAULTS.executionCriticalHours),
    acceptanceWarningHours: getSystemConfigValueNumber('task.overtime.acceptance-warning-hours', OVERTIME_DEFAULTS.acceptanceWarningHours),
    acceptanceCriticalHours: getSystemConfigValueNumber('task.overtime.acceptance-critical-hours', OVERTIME_DEFAULTS.acceptanceCriticalHours),
    checkIntervalMs: getSystemConfigValueNumber('task.overtime.check-interval-ms', OVERTIME_DEFAULTS.checkIntervalMs),
  };
}

/** 延期限制配置（3个参数，前缀 task.deadline.*） */
export function getDeadlineConfig(): typeof DEADLINE_DEFAULTS {
  return {
    maxExtensions: getSystemConfigValueNumber('task.deadline.max-extensions', DEADLINE_DEFAULTS.maxExtensions),
    maxExtensionHours: getSystemConfigValueNumber('task.deadline.max-extension-hours', DEADLINE_DEFAULTS.maxExtensionHours),
    totalMaxExtensionHours: getSystemConfigValueNumber('task.deadline.total-max-extension-hours', DEADLINE_DEFAULTS.totalMaxExtensionHours),
  };
}

/** 催办限制配置（3个参数，前缀 task.reminder.*） */
export function getReminderConfig(): typeof REMINDER_DEFAULTS {
  return {
    minIntervalMinutes: getSystemConfigValueNumber('task.reminder.min-interval-minutes', REMINDER_DEFAULTS.minIntervalMinutes),
    maxRemindersPerDay: getSystemConfigValueNumber('task.reminder.max-per-day', REMINDER_DEFAULTS.maxRemindersPerDay),
    autoReminderHours: getSystemConfigValueNumber('task.reminder.auto-reminder-hours', REMINDER_DEFAULTS.autoReminderHours),
  };
}

/** 返工规则（前缀 task.rework.*） */
export function getReworkConfig(): typeof REWORK_DEFAULTS {
  return {
    maxReworkCount: getSystemConfigValueNumber('task.rework.max-count', REWORK_DEFAULTS.maxReworkCount),
  };
}

/** 存储容量配置（5个参数，前缀 task.storage.*） */
export function getStorageConfig(): typeof STORAGE_DEFAULTS {
  return {
    maxRecordsPerTask: getSystemConfigValueNumber('task.storage.max-per-task', STORAGE_DEFAULTS.maxRecordsPerTask),
    maxRecords: getSystemConfigValueNumber('task.storage.max-records', STORAGE_DEFAULTS.maxRecords),
    archiveAfterDays: getSystemConfigValueNumber('task.storage.archive-after-days', STORAGE_DEFAULTS.archiveAfterDays),
    warnThreshold: getSystemConfigValueNumber('task.storage.warn-threshold', STORAGE_DEFAULTS.warnThreshold),
    criticalThreshold: getSystemConfigValueNumber('task.storage.critical-threshold', STORAGE_DEFAULTS.criticalThreshold),
  };
}

// ============================================
// JSON 配置（复杂对象，以JSON格式存储在DB）
// ============================================

/** 操作权限矩阵默认值 */
export const TASK_PERMISSIONS_DEFAULTS = {
  withdraw: { roles: ['admin'] as const, statuses: ['pending'] as const },
  cancel: { roles: ['admin'] as const, statuses: ['accepted', 'in_progress'] as const },
  reassign: { roles: ['admin'] as const, statuses: ['failed', 'abandoned'] as const },
  accept: { roles: ['assignee'] as const, statuses: ['pending'] as const },
  verify: { roles: ['assigner', 'admin'] as const, statuses: ['waiting_acceptance'] as const },
  continue: { roles: ['assignee'] as const, statuses: ['rejected'] as const },
  submitProgress: { roles: ['assignee'] as const, statuses: ['accepted', 'in_progress'] as const },
  remind: { roles: ['admin'] as const, statuses: ['*'] as const },
} as const;

/** 操作权限矩阵（运行时，JSON配置） */
export function getTaskPermissions(): typeof TASK_PERMISSIONS_DEFAULTS {
  try {
    const json = getSystemConfigValue('task.permissions', '');
    if (json) return JSON.parse(json);
  } catch { /* 解析失败使用兜底 */ }
  return TASK_PERMISSIONS_DEFAULTS;
}

/** 状态转换限制默认值 */
export const STATUS_TRANSITIONS_DEFAULTS: Record<string, string[]> = {
  draft: ['pending', 'cancelled'],
  pending: ['accepted', 'cancelled'],
  accepted: ['in_progress', 'cancelled'],
  in_progress: ['waiting_acceptance', 'cancelled', 'abandoned'],
  waiting_acceptance: ['completed', 'rejected'],
  rejected: ['in_progress', 'failed'],
  failed: ['pending'],
  abandoned: ['pending'],
  cancelled: [],
  completed: [],
};

/** 状态转换限制（运行时，JSON配置） */
export function getStatusTransitions(): Record<string, string[]> {
  try {
    const json = getSystemConfigValue('task.status-transitions', '');
    if (json) return JSON.parse(json);
  } catch { /* 解析失败使用兜底 */ }
  return STATUS_TRANSITIONS_DEFAULTS;
}

/** 状态配置默认值 */
export const TASK_STATUS_DEFAULTS = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-100' },
  pending: { label: '待接受', color: 'text-gray-600', bg: 'bg-gray-100' },
  accepted: { label: '已接受', color: 'text-blue-600', bg: 'bg-blue-100' },
  in_progress: { label: '处理中', color: 'text-blue-600', bg: 'bg-blue-100' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-100' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-100' },
  rejected: { label: '返工中', color: 'text-red-600', bg: 'bg-red-100' },
  failed: { label: '任务失败', color: 'text-purple-600', bg: 'bg-purple-100' },
  cancelled: { label: '已取消', color: 'text-gray-500', bg: 'bg-gray-50' },
  abandoned: { label: '已放弃', color: 'text-red-400', bg: 'bg-red-50' },
} as const;

/** 状态配置（运行时，JSON配置） */
export function getTaskStatusConfig(): typeof TASK_STATUS_DEFAULTS {
  try {
    const json = getSystemConfigValue('task.status-config', '');
    if (json) {
      const parsed = JSON.parse(json);
      // 确保所有状态都有兜底
      return { ...TASK_STATUS_DEFAULTS, ...parsed };
    }
  } catch { /* 解析失败使用兜底 */ }
  return TASK_STATUS_DEFAULTS;
}

/** 操作行为配置默认值 */
export const TASK_ACTION_DEFAULTS = {
  create: { label: '创建任务', color: 'text-blue-600', bg: 'bg-blue-50' },
  publish: { label: '派发任务', color: 'text-blue-600', bg: 'bg-blue-50' },
  withdraw: { label: '撤回任务', color: 'text-gray-600', bg: 'bg-gray-50' },
  cancel: { label: '取消任务', color: 'text-gray-600', bg: 'bg-gray-50' },
  accept: { label: '接受任务', color: 'text-green-600', bg: 'bg-green-50' },
  start: { label: '开始执行', color: 'text-green-600', bg: 'bg-green-50' },
  progress: { label: '提交进度', color: 'text-blue-600', bg: 'bg-blue-50' },
  submit: { label: '申请验收', color: 'text-orange-600', bg: 'bg-orange-50' },
  overtime_continue: { label: '超时继续', color: 'text-amber-600', bg: 'bg-amber-50' },
  overtime_abandon: { label: '超时放弃', color: 'text-red-600', bg: 'bg-red-50' },
  complete: { label: '验收通过', color: 'text-green-600', bg: 'bg-green-50' },
  reject: { label: '验收驳回', color: 'text-red-600', bg: 'bg-red-50' },
  continue: { label: '继续执行', color: 'text-blue-600', bg: 'bg-blue-50' },
  reassign: { label: '重新派发', color: 'text-purple-600', bg: 'bg-purple-50' },
  remind: { label: '催办', color: 'text-red-600', bg: 'bg-red-50' },
  extend_deadline: { label: '延期', color: 'text-amber-600', bg: 'bg-amber-50' },
} as const;

/** 操作行为配置（运行时，JSON配置） */
export function getTaskActionConfig(): typeof TASK_ACTION_DEFAULTS {
  try {
    const json = getSystemConfigValue('task.action-config', '');
    if (json) {
      const parsed = JSON.parse(json);
      return { ...TASK_ACTION_DEFAULTS, ...parsed };
    }
  } catch { /* 解析失败使用兜底 */ }
  return TASK_ACTION_DEFAULTS;
}

// ============================================
// ★ 向后兼容：保留旧导出（标记 @deprecated）
// ============================================

/** @deprecated 使用 getOvertimeConfig() 代替 */
export const OVERTIME_CONFIG = OVERTIME_DEFAULTS;

/** @deprecated 使用 getDeadlineConfig() 代替 */
export const DEADLINE_CONFIG = DEADLINE_DEFAULTS;

/** @deprecated 使用 getReminderConfig() 代替 */
export const REMINDER_CONFIG = REMINDER_DEFAULTS;

/** @deprecated 使用 getReworkConfig() 代替 */
export const REWORK_CONFIG = REWORK_DEFAULTS;

/** @deprecated 使用 getStorageConfig() 代替 */
export const STORAGE_CONFIG = STORAGE_DEFAULTS;

/** @deprecated 使用 getTaskPermissions() 代替 */
export const TASK_PERMISSIONS = TASK_PERMISSIONS_DEFAULTS;

/** @deprecated 使用 getStatusTransitions() 代替 */
export const STATUS_TRANSITIONS = STATUS_TRANSITIONS_DEFAULTS;

/** @deprecated 使用 getTaskStatusConfig() 代替 */
export const TASK_STATUS_CONFIG = TASK_STATUS_DEFAULTS;

/** @deprecated 使用 getTaskActionConfig() 代替 */
export const TASK_ACTION_CONFIG = TASK_ACTION_DEFAULTS;
