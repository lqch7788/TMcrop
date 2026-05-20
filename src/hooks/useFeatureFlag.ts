/**
 * 功能开关 Hook — V3.0 Phase 7
 *
 * 从系统配置读取功能开关 'feature.*' 布尔值
 * 双轨制: Hook轨（React组件用） + 纯函数轨（非React模块用）
 *
 * 使用示例:
 *   const demoEnabled = useFeatureFlag('demo-mode');
 *   const exportEnabled = useFeatureFlag('enable-export');
 */

import { useSystemConfigValueBoolean } from './useSystemConfigValue';
import { getSystemConfigValueBoolean } from '../config/systemConfigReader';

// ==================== React Hook 轨 ====================

/**
 * 读取功能开关状态（React组件用）
 * @param flagName - 功能开关名（不含 'feature.' 前缀），如 'demo-mode'
 * @param fallback - 配置缺失时的兜底值（默认 false）
 * @returns 功能是否启用
 */
export function useFeatureFlag(flagName: string, fallback: boolean = false): boolean {
  return useSystemConfigValueBoolean(`feature.${flagName}`, fallback);
}

// ==================== 纯函数轨（非React模块用） ====================

/**
 * 惰性读取功能开关状态（非React模块用）
 * @param flagName - 功能开关名（不含 'feature.' 前缀），如 'demo-mode'
 * @param fallback - 配置缺失时的兜底值（默认 false）
 * @returns 功能是否启用
 */
export function getFeatureFlag(flagName: string, fallback: boolean = false): boolean {
  return getSystemConfigValueBoolean(`feature.${flagName}`, fallback);
}
