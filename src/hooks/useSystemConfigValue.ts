/**
 * 系统配置 React Hook — V3.0 双轨制（React组件用）
 *
 * 架构角色: L3 组件消费层（响应式轨）
 * 数据流: 组件 → useSystemConfigStore细粒度选择器 → configs.find() → 返回值+兜底
 *
 * 性能: Zustand默认浅比较，selector返回字符串值，仅当目标配置值变化时才重渲染
 *
 * V1.1借鉴: useEffect触发加载（不用useMemo做副作用）
 */

import { useEffect } from 'react';
import { useSystemConfigStore } from '@/stores/useSystemConfigStore';

// ==================== 字符串配置 Hook ====================

/**
 * 响应式读取字符串配置值
 *
 * @param key - 命名空间配置键，如 'system.name'
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 配置值字符串，Store未加载时返回兜底值
 *
 * @example
 * const systemName = useSystemConfigValue('system.name', '元星途农业种植管理系统');
 */
export function useSystemConfigValue(key: string, defaultValue: string): string {
  // 细粒度选择器：只订阅目标key的值变化，避免全局重渲染
  const configValue = useSystemConfigStore((s) => {
    const config = s.configs.find(
      (c) => c.configKey === key && c.isActive
    );
    return config?.configValue ?? null;
  });

  // 首次渲染时如果配置为空则触发加载（V1.1借鉴：useEffect非useMemo）
  const loading = useSystemConfigStore((s) => s.loading);
  const configsLength = useSystemConfigStore((s) => s.configs.length);
  const loadConfigs = useSystemConfigStore((s) => s.loadConfigs);

  useEffect(() => {
    if (configsLength === 0 && !loading) {
      loadConfigs();
    }
  }, [configsLength, loading, loadConfigs]);

  return configValue ?? defaultValue;
}

// ==================== 数字配置 Hook ====================

/**
 * 响应式读取数字配置值
 *
 * @param key - 命名空间配置键
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 数字配置值，解析失败时返回兜底值
 *
 * @example
 * const pageSize = useSystemConfigValueNumber('ui.table.default-page-size', 10);
 */
export function useSystemConfigValueNumber(key: string, defaultValue: number): number {
  const strVal = useSystemConfigValue(key, String(defaultValue));
  const num = Number(strVal);
  return isNaN(num) ? defaultValue : num;
}

// ==================== 布尔配置 Hook ====================

/**
 * 响应式读取布尔配置值
 *
 * @param key - 命名空间配置键
 * @param defaultValue - 配置缺失时的兜底值
 * @returns 布尔配置值，解析失败时返回兜底值
 *
 * @example
 * const demoMode = useSystemConfigValueBoolean('feature.demo-mode', false);
 */
export function useSystemConfigValueBoolean(key: string, defaultValue: boolean): boolean {
  const strVal = useSystemConfigValue(key, String(defaultValue));
  if (strVal === 'true' || strVal === '1') return true;
  if (strVal === 'false' || strVal === '0') return false;
  return defaultValue;
}

// ==================== 批量前缀 Hook ====================

/**
 * 响应式读取同一前缀下的所有配置值
 *
 * @param prefix - 配置键前缀，如 'task.overtime.'
 * @returns 以短key为键的配置值对象
 *
 * @example
 * const overtimeConfigs = useSystemConfigValuesByPrefix('task.overtime.');
 * // { 'accept-warning-hours': '12', 'accept-critical-hours': '24', ... }
 */
export function useSystemConfigValuesByPrefix(prefix: string): Record<string, string> {
  const result = useSystemConfigStore((s) => {
    const map: Record<string, string> = {};
    for (const c of s.configs) {
      if (c.configKey.startsWith(prefix) && c.isActive) {
        const shortKey = c.configKey.slice(prefix.length);
        map[shortKey] = c.configValue;
      }
    }
    return map;
  });

  const loading = useSystemConfigStore((s) => s.loading);
  const configsLength = useSystemConfigStore((s) => s.configs.length);
  const loadConfigs = useSystemConfigStore((s) => s.loadConfigs);

  useEffect(() => {
    if (configsLength === 0 && !loading) {
      loadConfigs();
    }
  }, [configsLength, loading, loadConfigs]);

  return result;
}
