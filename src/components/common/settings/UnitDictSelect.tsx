/**
 * 单位选择组件
 * 基于数据词典的 dosage_unit 分类
 */
import React from 'react';
import { useDictionaryStore, getDictItems } from '@/stores';

interface UnitDictSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  className?: string;
}

export function UnitDictSelect({
  value,
  onChange,
  placeholder = '选择单位',
  allowClear = true,
  disabled = false,
  className = '',
}: UnitDictSelectProps) {
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loading = useDictionaryStore((state) => state.loading);

  React.useEffect(() => {
    const hasValidData = dictionaries.length > 0 && 'categoryCode' in dictionaries[0];
    if ((dictionaries.length === 0 || !hasValidData) && !loading) {
      useDictionaryStore.getState().loadDictionaries();
    }
  }, [dictionaries.length, loading]);

  const items = getDictItems('dosage_unit');

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className={`w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed ${className}`}
    >
      <option value="">{placeholder}</option>
      {items.map((item) => (
        <option key={item.dictCode} value={item.dictValue || item.dictCode}>
          {item.dictLabel}
        </option>
      ))}
    </select>
  );
}

export default UnitDictSelect;
