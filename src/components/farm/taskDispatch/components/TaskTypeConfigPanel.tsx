/**
 * 任务类型配置面板
 * 根据选中的任务类型显示对应的配置项
 */

import React from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTaskTypeConfig, TaskConfigValues } from '../hooks/useTaskTypeConfig';
import { ConfigFieldRenderer } from './ConfigFieldRenderer';

interface TaskTypeConfigPanelProps {
  /** 当前选中的任务类型列表 */
  taskTypes: string[];
  /** 当前配置值 */
  configValues: TaskConfigValues;
  /** 配置变化回调 */
  onConfigChange: (key: string, value: string | number | boolean | string[]) => void;
  /** 验证错误 */
  errors?: Record<string, string>;
}

export function TaskTypeConfigPanel({
  taskTypes,
  configValues,
  onConfigChange,
  errors = {},
}: TaskTypeConfigPanelProps) {
  const { getConfig, getVisibleFields } = useTaskTypeConfig();

  // 未选择任务类型时的提示
  if (taskTypes.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500 text-sm">请先选择任务类型</p>
      </div>
    );
  }

  // 多选任务类型时的提示
  if (taskTypes.length > 1) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500 text-sm">
          已选择 <span className="font-semibold">{taskTypes.length}</span> 个任务类型
        </p>
        <p className="text-base font-semibold text-blue-600 mt-2">
          请在作业标准SOP中详细描述任务类型的具体操作方式
        </p>
      </div>
    );
  }

  // 单个任务类型
  const taskType = taskTypes[0];
  const config = getConfig(taskType);

  // 未找到配置
  if (!config) {
    return (
      <div className="bg-red-50 rounded-lg p-4 flex items-center gap-2 text-red-600">
        <AlertTriangle className="w-4 h-4 flex-shrink-0" />
        <span className="text-sm">未找到任务类型配置</span>
      </div>
    );
  }

  const visibleFields = getVisibleFields(taskType, configValues);

  // 无需配置
  if (visibleFields.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-6 text-center">
        <p className="text-gray-500 text-sm">该任务类型无需额外配置</p>
      </div>
    );
  }

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* 配置面板标题 */}
      <h4 className="font-medium text-gray-800 flex items-center gap-2">
        <span
          className={`w-3 h-3 rounded-full ${config.color}`}
          style={{ backgroundColor: config.color.replace('bg-', '').includes('-') ? undefined : undefined }}
        />
        {config.label} - 详细配置
      </h4>

      {/* 配置字段网格 */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {visibleFields.map(field => (
          <div
            key={field.key}
            className={
              field.type === 'textarea' || field.type === 'multiSelect'
                ? 'md:col-span-2'
                : ''
            }
          >
            <ConfigFieldRenderer
              field={field}
              value={configValues[field.key]}
              onChange={onConfigChange}
              error={errors[field.key]}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
