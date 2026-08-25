/**
 * 系统配置纯函数读取器 — V3.0 双轨制（非React模块用）
 *
 * 架构角色: L2 配置消费层（纯函数轨）
 * 数据流: getState()惰性快照 → Map缓存 → 类型转换 → 返回值+兜底
 *
 * 使用场景: apiClient.ts / taskConfig.ts / approvalTimeout.ts 等非React模块
 * 2026-08-25 fix：原注释"避免循环依赖"已过时（已验证 useSystemConfigStore 不依赖本文件），
 *   改为顶部静态 import（浏览器 require not defined）。函数内惰性 getState() 行为不变。
 */

// 2026-08-25 fix：顶部静态 import（替代底部 require，浏览器 Vite 不支持 require）
import { useSystemConfigStore } from '../stores/useSystemConfigStore';

// ==================== 缓存层 ====================

/** 配置值缓存（惰性填充，CustomEvent触发清除） */
const valueCache = new Map<string, string | null>();

// 监听Store变更事件清除缓存（解耦Store和Reader）
if (typeof window !== 'undefined') {
  window.addEventListener('system-config-changed', () => {
    valueCache.clear();
  });
}

// ==================== 旧key→新key向后兼容映射 ====================

/**
 * 旧版扁平key → V3.0命名空间key映射
 * 当新key查不到时，自动回退到旧key查找，确保平滑迁移
 */
const LEGACY_KEY_MAP: Record<string, string> = {
  // 系统安全
  'session_timeout_minutes': 'system.security.session-timeout-minutes',
  'password_min_length': 'system.security.password-min-length',
  'login_max_attempts': 'system.security.login-max-attempts',
  // 系统备份
  'backup_auto_enabled': 'system.backup.auto-enabled',
  'backup_interval_hours': 'system.backup.interval-hours',
  'backup_retention_days': 'system.backup.retention-days',
  // 系统名称
  'system_name': 'system.name',
  // 系统性能
  'auto_save_interval': 'system.performance.auto-save-interval',
  'data_retention_days': 'system.performance.data-retention-days',
  // UI
  'theme_color': 'theme.primary-color',
  'page_size': 'ui.table.default-page-size',
  // 功能开关
  'enable_notifications': 'notification.channel.master-switch',
  'enable_export': 'report.export.master-switch',
  'demo_mode': 'feature.demo-mode',
  'show_tutorial': 'feature.show-tutorial',
  // 任务超时（7个参数）— 旧key → task.overtime.*
  'task_accept_warning_hours': 'task.overtime.accept-warning-hours',
  'task_accept_critical_hours': 'task.overtime.accept-critical-hours',
  'task_execution_warning_hours': 'task.overtime.execution-warning-hours',
  'task_execution_critical_hours': 'task.overtime.execution-critical-hours',
  'task_acceptance_warning_hours': 'task.overtime.acceptance-warning-hours',
  'task_acceptance_critical_hours': 'task.overtime.acceptance-critical-hours',
  'task_check_interval_ms': 'task.overtime.check-interval-ms',
  // 任务延期 — 旧key → task.deadline.*
  'task_max_extensions': 'task.deadline.max-extensions',
  'task_max_extension_hours': 'task.deadline.max-extension-hours',
  'task_total_max_extension_hours': 'task.deadline.total-max-extension-hours',
  // 任务催办 — 旧key → task.reminder.*
  'task_reminder_interval': 'task.reminder.min-interval-minutes',
  'task_reminder_advance_hours': 'task.reminder.auto-reminder-hours',
  'task_max_reminders_per_day': 'task.reminder.max-per-day',
  // 任务返工 — 旧key → task.rework.*
  'task_max_rework_rounds': 'task.rework.max-count',
  // 任务存储 — 旧key → task.storage.*
  'task_storage_days': 'task.storage.archive-after-days',
  // 审批超时 — 旧key → approval.timeout.*
  'approval_timeout_hours': 'approval.timeout.normal-hours',
  'approval_auto_threshold': 'approval.threshold.auto-approve',
  'approval_allow_delegate': 'approval.delegation.enabled',
  'approval_require_comment': 'approval.workflow.require-comment',
  'approval_urgent_timeout': 'approval.timeout.urgent-hours',
  'approval_normal_timeout': 'approval.timeout.normal-hours',
  'approval_hr_timeout': 'approval.timeout.hr-hours',
  'approval_finance_timeout': 'approval.timeout.finance-hours',
  'approval_ultimate_timeout': 'approval.timeout.ultimate-hours',
  'approval_high_value_threshold': 'approval.threshold.high-value',
  // 业务
  'inventory_safe_stock': 'material.inventory.safe-stock-days',
  'task_reward_multiplier': 'labor.salary.reward-multiplier',
  'seedling_survival_threshold': 'crop.seedling.survival-threshold',
  'harvest_cycle_days': 'crop.harvest.default-cycle-days',
};

