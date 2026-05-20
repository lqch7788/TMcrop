/**
 * 任务类型配置只读显示组件
 * 用于在详情弹窗中展示任务类型配置内容
 */

import React from 'react';
import { Label } from '../../../ui/label';
import { getTaskTypeConfig, TaskConfigField, MultiEntryDef } from '../../../../types/farm/taskTypeConfig';
import { TaskConfigValues } from '../hooks/useTaskTypeConfig';

interface TaskTypeConfigDisplayProps {
  /** 任务类型（如 'fertilization'） */
  taskType: string;
  /** 配置值 */
  configValues: TaskConfigValues;
}

/**
 * 获取选项标签
 */
function getOptionLabel(options: { value: string; label: string }[], value: string): string {
  const option = options.find(o => o.value === value);
  return option?.label || value;
}

/**
 * 渲染单个配置字段值
 */
function renderFieldValue(
  field: TaskConfigField,
  value: any
): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-400">-</span>;
  }

  // 处理下拉选择类型 - 需要转换为中文标签
  if (field.type === 'select' && field.options) {
    return (
      <span className="text-gray-900">
        {getOptionLabel(field.options, String(value))}
      </span>
    );
  }

  // 处理多选类型 - 需要转换为中文标签列表
  if (field.type === 'multiSelect' && field.options && Array.isArray(value)) {
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v: string, idx: number) => (
          <span key={idx} className="px-2 py-0.5 bg-blue-100 text-blue-700 rounded text-xs">
            {getOptionLabel(field.options!, v)}
          </span>
        ))}
      </div>
    );
  }

  // 处理文本或多行文本
  if (field.type === 'textarea') {
    return (
      <div className="text-gray-700 bg-white rounded p-2 border border-gray-200 whitespace-pre-wrap">
        {String(value)}
      </div>
    );
  }

  // 处理数字类型
  if (field.type === 'number') {
    return (
      <span className="text-gray-900">
        {value}
        {field.unit && <span className="text-gray-400 text-xs ml-1">{field.unit}</span>}
      </span>
    );
  }

  // 默认处理
  return <span className="text-gray-900">{String(value)}</span>;
}

/**
 * 渲染多条目（混合配比）配置
 */
function renderMultiEntry(
  field: TaskConfigField,
  value: any,
  configValues: TaskConfigValues
): React.ReactNode {
  if (!value || !Array.isArray(value) || value.length === 0) {
    return <span className="text-gray-400">-</span>;
  }

  const entries = value as Record<string, any>[];
  const multiEntryDef = field.multiEntryDef;

  return (
    <div className="space-y-3">
      {entries.map((entry: Record<string, any>, idx: number) => (
        <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
          <div className="text-xs text-gray-400 mb-2 font-medium">
            {multiEntryDef?.entryLabel || '条目'} {idx + 1}
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {multiEntryDef?.fields.map(f => {
              const val = entry[f.key];
              let displayVal: React.ReactNode = '-';

              if (val !== undefined && val !== null && val !== '') {
                // 如果是选项类型，转换为中文标签
                if (f.options) {
                  displayVal = getOptionLabel(f.options, String(val));
                } else {
                  displayVal = String(val);
                }
              }

              return (
                <div key={f.key} className="flex flex-col">
                  <span className="text-xs text-gray-500">{f.label}</span>
                  <span className="text-sm text-gray-900">
                    {displayVal}
                    {f.unit && val && <span className="text-gray-400 text-xs ml-1">{f.unit}</span>}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ))}
    </div>
  );
}

/**
 * 任务类型配置只读显示组件
 */
export function TaskTypeConfigDisplay({ taskType, configValues }: TaskTypeConfigDisplayProps) {
  const config = getTaskTypeConfig(taskType);

  if (!config) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
        未找到任务类型配置
      </div>
    );
  }

  // 过滤出有值的配置字段
  const visibleFields = config.configFields.filter(field => {
    const value = configValues[field.key];
    return value !== undefined && value !== '' && value !== null;
  });

  if (visibleFields.length === 0) {
    return (
      <div className="bg-gray-50 rounded-lg p-4 text-center text-gray-500 text-sm">
        暂无详细配置信息
      </div>
    );
  }

  // 分离普通字段和多条目字段
  const normalFields = visibleFields.filter(f => f.type !== 'multiEntry');
  const multiEntryFields = visibleFields.filter(f => f.type === 'multiEntry');

  return (
    <div className="bg-gray-50 rounded-lg p-4 space-y-4">
      {/* 任务类型标题 */}
      <div className="flex items-center gap-2 border-b border-gray-200 pb-3">
        <span
          className={`w-6 h-6 rounded flex items-center justify-center text-white text-xs ${config.color}`}
        >
          {config.label.charAt(0)}
        </span>
        <h4 className="font-semibold text-gray-900">{config.label} - 详细配置</h4>
      </div>

      {/* 普通配置项 */}
      {normalFields.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {normalFields.map(field => {
            const value = configValues[field.key];

            return (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  {field.label}
                  {field.unit && field.type !== 'number' && <span className="text-gray-400">({field.unit})</span>}
                </Label>
                <div className="text-sm">
                  {renderFieldValue(field, value)}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* 多条目配置（混合配比） */}
      {multiEntryFields.length > 0 && (
        <div className="space-y-4">
          {multiEntryFields.map(field => {
            const value = configValues[field.key];

            return (
              <div key={field.key} className="space-y-2">
                <Label className="text-xs text-gray-500">
                  {field.label}
                </Label>
                {renderMultiEntry(field, value, configValues)}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
