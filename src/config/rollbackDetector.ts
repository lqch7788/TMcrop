/**
 * 自动回滚检测器
 * Phase 2: 监控 API 错误率，自动触发回滚机制
 *
 * 回滚阈值配置：
 * - apiErrorRate: API 错误率阈值 (默认 5%)
 * - dbFailureCount: 数据库失败次数阈值 (默认 3次/分钟)
 * - dataCorruption: 数据损坏检测 (默认 1次即触发)
 */

import { logger } from '../lib/logger';

export type RollbackTrigger = 'error_rate' | 'db_failure' | 'data_corruption' | 'manual';

export interface RollbackConfig {
  // 是否启用自动回滚
  enabled: boolean;
  // API 错误率阈值 (0-1)
  apiErrorRateThreshold: number;
  // 监控时间窗口 (毫秒)
  errorRateWindow: number;
  // 数据库失败次数阈值
  dbFailureThreshold: number;
  // 数据库失败监控时间窗口 (毫秒)
  dbFailureWindow: number;
  // 数据损坏检测阈值
  dataCorruptionThreshold: number;
  // 回滚前的重试次数
  retryBeforeRollback: number;
  // 重试间隔 (毫秒)
  retryInterval: number;
}

export interface RollbackEvent {
  trigger: RollbackTrigger;
  module: string;
  timestamp: string;
  details: string;
  metrics: Record<string, number>;
}

export const defaultRollbackConfig: RollbackConfig = {
  enabled: true,
  apiErrorRateThreshold: 0.05,      // 5% 错误率
  errorRateWindow: 5 * 60 * 1000,   // 5分钟窗口
  dbFailureThreshold: 3,             // 3次失败
  dbFailureWindow: 60 * 1000,        // 1分钟窗口
  dataCorruptionThreshold: 1,        // 1次即触发
  retryBeforeRollback: 2,
  retryInterval: 1000,
};

// 回滚事件记录
const rollbackEvents: RollbackEvent[] = [];

// 错误率监控
const errorRateMap: Map<string, { timestamp: number; errors: number; total: number }[]> = new Map();

// 数据库失败监控
const dbFailureMap: Map<string, { timestamp: number }[]> = new Map();

/**
 * 记录 API 请求结果
 */
export function recordApiResult(
  module: string,
  success: boolean,
  responseTime?: number
): void {
  const now = Date.now();
  const windowStart = now - defaultRollbackConfig.errorRateWindow;

  if (!errorRateMap.has(module)) {
    errorRateMap.set(module, []);
  }

  const records = errorRateMap.get(module)!;

  // 清理过期记录
  const validRecords = records.filter(r => r.timestamp > windowStart);
  validRecords.push({
    timestamp: now,
    errors: success ? 0 : 1,
    total: 1,
  });

  errorRateMap.set(module, validRecords);

  // 检查是否需要触发回滚
  checkRollback(module);
}

/**
 * 记录数据库失败
 */
export function recordDbFailure(module: string): void {
  const now = Date.now();
  const windowStart = now - defaultRollbackConfig.dbFailureWindow;

  if (!dbFailureMap.has(module)) {
    dbFailureMap.set(module, []);
  }

  const records = dbFailureMap.get(module)!;
  const validRecords = records.filter(r => r.timestamp > windowStart);
  validRecords.push({ timestamp: now });

  dbFailureMap.set(module, validRecords);

  // 检查是否需要触发回滚
  if (validRecords.length >= defaultRollbackConfig.dbFailureThreshold) {
    triggerRollback('db_failure', module, {
      failureCount: validRecords.length,
      threshold: defaultRollbackConfig.dbFailureThreshold,
    });
  }
}

/**
 * 记录数据损坏检测
 */
export function recordDataCorruption(module: string, details: string): void {
  triggerRollback('data_corruption', module, { details });
}

/**
 * 计算错误率
 */
export function getErrorRate(module: string): number {
  const records = errorRateMap.get(module) || [];
  if (records.length === 0) return 0;

  const totalErrors = records.reduce((sum, r) => sum + r.errors, 0);
  const totalRequests = records.reduce((sum, r) => sum + r.total, 0);

  return totalRequests > 0 ? totalErrors / totalRequests : 0;
}

