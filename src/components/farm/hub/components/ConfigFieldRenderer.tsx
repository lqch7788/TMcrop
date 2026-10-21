/**
 * 配置字段渲染器
 * 根据配置项类型动态渲染不同的输入控件
 */

import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Label } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { TextArea } from '@/components/ui';
import { TaskConfigField, MultiEntryRecord, EntryFieldDef, ConfigFieldType } from '../../../../types/farm/taskTypeConfig';
import { useDictionaryStore, getDictItems } from '@/stores';
// 2026-10-21：种源搜索下拉（业务字段，单独成组件以保持本渲染器的通用性）
import { SeedSourceSelectField } from './SeedSourceSelectField';
// 2026-10-21：肥料池 —— 直接复用「水肥管理 → 新增施肥记录」的同一个组件，
//   保证任务配置与施肥台账的肥料选择/用量/单位换算完全一致
import { FertilizerPoolEditor } from '../../fertilizer/FertilizerPoolEditor';
import type { FertilizerPoolItem } from '../../fertilizer/FertilizerPoolEditor';
// 2026-10-21：病虫害防治的两个字段 —— 复用「病虫害管理 → 新增防治记录」的同一份组件
import { TargetPestPicker } from '../../pest-control/TargetPestPicker';
import { PesticidePoolEditor } from '../../pest-control/PesticidePoolEditor';
import type { PesticidePoolItem } from '@/types/farm/pest-control';

interface ConfigFieldRendererProps {
  /** 配置项定义 */
  field: TaskConfigField;
  /** 当前值 */
  value: MultiEntryRecord[] | FertilizerPoolItem[] | PesticidePoolItem[] | string | number | boolean | string[];
  /** 值变化回调 */
  onChange: (key: string, value: MultiEntryRecord[] | FertilizerPoolItem[] | PesticidePoolItem[] | string | number | boolean | string[]) => void;
  /** 错误信息 */
  error?: string;
  /** 是否禁用 */
  disabled?: boolean;
  /** 2026-10-21：字段单位覆盖表（字段 key → 单位文本）。
   *  由 TaskTypeConfigPanel 依据 field.unitSourceField 从所选种源解析后传入，
   *  用于「种子/种苗用量」这类单位随上游选择变化的字段。 */
  unitOverrides?: Record<string, string>;
}

