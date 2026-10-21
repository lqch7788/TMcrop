/**
 * 任务类型配置面板
 * 根据选中的任务类型显示对应的配置项
 */

import React, { useEffect, useMemo } from 'react';
import { AlertTriangle } from 'lucide-react';
import { useTaskTypeConfig, TaskConfigValues } from '../hooks/useTaskTypeConfig';
import { ConfigFieldRenderer } from './ConfigFieldRenderer';
// 2026-10-21：单位联动需要按已选种源 ID 反查其单位（种苗可能是株/千克/袋…）
import { useSeedSourceStore } from '../../../../stores/useSeedSourceStore';

interface TaskTypeConfigPanelProps {
  /** 当前选中的任务类型列表 */
  taskTypes: string[];
  /** 当前配置值 */
  configValues: TaskConfigValues;
  /** 配置变化回调（取值类型与 TaskConfigValues 保持一致，含多条目记录数组） */
  onConfigChange: (key: string, value: TaskConfigValues[string]) => void;
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

  // 2026-10-21：单位联动 —— 「种子/种苗用量」的单位跟随「种子/种苗名称」所选种源。
  //   种源单位存在种源库（unit 字段），配置里写死「株/亩」会与实际领用不符。
  //   此处按 unitSourceField 声明的来源字段解析，解析不到时 ConfigFieldRenderer
  //   会回落到 field.unit（定植用苗量未声明 unit，故未选种源时不显示单位）。
  const seedSources = useSeedSourceStore((s) => s.items);
  const loadSeedSources = useSeedSourceStore((s) => s.loadItems);
  useEffect(() => {
    if (seedSources.length === 0) {
      loadSeedSources();
    }
  }, [seedSources.length, loadSeedSources]);

  // 解析动态单位：按各字段的 unitSourceField 声明，从所选种源取其真实单位
  //   （必须在下面的 early return 之前计算 —— hooks 不能出现在条件分支之后）
  const unitOverrides = useMemo(() => {
    const result: Record<string, string> = {};
    const allFields = taskTypes.flatMap((t) => getConfig(t)?.configFields ?? []);
    for (const f of allFields) {
      if (!f.unitSourceField) continue;
      const srcId = configValues?.[f.unitSourceField];
      if (typeof srcId !== 'string' || !srcId) continue;
      const hit = seedSources.find((s) => String(s.id) === srcId);
      if (hit?.unit) result[f.key] = hit.unit;
    }
    return result;
  }, [taskTypes, configValues, seedSources, getConfig]);

  // 默认值兜底（2026-10-21）：字段声明了 defaultValue 且当前为空时写入一次。
  //   目的是与「水肥管理 → 新增浇水记录」行为一致 —— 那里新建浇水行即带
  //   方式=滴灌、单位=升，用户不手动改也能提交。
  //   注意：系统对 required 没有提交期校验（validateConfig 无调用方），
  //   若不填默认值，界面会停在「请选择」而实际保存空值。
  useEffect(() => {
    if (taskTypes.length !== 1) return;
    const fields = getVisibleFields(taskTypes[0], configValues) ?? [];
    for (const f of fields) {
      if (f.defaultValue === undefined) continue;
      const current = configValues?.[f.key];
      if (current === undefined || current === '' || current === null) {
        onConfigChange(f.key, f.defaultValue);
      }
    }
  }, [taskTypes, configValues, onConfigChange, getVisibleFields]);

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

  // 检测是否有"其他"选项被选中
  const hasOtherSelected = Object.values(configValues || {}).some(
    v => v === 'other' || (Array.isArray(v) && v.some(item => item === 'other'))
  );

  // 如果有"其他"被选中，给备注字段添加错误提示
  const remarksError = hasOtherSelected ? '选择"其他"时必填' : undefined;

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
        {(() => {
          // 2026-10-21：被前一字段 groupWithNext 配对消费的字段，需跳过独立渲染，
          //   否则「单位」会同时出现在并排容器里和网格里（渲染两次）。
          const consumedKeys = new Set(
            visibleFields
              .map((f, i) => (f.groupWithNext ? visibleFields[i + 1]?.key : undefined))
              .filter((k): k is string => Boolean(k))
          );
          return visibleFields.map((field, idx) => {
            if (consumedKeys.has(field.key)) return null;
          // 对于 remarks 字段，如果有"其他"被选中，设置错误提示
          const fieldError = field.key === 'remarks' && hasOtherSelected
            ? remarksError
            : errors[field.key];
          // 2026-10-21：groupWithNext —— 与紧邻的下一个字段并排占同一格，
          //   本字段占剩余宽度、下一字段窄宽（用于「用水量 + 单位」）。
          const pairedNext = field.groupWithNext ? visibleFields[idx + 1] : undefined;
          if (pairedNext) {
            const nextError = errors[pairedNext.key];
            return (
              <div key={field.key} className="flex items-end gap-2">
                <div className="flex-1 min-w-0">
                  <ConfigFieldRenderer
                    field={field}
                    value={configValues?.[field.key]}
                    onChange={onConfigChange}
                    error={fieldError}
                    unitOverrides={unitOverrides}
                  />
                </div>
                <div className="w-24 flex-shrink-0">
                  <ConfigFieldRenderer
                    field={pairedNext}
                    value={configValues?.[pairedNext.key]}
                    onChange={onConfigChange}
                    error={nextError}
                    unitOverrides={unitOverrides}
                  />
                </div>
              </div>
            );
          }
          return (
            <div
              key={field.key}
              className={
                // 2026-10-21：fullWidth 让复杂控件（肥料池）占满整行，
                //   textarea / multiSelect 沿用原有的整行布局
                field.fullWidth || field.type === 'textarea' || field.type === 'multiSelect'
                  ? 'md:col-span-2'
                  : ''
              }
            >
              <ConfigFieldRenderer
                field={field}
                value={configValues?.[field.key]}
                onChange={onConfigChange}
                error={fieldError}
                unitOverrides={unitOverrides}
              />
            </div>
          );
          });
        })()}
      </div>
    </div>
  );
}
