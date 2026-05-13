/**
 * 地块选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useBlockStore } from '../../../stores';

interface BlockSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  zoneOid?: string;
}

export function BlockSelect({
  value,
  onChange,
  placeholder = '选择地块',
  allowClear = true,
  disabled = false,
  zoneOid,
}: BlockSelectProps) {
  const blocks = useBlockStore((state) => state.blocks);
  const loading = useBlockStore((state) => state.loading);

  React.useEffect(() => {
    if (blocks.length === 0 && !loading) {
      useBlockStore.getState().loadBlocks();
    }
  }, [blocks.length, loading]);

  const filteredBlocks = zoneOid
    ? blocks.filter((b) => b.zoneOid === zoneOid)
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
        <option key={block.oid} value={block.oid}>
          {block.blockName} ({block.blockCode})
        </option>
      ))}
    </select>
  );
}

export default BlockSelect;