/**
 * 反向映射: 新key → 旧key（用于系统配置页面显示兼容性提示）
 */
export function getLegacyKey(newKey: string): string | undefined {
  for (const [oldKey, mappedNewKey] of Object.entries(LEGACY_KEY_MAP)) {
    if (mappedNewKey === newKey) return oldKey;
  }
  return undefined;
}

// ==================== 核心读取函数 ====================

/**
 * 从Store惰性读取字符串配置值
 *
 * 查找顺序: 新key查找 → 旧key兼容查找 → defaultValue兜底
 * 缓存策略: Map缓存 → getState()惰性快照 → API
 * 无缓存层，直接调用 API（V2.1 架构铁律：直连 API）
 *
 * @param key - 命名空间配置键，如 'task.overtime.accept-warning-hours'
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 配置值字符串，或兜底值
 */
export function getSystemConfigValue(key: string, defaultValue: string): string {
  // 先查缓存
  const cached = valueCache.get(key);
  if (cached !== undefined) return cached ?? defaultValue;

  try {
    // 2026-08-25 fix：删除底部 require（浏览器不支持），顶部已静态 import useSystemConfigStore
    const state = useSystemConfigStore.getState();
    const configs = state.configs || [];

    // 1. 优先用新key查找
    let config = configs.find(
      (c: { configKey: string; isActive: boolean }) =>
        c.configKey === key && c.isActive
    );

    // 2. 新key未命中 → 尝试旧key兼容查找
    if (!config) {
      const legacyKey = LEGACY_KEY_MAP[key];
      if (legacyKey) {
        config = configs.find(
          (c: { configKey: string; isActive: boolean }) =>
            c.configKey === legacyKey && c.isActive
        );
      }
    }

    // 3. 仍未命中 → 反向查找（检查是否有旧key格式的配置映射到当前新key）
    if (!config) {
      const reversedLegacy = getLegacyKey(key);
      if (reversedLegacy) {
        config = configs.find(
          (c: { configKey: string; isActive: boolean }) =>
            c.configKey === reversedLegacy && c.isActive
        );
      }
    }

    const val = config?.configValue ?? defaultValue;
    valueCache.set(key, val);
    return val;
  } catch {
    // Store未加载或任何异常 → 返回兜底值
    return defaultValue;
  }
}

/**
 * 从Store惰性读取数字配置值
 * @param key - 命名空间配置键
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 数字配置值，或兜底值
 */
export function getSystemConfigValueNumber(key: string, defaultValue: number): number {
  const strVal = getSystemConfigValue(key, String(defaultValue));
  const num = Number(strVal);
  return isNaN(num) ? defaultValue : num;
}

/**
 * 从Store惰性读取布尔配置值
 * @param key - 命名空间配置键
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 布尔配置值，或兜底值
 */
export function getSystemConfigValueBoolean(key: string, defaultValue: boolean): boolean {
  const strVal = getSystemConfigValue(key, String(defaultValue));
  if (strVal === 'true' || strVal === '1') return true;
  if (strVal === 'false' || strVal === '0') return false;
  return defaultValue;
}

/**
 * 批量获取同一前缀下的所有配置值
 * @param prefix - 配置键前缀，如 'task.overtime.'
 * @returns 以短key为键的配置值对象，如 { 'accept-warning-hours': '12', ... }
 */
export function getSystemConfigValuesByPrefix(prefix: string): Record<string, string> {
  try {
    // 2026-08-25 fix：删除底部 require，顶部已静态 import
    const state = useSystemConfigStore.getState();
    const configs = state.configs || [];

    const result: Record<string, string> = {};
    for (const c of configs as Array<{ configKey: string; configValue: string; isActive: boolean }>) {
      if (c.configKey.startsWith(prefix) && c.isActive) {
        const shortKey = c.configKey.slice(prefix.length);
        result[shortKey] = c.configValue;
      }
    }
    return result;
  } catch {
    return {};
  }
}

/**
 * 清除配置读取缓存（通常由CustomEvent自动触发）
 */
export function clearConfigCache(): void {
  valueCache.clear();
}
