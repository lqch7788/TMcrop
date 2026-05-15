/**
 * 生产汇总模块常量定义
 * 阈值配置、状态颜色映射等
 */

/** 告警阈值配置 */
export const ALERT_THRESHOLDS = {
  yield: { warning: 0.8, critical: 0.5 },
  cost: { warning: 1.1, critical: 1.3 },
  task: { warning: 0.7, critical: 0.5 },
  overdue: { warning: 3, critical: 7 },
} as const;

/** 状态 → Tailwind颜色名映射 */
export const COLOR_BY_STATUS: Record<string, string> = {
  normal: 'emerald',
  warning: 'amber',
  critical: 'red',
  info: 'blue',
  batch: 'purple',
  flow: 'teal',
};

/** 产量状态阈值判断 */
export function getYieldStatus(completionRate: number): 'normal' | 'warning' | 'critical' {
  if (completionRate >= ALERT_THRESHOLDS.yield.warning) return 'normal';
  if (completionRate >= ALERT_THRESHOLDS.yield.critical) return 'warning';
  return 'critical';
}

/** 成本状态阈值判断 */
export function getCostStatus(ratio: number): 'normal' | 'warning' | 'critical' {
  if (ratio <= ALERT_THRESHOLDS.cost.warning) return 'normal';
  if (ratio <= ALERT_THRESHOLDS.cost.critical) return 'warning';
  return 'critical';
}

/** 任务完成率状态判断 */
export function getTaskStatus(rate: number): 'normal' | 'warning' | 'critical' {
  if (rate >= ALERT_THRESHOLDS.task.warning) return 'normal';
  if (rate >= ALERT_THRESHOLDS.task.critical) return 'warning';
  return 'critical';
}
