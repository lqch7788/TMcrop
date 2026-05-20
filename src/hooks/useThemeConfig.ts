/**
 * 动态主题 Hook — V3.0 Phase 4
 *
 * 从 system_configs DB (theme.* 键) 同步CSS变量到 document.documentElement
 * kebab-case命名: theme.sidebar-bg → --sidebar-bg
 * 自动清理被删除的配置对应的CSS变量，回退到 :root 默认值
 *
 * V1.1借鉴: kebab-case + 删除CSS变量清理
 */

import { useEffect, useRef } from 'react';
import { useSystemConfigStore } from '@/stores/useSystemConfigStore';

export function useThemeConfig() {
  const configs = useSystemConfigStore((s) => s.configs);
  const loadConfigs = useSystemConfigStore((s) => s.loadConfigs);
  const loading = useSystemConfigStore((s) => s.loading);

  // 跟踪已应用的CSS变量名，用于清理被删除的配置
  const appliedVarsRef = useRef<Set<string>>(new Set());

  // 首次渲染时确保主题配置已加载
  useEffect(() => {
    if (configs.length === 0 && !loading) {
      loadConfigs();
    }
  }, [configs.length, loading, loadConfigs]);

  // 同步 theme.* 配置到CSS变量
  useEffect(() => {
    const root = document.documentElement;
    if (!root) return;

    const newVarNames = new Set<string>();

    for (const config of configs) {
      if (!config.configKey.startsWith('theme.') || !config.isActive) continue;

      // theme.sidebar-bg → --sidebar-bg (kebab-case与CSS变量命名天然一致)
      const varName = '--' + config.configKey.slice(6);
      root.style.setProperty(varName, config.configValue);
      newVarNames.add(varName);
    }

    // 清理被删除/停用的theme配置对应的CSS变量（回退到:root默认值）
    for (const oldVar of appliedVarsRef.current) {
      if (!newVarNames.has(oldVar)) {
        root.style.removeProperty(oldVar);
      }
    }

    appliedVarsRef.current = newVarNames;
  }, [configs]);
}
