/**
 * 地块选择组件
 * 从设置数据中获取地块列表
 */

import React from 'react';
import { useBlocks } from './SettingsDataProvider';

interface BlockSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  zoneId?: string;
}

export function BlockSelect({
  value,
  onChange,
  placeholder = '选择地块',
  allowClear = true,
  disabled = false,
  zoneId,
}: BlockSelectProps) {
  const { blocks } = useBlocks();

  const filteredBlocks = zoneId
    ? blocks.filter((b) => b.zoneId === zoneId)
    : blocks;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredBlocks.map((block) => (
        <option key={block.id} value={block.id}>
          {block.blockName} ({block.blockCode})
        </option>
      ))}
    </select>
  );
}

export default BlockSelect;
