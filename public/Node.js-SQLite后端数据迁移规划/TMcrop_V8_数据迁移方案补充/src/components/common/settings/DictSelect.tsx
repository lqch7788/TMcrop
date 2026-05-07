/**
 * 字典选择组件
 * 从设置数据中获取字典项列表
 */

import React from 'react';
import { useDictionaries } from './SettingsDataProvider';

interface DictSelectProps {
  value?: string;
  onChange: (value: string) => void;
  category: string;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function DictSelect({
  value,
  onChange,
  category,
  placeholder = '选择字典项',
  allowClear = true,
  disabled = false,
}: DictSelectProps) {
  const { getDictItems } = useDictionaries();

  const items = getDictItems(category);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.code} value={item.code}>
          {item.name}
        </option>
      ))}
    </select>
  );
}

// 字典显示标签组件
interface DictTagProps {
  category: string;
  code: string;
  className?: string;
}

export function DictTag({ category, code, className = '' }: DictTagProps) {
  const { getDictItemName } = useDictionaries();
  const name = getDictItemName(category, code);

  return (
    <span
      className={`inline-flex items-center px-2 py-0.5 rounded text-xs font-medium ${className}`}
    >
      {name}
    </span>
  );
}

export default DictSelect;
