/**
 * 字典选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useDictionaryStore, getDictItems } from '../../../stores';

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
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loading = useDictionaryStore((state) => state.loading);

  React.useEffect(() => {
    // 检查数据是否有效（转换后的格式有 categoryCode 字段）
    const hasValidData = dictionaries.length > 0 && 'categoryCode' in dictionaries[0];
    if ((dictionaries.length === 0 || !hasValidData) && !loading) {
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [dictionaries.length, loading]);

  const items = getDictItems(category);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-500 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.dictCode} value={item.dictCode}>
          {item.dictLabel}
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
