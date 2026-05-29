/**
 * 配置字段渲染器
 * 根据配置项类型动态渲染不同的输入控件
 */

import React, { useState, useEffect } from 'react';
import { Plus, X } from 'lucide-react';
import { Button, Label } from '@/components/ui';
import { Input } from '../../../ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../../../ui/select';
import { TextArea } from '../../../ui/TextArea';
import { TaskConfigField, MultiEntryRecord, EntryFieldDef } from '../../../../types/farm/taskTypeConfig';
import { useDictionaryStore, getDictItems } from '@/stores';

interface ConfigFieldRendererProps {
  /** 配置项定义 */
  field: TaskConfigField;
  /** 当前值 */
  value: MultiEntryRecord[] | string | number | boolean | string[];
  /** 值变化回调 */
  onChange: (key: string, value: MultiEntryRecord[] | string | number | boolean | string[]) => void;
  /** 错误信息 */
  error?: string;
  /** 是否禁用 */
  disabled?: boolean;
}

export function ConfigFieldRenderer({
  field,
  value,
  onChange,
  error,
  disabled,
}: ConfigFieldRendererProps) {
  // 基础输入框样式
  const baseInputClass = `w-full px-3 py-2 border rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent transition-all ${
    error ? 'border-red-500' : 'border-gray-400'
  } ${disabled ? 'bg-gray-100 cursor-not-allowed' : ''}`;

  // 处理输入变化
  const handleChange = (newValue: MultiEntryRecord[] | string | number | boolean | string[]) => {
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
      {field.unit && (
        <span className="text-sm text-gray-500 whitespace-nowrap">{field.unit}</span>
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

  // ========== 渲染多条目输入（混合配比） ==========
  const renderMultiEntry = () => {
    // 防御性检查：确保 entries 是有效数组
    const entries: MultiEntryRecord[] = Array.isArray(value) ? value : [];
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
      default:
        return renderTextInput();
    }
  };

  return (
    <div>
      <Label className="text-gray-700">
        {field.label}
        {(field.required || error) && <span className="text-red-500 ml-1">*</span>}
      </Label>
      {renderInput()}
      {error && <p className="mt-1 text-sm text-red-500">{error}</p>}
    </div>
  );
}
