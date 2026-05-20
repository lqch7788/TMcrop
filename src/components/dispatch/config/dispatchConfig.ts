/**
 * 任务派发配置 — V3.0 双轨制
 *
 * 与 taskConfig.ts 共享同一组配置键（如 task.overtime.*、task.deadline.*），
 * 确保派工和任务模块从同一数据源读取，消除配置双轨。
 *
 * 新增 dispatch 专用配置键: dispatch.weights.*、dispatch.priority.*
 */

import { getSystemConfigValue, getSystemConfigValueNumber } from '@/config/systemConfigReader';

// ============================================
// 常量兜底值
// ============================================

export const DISPATCH_WEIGHTS_DEFAULTS = {
  farm: {
    workload: 0.5,
    skill: 0.3,
    location: 0.2,
  },
  smart: {
    skillMatch: 0.30,
    location: 0.25,
    currentLoad: 0.20,
    historicalPerformance: 0.15,
    urgency: 0.10,
  },
} as const;

export const PRIORITY_DEFAULTS = {
  urgent: { label: '紧急', color: 'red', weight: 100 },
  high: { label: '高', color: 'orange', weight: 80 },
  normal: { label: '普通', color: 'blue', weight: 60 },
  low: { label: '低', color: 'gray', weight: 40 },
} as const;

// ============================================
// 运行时读取函数
// ============================================

/** 派工决策权重（dispatch专用，前缀 dispatch.weights.*） */
export function getDispatchWeights(): typeof DISPATCH_WEIGHTS_DEFAULTS {
  return {
    farm: {
      workload: getSystemConfigValueNumber('dispatch.weights.farm.workload', DISPATCH_WEIGHTS_DEFAULTS.farm.workload),
      skill: getSystemConfigValueNumber('dispatch.weights.farm.skill', DISPATCH_WEIGHTS_DEFAULTS.farm.skill),
      location: getSystemConfigValueNumber('dispatch.weights.farm.location', DISPATCH_WEIGHTS_DEFAULTS.farm.location),
    },
    smart: {
      skillMatch: getSystemConfigValueNumber('dispatch.weights.smart.skill-match', DISPATCH_WEIGHTS_DEFAULTS.smart.skillMatch),
      location: getSystemConfigValueNumber('dispatch.weights.smart.location', DISPATCH_WEIGHTS_DEFAULTS.smart.location),
      currentLoad: getSystemConfigValueNumber('dispatch.weights.smart.current-load', DISPATCH_WEIGHTS_DEFAULTS.smart.currentLoad),
      historicalPerformance: getSystemConfigValueNumber('dispatch.weights.smart.historical-performance', DISPATCH_WEIGHTS_DEFAULTS.smart.historicalPerformance),
      urgency: getSystemConfigValueNumber('dispatch.weights.smart.urgency', DISPATCH_WEIGHTS_DEFAULTS.smart.urgency),
    },
  };
}

/**
 * 派工超时配置 — 共享 task.overtime.* 和 task.deadline.* 键
 * 与 taskConfig.getOvertimeConfig() 从同一数据源读取
 */
export { getOvertimeConfig as getDispatchOvertimeConfig } from '@/config/taskConfig';

/**
 * 派工催办配置 — 共享 task.reminder.* 键
 */
export { getReminderConfig as getDispatchReminderConfig } from '@/config/taskConfig';

/**
 * 派工返工配置 — 共享 task.rework.* 键
 */
export { getReworkConfig as getDispatchReworkConfig } from '@/config/taskConfig';

/** 优先级配置（dispatch专用，前缀 dispatch.priority.*） */
export function getDispatchPriorityConfig(): typeof PRIORITY_DEFAULTS {
  return {
    urgent: {
      label: getSystemConfigValue('dispatch.priority.urgent.label', PRIORITY_DEFAULTS.urgent.label),
      color: getSystemConfigValue('dispatch.priority.urgent.color', PRIORITY_DEFAULTS.urgent.color),
      weight: getSystemConfigValueNumber('dispatch.priority.urgent.weight', PRIORITY_DEFAULTS.urgent.weight),
    },
    high: {
      label: getSystemConfigValue('dispatch.priority.high.label', PRIORITY_DEFAULTS.high.label),
      color: getSystemConfigValue('dispatch.priority.high.color', PRIORITY_DEFAULTS.high.color),
      weight: getSystemConfigValueNumber('dispatch.priority.high.weight', PRIORITY_DEFAULTS.high.weight),
    },
    normal: {
      label: getSystemConfigValue('dispatch.priority.normal.label', PRIORITY_DEFAULTS.normal.label),
      color: getSystemConfigValue('dispatch.priority.normal.color', PRIORITY_DEFAULTS.normal.color),
      weight: getSystemConfigValueNumber('dispatch.priority.normal.weight', PRIORITY_DEFAULTS.normal.weight),
    },
    low: {
      label: getSystemConfigValue('dispatch.priority.low.label', PRIORITY_DEFAULTS.low.label),
      color: getSystemConfigValue('dispatch.priority.low.color', PRIORITY_DEFAULTS.low.color),
      weight: getSystemConfigValueNumber('dispatch.priority.low.weight', PRIORITY_DEFAULTS.low.weight),
    },
  };
}

// ============================================
// ★ 向后兼容：保留旧导出（标记 @deprecated）
// ============================================

/** @deprecated 使用 getDispatchWeights() 代替 */
export const DISPATCH_WEIGHTS = DISPATCH_WEIGHTS_DEFAULTS;

/** @deprecated 使用 getDispatchOvertimeConfig() 代替 */
export const OVERTIME_CONFIG = {
  acceptWarningHours: 12,
  acceptCriticalHours: 24,
  executionWarningHours: 24,
  acceptanceWarningHours: 24,
  acceptanceCriticalHours: 48,
  maxExtensions: 3,
  maxExtensionHours: 72,
  totalMaxExtensionHours: 168,
} as const;

/** @deprecated 使用 getDispatchReminderConfig() 代替 */
export const REMINDER_CONFIG = {
  reminderMinIntervalMinutes: 60,
  maxRemindersPerDay: 5,
} as const;

/** @deprecated 使用 getDispatchReworkConfig() 代替 */
export const REWORK_CONFIG = {
  maxReworkCount: 2,
} as const;

/** @deprecated 使用 getDispatchPriorityConfig() 代替 */
export const PRIORITY_CONFIG = PRIORITY_DEFAULTS;

/** @deprecated 使用 getTaskStatusConfig() from taskConfig 代替 */
export const STATUS_CONFIG = {
  draft: { label: '草稿', color: 'gray' },
  pending: { label: '待接受', color: 'gray' },
  accepted: { label: '已接受', color: 'blue' },
  in_progress: { label: '处理中', color: 'blue' },
  waiting_acceptance: { label: '待验收', color: 'orange' },
  completed: { label: '已完成', color: 'green' },
  rejected: { label: '返工中', color: 'red' },
  failed: { label: '任务失败', color: 'purple' },
  cancelled: { label: '已取消', color: 'gray' },
  abandoned: { label: '已放弃', color: 'red' },
} as const;
