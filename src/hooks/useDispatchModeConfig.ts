/**
 * 派工模式配置 Hook
 * 管理派工模式的配置状态和持久化
 */

import { useCallback, useMemo } from 'react';
import { useLocalStorage, STORAGE_KEYS } from './useLocalStorage';
import type { DispatchMode, DispatchModeConfig } from '../types/dispatch';
import { DEFAULT_DISPATCH_MODE_CONFIG } from '../types/dispatch';

/**
 * 派工模式配置 Hook
 * @param initialConfig 初始配置（可选）
 * @returns 模式配置相关状态和操作方法
 */
export function useDispatchModeConfig(initialConfig?: Partial<DispatchModeConfig>) {
  // 使用 localStorage 持久化配置
  const [config, setConfig] = useLocalStorage<DispatchModeConfig>(
    STORAGE_KEYS.DISPATCH_MODE_CONFIG,
    {
      ...DEFAULT_DISPATCH_MODE_CONFIG,
      ...initialConfig,
    }
  );

  /**
   * 切换派工模式
   */
  const setMode = useCallback((mode: DispatchMode) => {
    setConfig(prev => ({
      ...prev,
      mode,
    }));
  }, [setConfig]);

  /**
   * 更新手动模式配置
   */
  const updateManualConfig = useCallback((enabled: boolean) => {
    setConfig(prev => ({
      ...prev,
      manual: {
        ...prev.manual,
        enabled,
      },
    }));
  }, [setConfig]);

  /**
   * 更新AI辅助模式配置
   */
  const updateAIAssistedConfig = useCallback((
    updates: Partial<DispatchModeConfig['ai_assisted']>
  ) => {
    setConfig(prev => ({
      ...prev,
      ai_assisted: {
        ...prev.ai_assisted,
        ...updates,
      },
    }));
  }, [setConfig]);

  /**
   * 更新AI自动模式配置
   */
  const updateAIAutoConfig = useCallback((
    updates: Partial<DispatchModeConfig['ai_auto']>
  ) => {
    setConfig(prev => ({
      ...prev,
      ai_auto: {
        ...prev.ai_auto,
        ...updates,
      },
    }));
  }, [setConfig]);

  /**
   * 设置是否允许模式切换
   */
  const setAllowModeSwitch = useCallback((allow: boolean) => {
    setConfig(prev => ({
      ...prev,
      allowModeSwitch: allow,
    }));
  }, [setConfig]);

  /**
   * 设置默认模式
   */
  const setDefaultMode = useCallback((mode: DispatchMode) => {
    setConfig(prev => ({
      ...prev,
      defaultMode: mode,
    }));
  }, [setConfig]);

  /**
   * 重置为默认配置
   */
  const resetConfig = useCallback(() => {
    setConfig(DEFAULT_DISPATCH_MODE_CONFIG);
  }, [setConfig]);

  /**
   * 完整更新配置
   */
  const updateConfig = useCallback((updates: Partial<DispatchModeConfig>) => {
    setConfig(prev => ({
      ...prev,
      ...updates,
    }));
  }, [setConfig]);

  /**
   * 判断当前是否为指定模式
   */
  const isMode = useCallback((mode: DispatchMode) => {
    return config.mode === mode;
  }, [config.mode]);

  /**
   * 判断指定模式是否启用
   */
  const isModeEnabled = useCallback((mode: DispatchMode) => {
    switch (mode) {
      case 'manual':
        return config.manual.enabled;
      case 'ai_assisted':
        return config.ai_assisted.enabled;
      case 'ai_auto':
        return config.ai_auto.enabled;
      default:
        return false;
    }
  }, [config]);

  /**
   * 获取当前模式的显示名称
   */
  const modeDisplayName = useMemo(() => {
    switch (config.mode) {
      case 'manual':
        return '手动模式';
      case 'ai_assisted':
        return 'AI辅助模式';
      case 'ai_auto':
        return 'AI自动模式';
      default:
        return '未知模式';
    }
  }, [config.mode]);

  /**
   * 获取当前模式的描述
   */
  const modeDescription = useMemo(() => {
    switch (config.mode) {
      case 'manual':
        return '完全由人工进行任务派发，可手动选择执行人员';
      case 'ai_assisted':
        return 'AI推荐最优执行人员，人工确认后派发';
      case 'ai_auto':
        return 'AI自动分析并派发任务，无需人工干预';
      default:
        return '';
    }
  }, [config.mode]);

  return {
    // 当前配置
    config,
    // 当前模式
    mode: config.mode,
    modeDisplayName,
    modeDescription,
    // 模式判断
    isMode,
    isModeEnabled,
    // 模式切换
    setMode,
    // 各模式配置更新
    updateManualConfig,
    updateAIAssistedConfig,
    updateAIAutoConfig,
    // 模式切换配置
    setAllowModeSwitch,
    setDefaultMode,
    // 配置操作
    updateConfig,
    resetConfig,
  };
}

/**
 * 派工模式存储键名
 * 添加到 STORAGE_KEYS 中
 */
export const DISPATCH_MODE_STORAGE_KEY = STORAGE_KEYS.DISPATCH_MODE_CONFIG || 'yuanxingtu_dispatch_mode_config';

export type { DispatchMode, DispatchModeConfig };
