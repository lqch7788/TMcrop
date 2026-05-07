/**
 * 任务类型配置 Hook
 * 用于获取和管理任务类型的动态配置
 */

import { useMemo, useCallback } from 'react';
import {
  TASK_TYPE_CONFIGS,
  TASK_TYPE_CONFIG_MAP,
  TaskTypeConfig,
  TaskConfigField,
  MultiEntryRecord,
} from '../../../../types/farm/taskTypeConfig';

/**
 * 配置值类型
 */
export interface TaskConfigValues {
  [key: string]: string | number | boolean | string[] | MultiEntryRecord[];
}

/**
 * 验证结果
 */
export interface TaskConfigValidation {
  valid: boolean;
  errors: Record<string, string>;
}

/**
 * useTaskTypeConfig Hook 返回值
 */
export interface UseTaskTypeConfigReturn {
  /** 所有任务类型配置 */
  allConfigs: TaskTypeConfig[];
  /** 根据任务类型获取配置 */
  getConfig: (taskType: string) => TaskTypeConfig | undefined;
  /** 获取某任务类型的可见配置字段（考虑依赖关系） */
  getVisibleFields: (taskType: string, values?: TaskConfigValues) => TaskConfigField[];
  /** 验证配置值 */
  validateConfig: (taskType: string, values: TaskConfigValues) => TaskConfigValidation;
  /** 获取默认值 */
  getDefaultValues: (taskType: string) => TaskConfigValues;
  /** 根据值获取选项标签 */
  getOptionLabel: (field: TaskConfigField, value: string) => string;
}

/**
 * 任务类型配置 Hook
 */
export function useTaskTypeConfig(): UseTaskTypeConfigReturn {
  // 配置映射
  const configMap = useMemo(() => TASK_TYPE_CONFIG_MAP, []);

  // 根据任务类型获取配置
  const getConfig = useCallback(
    (taskType: string): TaskTypeConfig | undefined => {
      return configMap[taskType];
    },
    [configMap]
  );

  // 获取某任务类型的可见配置字段
  const getVisibleFields = useCallback(
    (taskType: string, values?: TaskConfigValues): TaskConfigField[] => {
      const config = configMap[taskType];
      if (!config) return [];

      return config.configFields.filter(field => {
        // 无依赖字段，始终可见
        if (!field.dependsOn || field.dependsOn.length === 0) return true;

        // 检查依赖字段是否满足条件
        return field.dependsOn.some(dep => {
          // 支持 "key:value" 格式的条件
          if (dep.includes(':')) {
            const [depKey, depValue] = dep.split(':');
            const actualValue = values?.[depKey];
            return actualValue === depValue;
          }
          // 原来的逻辑：只要依赖字段有值就显示
          const depValue = values?.[dep];
          return depValue !== undefined && depValue !== '' && depValue !== 'none';
        });
      });
    },
    [configMap]
  );

  // 验证配置值
  const validateConfig = useCallback(
    (taskType: string, values: TaskConfigValues): TaskConfigValidation => {
      const config = configMap[taskType];
      if (!config) return { valid: true, errors: {} };

      const errors: Record<string, string> = {};

      config.configFields.forEach(field => {
        // 必填验证
        if (field.required) {
          const value = values[field.key];
          if (
            value === undefined ||
            value === '' ||
            (Array.isArray(value) && value.length === 0)
          ) {
            errors[field.key] = `${field.label}为必填项`;
          }
        }

        // 范围验证
        if (typeof values[field.key] === 'number') {
          if (field.min !== undefined && values[field.key] < field.min) {
            errors[field.key] = `${field.label}不能小于${field.min}`;
          }
          if (field.max !== undefined && values[field.key] > field.max) {
            errors[field.key] = `${field.label}不能大于${field.max}`;
          }
        }
      });

      return { valid: Object.keys(errors).length === 0, errors };
    },
    [configMap]
  );

  // 获取默认值
  const getDefaultValues = useCallback(
    (taskType: string): TaskConfigValues => {
      const config = configMap[taskType];
      if (!config) return {};

      const defaults: TaskConfigValues = {};
      config.configFields.forEach(field => {
        if (field.defaultValue !== undefined) {
          defaults[field.key] = field.defaultValue as TaskConfigValues[string];
        }
      });
      return defaults;
    },
    [configMap]
  );

  // 根据值获取选项标签
  const getOptionLabel = useCallback(
    (field: TaskConfigField, value: string): string => {
      if (!field.options) return value;
      const option = field.options.find(opt => opt.value === value);
      return option?.label || value;
    },
    []
  );

  return {
    allConfigs: TASK_TYPE_CONFIGS,
    getConfig,
    getVisibleFields,
    validateConfig,
    getDefaultValues,
    getOptionLabel,
  };
}