/**
 * 检查是否需要回滚
 */
function checkRollback(module: string): void {
  const errorRate = getErrorRate(module);

  if (errorRate >= defaultRollbackConfig.apiErrorRateThreshold) {
    triggerRollback('error_rate', module, {
      currentErrorRate: errorRate,
      threshold: defaultRollbackConfig.apiErrorRateThreshold,
    });
  }
}

/**
 * 触发回滚
 */
async function triggerRollback(
  trigger: RollbackTrigger,
  module: string,
  metrics: Record<string, number>
): Promise<void> {
  if (!defaultRollbackConfig.enabled) {
    return;
  }

  const event: RollbackEvent = {
    trigger,
    module,
    timestamp: new Date().toISOString(),
    details: getTriggerDescription(trigger, metrics),
    metrics,
  };

  rollbackEvents.push(event);

  logger.error(`[RollbackDetector] 🚨 触发回滚: ${module}`);
  logger.error(`[RollbackDetector] 触发原因: ${event.details}`);
  logger.error(`[RollbackDetector] 指标`, metrics);

  // 触发浏览器事件供监听
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('rollback-trigger', { detail: event }));

    // 尝试自动切换回 localStorage
    await attemptAutomaticRollback(module);
  }
}

/**
 * 尝试自动回滚
 */
async function attemptAutomaticRollback(module: string): Promise<boolean> {
  // 延迟执行，等待可能的恢复
  await new Promise(resolve => setTimeout(resolve, defaultRollbackConfig.retryInterval));

  // 触发 localStorage 切换
  if (typeof window !== 'undefined') {
    // 通知应用切换到 localStorage 模式
    window.dispatchEvent(new CustomEvent('switch-to-localstorage', {
      detail: { module, timestamp: Date.now() }
    }));

    return true;
  }

  return false;
}

/**
 * 获取触发原因描述
 */
function getTriggerDescription(
  trigger: RollbackTrigger,
  metrics: Record<string, number>
): string {
  switch (trigger) {
    case 'error_rate':
      return `API 错误率 ${(metrics.currentErrorRate * 100).toFixed(2)}% 超过阈值 ${(metrics.threshold * 100).toFixed(0)}%`;
    case 'db_failure':
      return `数据库失败 ${metrics.failureCount} 次超过阈值 ${metrics.threshold} 次`;
    case 'data_corruption':
      return `数据损坏检测: ${metrics.details || '未知原因'}`;
    case 'manual':
      return '手动触发';
    default:
      return '未知原因';
  }
}

/**
 * 获取回滚历史
 */
export function getRollbackHistory(): RollbackEvent[] {
  return [...rollbackEvents];
}

/**
 * 获取模块健康状态
 */
export function getModuleHealth(module: string): {
  errorRate: number;
  dbFailureCount: number;
  lastError: string | null;
  isHealthy: boolean;
} {
  const errorRate = getErrorRate(module);
  const dbFailures = dbFailureMap.get(module) || [];
  const now = Date.now();
  const recentFailures = dbFailures.filter(f => now - f.timestamp < defaultRollbackConfig.dbFailureWindow);

  const lastEvent = rollbackEvents
    .filter(e => e.module === module)
    .pop();

  return {
    errorRate,
    dbFailureCount: recentFailures.length,
    lastError: lastEvent?.details || null,
    isHealthy: errorRate < defaultRollbackConfig.apiErrorRateThreshold &&
               recentFailures.length < defaultRollbackConfig.dbFailureThreshold,
  };
}

/**
 * 打印所有模块健康状态
 */
export function printHealthReport(): void {
  // 健康报告生成中，静默处理
}

// 浏览器控制台命令
if (typeof window !== 'undefined') {
  (window as any).rollbackDetector = {
    recordApiResult,
    recordDbFailure,
    recordDataCorruption,
    getRollbackHistory,
    getModuleHealth,
    printHealthReport,
    getConfig: () => defaultRollbackConfig,
  };
}
