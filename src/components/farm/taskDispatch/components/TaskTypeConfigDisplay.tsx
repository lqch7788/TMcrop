/**
 * 任务类型配置只读显示组件
 * 用于在详情弹窗中展示任务类型配置内容
 */

import React, { useEffect, useMemo } from 'react';
import { Label } from '@/components/ui';
import { getTaskTypeConfig, TaskConfigField, MultiEntryDef } from '../../../../types/farm/taskTypeConfig';
import { TaskConfigValues } from '../hooks/useTaskTypeConfig';
import { getDictLabel } from '@/stores/useDictionaryStore';
import { useSeedSourceStore } from '@/stores/useSeedSourceStore';
import type { SeedSource } from '../../../../types/crop';

export interface TaskTypeConfigDisplayProps {
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
 * 池内条目的只读展示（2026-10-21）
 *
 * 背景：施肥的「肥料选择与用量」与病虫害防治的「防治药剂池」存的是**对象数组**
 *   （FertilizerPoolItem[] / PesticidePoolItem[]）。此前 renderFieldValue 的兜底分支
 *   直接 String(value) → 详情里显示成 "[object Object]"（用户实测反馈）。
 *
 * 这里按池内条目的实际字段渲染成可读卡片：名称/编号/规格/类型/用量+单位/库存。
 */
function renderPoolItem(item: Record<string, any>, idx: number, kind: 'pesticide' | 'fertilizer'): React.ReactNode {
  const isPesticide = kind === 'pesticide';
  const name = isPesticide ? item.pesticideName : item.fertilizerName;
  const code = isPesticide ? item.pesticideCode : item.fertilizerCode;
  // 药剂的分类在 pesticideTypes（数组）；肥料的分类在 fertilizerType（单值）
  const typeTags: string[] = isPesticide
    ? (item.pesticideTypes || []).map((t: string) => getDictLabel('pesticide_type', t) || t)
    : item.fertilizerType
      ? [getDictLabel('fertilizer_type', item.fertilizerType) || item.fertilizerType]
      : [];
  const spec = item.specContent || '';
  const brand = item.brandName || '';
  const manufacturer = item.manufacturer || '';
  const dosage = item.dosage || '';
  const unit = item.unit || '';
  const dilution = item.dilutionRatio || '';
  const method = isPesticide
    ? getDictLabel('application_method', item.applicationMethod || '') || item.applicationMethod || ''
    : getDictLabel('fertilization_method', item.fertilizationMethod || '') || item.fertilizationMethod || '';
  const stock = item.stockQuantity;
  const stockUnit = item.stockUnit || '';

  return (
    <div key={idx} className="bg-white rounded-lg p-3 border border-gray-200">
      <div className="flex items-center gap-2 flex-wrap mb-2">
        <span className="text-xs font-bold text-emerald-700">#{idx + 1}</span>
        <span className="text-sm font-semibold text-gray-900">{name || '—'}</span>
        {code && <span className="text-xs text-gray-400 font-mono">{code}</span>}
        {typeTags.map((t, i) => (
          <span key={i} className="text-xs px-1.5 py-0.5 rounded bg-emerald-100 text-emerald-700">
            {t}
          </span>
        ))}
        {(spec || brand || manufacturer) && (
          <span className="text-xs text-gray-600 truncate">
            {spec}
            {brand && <span className="text-gray-500"> · {brand}</span>}
            {manufacturer && <span className="text-gray-500"> · {manufacturer}</span>}
          </span>
        )}
      </div>
      <div className="flex flex-wrap gap-x-5 gap-y-1 text-xs text-gray-600">
        {(dosage || unit) && (
          <span>
            用量：<span className="text-gray-900">{dosage || '—'}</span>
            {unit && <span className="text-gray-400 ml-1">{unit}</span>}
          </span>
        )}
        {dilution && <span>稀释倍数：<span className="text-gray-900">{dilution}</span></span>}
        {method && <span>使用方法：<span className="text-gray-900">{method}</span></span>}
        {stock !== undefined && stock !== null && (
          <span>库存：<span className="text-gray-900">{Number(stock).toFixed(2)}</span> {stockUnit}</span>
        )}
      </div>
    </div>
  );
}

/**
 * 渲染单个配置字段值
 */
function renderFieldValue(
  field: TaskConfigField,
  value: any,
  seedSourceMap: Record<string, SeedSource>
): React.ReactNode {
  if (value === undefined || value === null || value === '') {
    return <span className="text-gray-400">-</span>;
  }

  // 处理下拉选择类型 - 需要转换为中文标签
  // 2026-10-21：字典字段 —— 存的是 dictCode，需翻译成中文标签
  //   （如采收形态 'leaf' → 「叶片」、单位 '千克' → 字典标签）
  if (field.type === 'dict' && field.dictCategory) {
    const label = getDictLabel(field.dictCategory, String(value));
    return <span className="text-gray-900">{label || String(value)}</span>;
  }

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

  // 2026-10-21：防治药剂池 —— 对象数组，必须逐条渲染（否则 String(value) → "[object Object]"）
  if (field.type === 'pesticidePool' && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">-</span>;
    return (
      <div className="space-y-2">
        {value.map((item: Record<string, any>, idx: number) =>
          renderPoolItem(item, idx, 'pesticide')
        )}
      </div>
    );
  }

  // 2026-10-21：肥料池 —— 同上
  if (field.type === 'fertilizerPool' && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">-</span>;
    return (
      <div className="space-y-2">
        {value.map((item: Record<string, any>, idx: number) =>
          renderPoolItem(item, idx, 'fertilizer')
        )}
      </div>
    );
  }

  // 2026-10-21：目标病虫害 —— 字符串数组，显示为 chip（此前会被 String() 拼成 "早疫病,白粉虱"）
  if (field.type === 'targetPestPicker' && Array.isArray(value)) {
    if (value.length === 0) return <span className="text-gray-400">-</span>;
    return (
      <div className="flex flex-wrap gap-1">
        {value.map((v: string, idx: number) => (
          <span key={idx} className="px-2 py-0.5 bg-purple-100 text-purple-700 rounded text-xs">
            {v}
          </span>
        ))}
      </div>
    );
  }

  // 2026-10-21：种源选择 —— 存的是种源 ID，需查种源库还原名称/编号/可用量
  if (field.type === 'seedSourceSelect') {
    const hit = seedSourceMap[String(value)];
    if (!hit) {
      // 查不到时原样显示：历史任务的该字段存的是旧版虚构枚举（strawberry/other 等），
      //   不是被删除的种源 ID，套上"已删除"文案反而是错误断言。
      return <span className="text-gray-900">{String(value)}</span>;
    }
    return (
      <div className="text-sm text-gray-900">
        <span className="font-medium">{hit.cropVariety || hit.cropName || hit.varietyName || '—'}</span>
        <span className="text-xs text-gray-500 ml-2 font-mono">{hit.seedCode}</span>
        <span className="text-xs text-gray-500 ml-2">
          可用 {Number(hit.availableCount ?? 0)} {hit.unit || ''}
        </span>
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

  // 2026-10-21：兜底前先拦下「对象/对象数组」—— 直接 String() 会得到 "[object Object]"
  //   （这正是用户实测看到的现象）。改为显示可读摘要而非乱码。
  if (typeof value === 'object') {
    if (Array.isArray(value)) {
      return (
        <div className="flex flex-wrap gap-1">
          {value.map((v: any, idx: number) => (
            <span key={idx} className="px-2 py-0.5 bg-gray-100 text-gray-700 rounded text-xs">
              {typeof v === 'object' && v !== null
                ? String(v.name || v.title || v.label || v.fertilizerName || v.pesticideName || '条目')
                : String(v)}
            </span>
          ))}
        </div>
      );
    }
    return (
      <span className="text-gray-900">
        {String((value as any).name || (value as any).title || (value as any).label || '—')}
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

  // 2026-10-21：种源库查询（供「种子/种苗名称」还原名称/编号/可用量）
  const seedSources = useSeedSourceStore((s) => s.items);
  const loadSeedSources = useSeedSourceStore((s) => s.loadItems);
  useEffect(() => {
    if (seedSources.length === 0) {
      loadSeedSources();
    }
  }, [seedSources.length, loadSeedSources]);

  const seedSourceMap = useMemo(() => {
    const map: Record<string, SeedSource> = {};
    for (const s of seedSources) {
      map[String(s.id)] = s;
    }
    return map;
  }, [seedSources]);

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

  // 2026-10-21：单位动态解析 —— 「种子/种苗用量」的单位随所选种源而定
  //   （unitSourceField 声明来源字段；此处按来源字段的取值反查单位）
  const resolveUnit = (field: TaskConfigField): string | undefined => {
    if (field.unit) return field.unit;
    if (!field.unitSourceField) return undefined;
    const srcId = configValues?.[field.unitSourceField];
    if (typeof srcId !== 'string' || !srcId) return undefined;
    return seedSourceMap[srcId]?.unit || undefined;
  };

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
            const displayUnit = resolveUnit(field);

            return (
              <div key={field.key} className="space-y-1">
                <Label className="text-xs text-gray-500 flex items-center gap-1">
                  {field.label}
                  {displayUnit && field.type !== 'number' && <span className="text-gray-400">({displayUnit})</span>}
                </Label>
                <div className="text-sm">
                  {renderFieldValue(field, value, seedSourceMap)}
                  {/* 数字字段的动态单位（来自 unitSourceField）：
                      renderFieldValue 只认配置里写死的 field.unit，
                      动态单位需在此补，且不能与 field.unit 重复渲染 */}
                  {field.type === 'number' && !field.unit && displayUnit && (
                    <span className="text-gray-400 text-xs ml-1">{displayUnit}</span>
                  )}
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