export function ConfigFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
  unitOverrides,
}: ConfigFieldRendererProps) {
  // 基础输入框样式
  const baseInputClass = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
    error ? 'border-red-500' : 'border-gray-400'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

  // 处理输入变化
  const handleChange = (newValue: MultiEntryRecord[] | FertilizerPoolItem[] | PesticidePoolItem[] | string | number | boolean | string[]) => {
    if (!disabled) {
      onChange(field.key, newValue);
    }
  };

  // 生成唯一ID
  const generateId = () => `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

  // 确保数据词典已加载
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loading = useDictionaryStore((state) => state.loading);
  useEffect(() => {
    const hasValidData = dictionaries.length > 0 && 'categoryCode' in dictionaries[0];
    if ((dictionaries.length === 0 || !hasValidData) && !loading) {
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [dictionaries.length, loading]);

  // ========== 渲染文本输入 ==========
  const renderTextInput = () => (
    <Input
      type="text"
      value={(value as string) || ''}
      onChange={e => handleChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      className={baseInputClass}
    />
  );

  // ========== 渲染数字输入（纯人工输入，保留2位有效数字，无上下箭头） ==========
  const renderNumberInput = () => (
    <div className="flex items-center gap-2">
      <Input
        type="text"
        inputMode="decimal"
        value={value as number ?? ''}
        onChange={e => {
          const raw = e.target.value.replace(/[^\d.-]/g, '');
          if (raw === '' || raw === '-' || raw === '.') {
            handleChange(raw);
            return;
          }
          const num = parseFloat(raw);
          if (!isNaN(num)) {
            const fixed = Math.round(num * 100) / 100;
            handleChange(fixed);
          } else {
            handleChange(raw);
          }
        }}
        onBlur={e => {
          const num = parseFloat(e.target.value);
          if (!isNaN(num)) {
            const fixed = Math.round(num * 100) / 100;
            handleChange(fixed);
          }
        }}
        disabled={disabled}
        className={`${baseInputClass} flex-1`}
        placeholder={field.placeholder}
      />
      {/* 2026-10-21：单位优先取父级解析出的动态单位（如所选种源的 株/千克/袋），
          未解析到时才回落到配置里写死的 unit */}
      {((unitOverrides?.[field.key] ?? field.unit) || '') && (
        <span className="text-sm text-gray-500 whitespace-nowrap">
          {unitOverrides?.[field.key] ?? field.unit}
        </span>
      )}
    </div>
  );

  // ========== 渲染下拉选择 ==========
  const renderSelect = () => (
    <Select
      value={(value as string) || ''}
      onValueChange={val => handleChange(val)}
      disabled={disabled}
    >
      <SelectTrigger className={baseInputClass}>
        <SelectValue placeholder="请选择" />
      </SelectTrigger>
      <SelectContent>
        {field.options?.map(opt => (
          <SelectItem key={opt.value} value={opt.value}>
            {opt.label}
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );

  // ========== 渲染数据字典下拉（2026-10-21 新增） ==========
  //   顶层字段用字典而非写死 options：采收形态取 crop_form、计量单位取 unit。
  //   字典条目可变（用户可在系统设置里增删），写死选项会与实际字典脱节。
  const renderDict = () => {
    const items = field.dictCategory ? getDictItems(field.dictCategory) : [];
    return (
      <Select
        value={(value as string) || ''}
        onValueChange={val => handleChange(val)}
        disabled={disabled}
      >
        <SelectTrigger className={baseInputClass}>
          <SelectValue placeholder={field.placeholder || '请选择'} />
        </SelectTrigger>
        <SelectContent>
          {items.length === 0 ? (
            <div className="px-3 py-2 text-sm text-gray-400">
              字典「{field.dictCategory}」暂无可用项
            </div>
          ) : (
            items.map(item => (
              <SelectItem key={item.dictCode} value={item.dictCode}>
                {item.dictLabel}
              </SelectItem>
            ))
          )}
        </SelectContent>
      </Select>
    );
  };

  // ========== 渲染多选 ==========
  const renderMultiSelect = () => {
    const selectedValues = (value as string[]) || [];
    return (
      <div className="flex flex-wrap gap-2">
        {field.options?.map(opt => {
          const isSelected = selectedValues.includes(opt.value);
          return (
            <Label
              key={opt.value}
              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-full cursor-pointer transition-colors ${
                isSelected
                  ? 'bg-emerald-100 text-emerald-700 border border-emerald-300'
                  : 'bg-gray-100 text-gray-600 border border-gray-200 hover:bg-gray-200'
              } ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              <Input
                type="checkbox"
                checked={isSelected}
                onChange={e => {
                  if (disabled) return;
                  const newValues = e.target.checked
                    ? [...selectedValues, opt.value]
                    : selectedValues.filter(v => v !== opt.value);
                  handleChange(newValues);
                }}
                disabled={disabled}
                className="sr-only"
              />
              {opt.label}
            </Label>
          );
        })}
      </div>
    );
  };

  // ========== 渲染多行文本 ==========
  const renderTextarea = () => (
    <TextArea
      value={(value as string) || ''}
      onChange={e => handleChange(e.target.value)}
      placeholder={field.placeholder}
      disabled={disabled}
      rows={3}
      className={`${baseInputClass} resize-none`}
    />
  );

  // ========== 渲染单条条目中的字段 ==========
  const renderEntryField = (
    fieldDef: EntryFieldDef,
    entryValue: Record<string, string | number>,
    entryId: string,
    onEntryChange: (fieldKey: string, fieldValue: string | number) => void
  ) => {
    const fieldValue = entryValue[fieldDef.key] || '';

    switch (fieldDef.type) {
      case 'text':
        return (
          <div key={fieldDef.key} className="flex-1 min-w-[120px]">
            <Label className="text-xs text-gray-500 mb-1">{fieldDef.label}</Label>
            <Input
              type="text"
              value={fieldValue as string}
              onChange={e => onEntryChange(fieldDef.key, e.target.value)}
              placeholder={fieldDef.placeholder}
              disabled={disabled}
              className={`${baseInputClass} text-sm`}
            />
          </div>
        );

      case 'select':
        return (
          <div key={fieldDef.key} className="flex-1 min-w-[120px]">
            <Label className="text-xs text-gray-500 mb-1">{fieldDef.label}</Label>
            <Select
              value={fieldValue as string}
              onValueChange={val => onEntryChange(fieldDef.key, val)}
              disabled={disabled}
            >
              <SelectTrigger className={`${baseInputClass} text-sm`}>
                <SelectValue placeholder="请选择" />
              </SelectTrigger>
              <SelectContent>
                {fieldDef.options?.map(opt => (
                  <SelectItem key={opt.value} value={opt.value}>
                    {opt.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        );

      case 'number':
        return (
          <div key={fieldDef.key} className="flex-1 min-w-[100px]">
            <Label className="text-xs text-gray-500 mb-1">
              {fieldDef.label}
              {fieldDef.unit && <span className="text-gray-400 ml-1">({fieldDef.unit})</span>}
            </Label>
            <Input
              type="text"
              inputMode="decimal"
              value={fieldValue}
              onChange={e => {
                const raw = e.target.value.replace(/[^\d.-]/g, '');
                if (raw === '' || raw === '-' || raw === '.') {
                  onEntryChange(fieldDef.key, raw);
                  return;
                }
                const num = parseFloat(raw);
                if (!isNaN(num)) {
                  const fixed = Math.round(num * 100) / 100;
                  onEntryChange(fieldDef.key, fixed);
                }
              }}
              onBlur={e => {
                const num = parseFloat(e.target.value);
                if (!isNaN(num)) {
                  const fixed = Math.round(num * 100) / 100;
                  onEntryChange(fieldDef.key, fixed);
                }
              }}
              disabled={disabled}
              className={`${baseInputClass} text-sm`}
            />
          </div>
        );

      case 'dict':
        return (
          <div key={fieldDef.key} className="flex-1 min-w-[120px]">
            <Label className="text-xs text-gray-500 mb-1">{fieldDef.label}</Label>
            <select
              value={fieldValue as string}
              onChange={e => onEntryChange(fieldDef.key, e.target.value)}
              disabled={disabled}
              className={`${baseInputClass} text-sm`}
            >
              <option value="">选择单位</option>
              {(fieldDef.dictCategory ? getDictItems(fieldDef.dictCategory) : []).map(item => (
                <option key={item.dictCode} value={item.dictValue || item.dictCode}>
                  {item.dictLabel}
                </option>
              ))}
            </select>
          </div>
        );

      default:
        return null;
    }
  };

  // ========== 渲染种源搜索下拉（2026-10-21 新增） ==========
  //   关联内部种源列表，不走 field.options（该字段的 options 已随虚构选项一并移除）
  const renderSeedSourceSelect = () => (
    <SeedSourceSelectField
      value={(value as string) || ''}
      onChange={(id) => handleChange(id)}
      disabled={disabled}
      error={error}
      placeholder={field.placeholder}
    />
  );

  // ========== 渲染目标病虫害多选（2026-10-21 新增） ==========
  //   复用「病虫害管理 → 新增防治记录」的 TargetPestPicker，病虫害/虫害双 Tab + 搜索多选
  const renderTargetPestPicker = () => (
    <TargetPestPicker
      value={Array.isArray(value) ? (value as string[]) : []}
      onChange={(names) => handleChange(names)}
      disabled={disabled}
      // 2026-10-21：该字段的必填红星由组件自己显示（外层 Label 已对它整块跳过）
      required={field.required || Boolean(error)}
    />
  );

  // ========== 渲染防治药剂池（2026-10-21 新增） ==========
  //   复用「病虫害管理 → 新增防治记录」的 PesticidePoolEditor
  const renderPesticidePool = () => {
    const pool: PesticidePoolItem[] = Array.isArray(value)
      ? (value as unknown[]).filter(
          (v): v is PesticidePoolItem =>
          typeof v === 'object' && v !== null && 'pesticideName' in (v as object)
        )
      : [];
    return <PesticidePoolEditor pool={pool} onChange={(next) => handleChange(next)} disabled={disabled} />;
  };

  // ========== 渲染肥料池（2026-10-21 新增） ==========
  //   与「水肥管理 → 新增施肥记录」的「肥料选择与用量」复用同一个组件，
  //   保证任务配置与施肥台账在肥料选择/用量/单位换算上完全一致。
  //   值域为 FertilizerPoolItem[]，对历史数据（若存的是别的形态）做防御性过滤。
  const renderFertilizerPool = () => {
    const pool: FertilizerPoolItem[] = Array.isArray(value)
      ? (value as unknown[]).filter(
          (v): v is FertilizerPoolItem => typeof v === 'object' && v !== null && 'specId' in (v as object)
        )
      : [];
    return (
      <FertilizerPoolEditor
        pool={pool}
        onChange={(next) => handleChange(next)}
      />
    );
  };

  // ========== 渲染多条目输入（混合配比） ==========
  const renderMultiEntry = () => {
    // 防御性检查：确保 entries 是有效数组
    // 仅 multiEntry 字段走本分支（取值类型为 MultiEntryRecord[]）；string[] 是父级联合类型的兜底分支
    const entries: MultiEntryRecord[] = Array.isArray(value)
      ? value.filter((v): v is MultiEntryRecord => typeof v === 'object' && v !== null)
      : [];
    const maxEntries = field.multiEntryDef?.maxEntries || 5;
    const multiEntryFields = field.multiEntryDef?.fields || [];

    // 添加新条目
    const handleAddEntry = () => {
      if (entries.length >= maxEntries) return;

      const newEntry: MultiEntryRecord = { id: generateId() };
      // 使用预获取的 multiEntryFields，避免可选链问题
      multiEntryFields.forEach(f => {
        newEntry[f.key] = '';
      });

      handleChange([...entries, newEntry]);
    };

    // 删除条目
    const handleRemoveEntry = (id: string) => {
      handleChange(entries.filter(e => e && e.id !== id));
    };

    // 更新条目中某个字段
    const handleEntryChange = (id: string, fieldKey: string, fieldValue: string | number) => {
      handleChange(
        entries.map(e => (e && e.id === id ? { ...e, [fieldKey]: fieldValue } : e))
      );
    };

    return (
      <div className="space-y-3">
        {/* 条目列表 */}
        {entries.map((entry, index) => (
          <div
            key={entry.id}
            className="flex items-start gap-2 p-3 bg-white border border-gray-200 rounded-lg"
          >
            {/* 条目序号 */}
            <div className="flex-shrink-0 w-6 h-6 mt-6 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center text-xs font-medium">
              {index + 1}
            </div>

            {/* 条目字段 */}
            <div className="flex-1 flex flex-wrap gap-3">
              {field.multiEntryDef?.fields.map(fieldDef =>
                renderEntryField(fieldDef, entry, entry.id, (fk, fv) =>
                  handleEntryChange(entry.id, fk, fv)
                )
              )}
            </div>

            {/* 删除按钮 */}
            <Button
              variant="ghost"
              size="icon"
              type="button"
              onClick={() => handleRemoveEntry(entry.id)}
              disabled={disabled || entries.length <= 1}
              className="flex-shrink-0 mt-6 text-gray-400 hover:text-red-500"
              title="删除此条"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        ))}

        {/* 添加按钮 */}
        {entries.length < maxEntries && (
          <Button
            variant="outline"
            size="sm"
            type="button"
            onClick={handleAddEntry}
            disabled={disabled}
            className="text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 border-dashed border-emerald-300"
          >
            <Plus className="w-4 h-4" />
            添加{field.multiEntryDef?.entryLabel || '条目'}
          </Button>
        )}

        {/* 提示 */}
        {entries.length > 0 && (
          <p className="text-xs text-gray-500">
            已添加 {entries.length}/{maxEntries} 条
          </p>
        )}
      </div>
    );
  };

  // 根据类型渲染对应的输入控件
  const renderInput = () => {
    switch (field.type) {
      case 'text':
        return renderTextInput();
      case 'number':
        return renderNumberInput();
      case 'select':
        return renderSelect();
      case 'multiSelect':
        return renderMultiSelect();
      case 'textarea':
        return renderTextarea();
      case 'multiEntry':
        return renderMultiEntry();
      case 'fertilizerPool':
        return renderFertilizerPool();
      case 'targetPestPicker':
        return renderTargetPestPicker();
      case 'pesticidePool':
        return renderPesticidePool();
      case 'seedSourceSelect':
        return renderSeedSourceSelect();
      case 'dict':
        return renderDict();
      default:
        return renderTextInput();
    }
  };

  // 2026-10-21：自带标题的复杂字段类型 —— 组件内部已有自己的 Label，
  //   外层再渲染一次会出现两行重复标题（用户报的 bug）。
  //   这类字段的必填红星由组件自己显示，故外层整块跳过。
  const SELF_TITLED_TYPES: ConfigFieldType[] = ['targetPestPicker'];

  return (
    <div>
      {!SELF_TITLED_TYPES.includes(field.type) && (
        <Label className="text-gray-700">
          {field.label}
          {(field.required || error) && <span className="text-red-500 ml-1">*</span>}
        </Label>
      )}
      {renderInput()}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
