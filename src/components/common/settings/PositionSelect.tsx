/**
 * 职位选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { usePositionStore } from '../../../stores';

interface PositionSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  departmentOid?: string;
}

export function PositionSelect({
  value,
  onChange,
  placeholder = '选择职位',
  allowClear = true,
  disabled = false,
  departmentOid,
}: PositionSelectProps) {
  const positions = usePositionStore((state) => state.positions);
  const loading = usePositionStore((state) => state.loading);

  React.useEffect(() => {
    if (positions.length === 0 && !loading) {
      usePositionStore.getState().loadPositions();
    }
  }, [positions.length, loading]);

  const filteredPositions = departmentOid
    ? positions.filter((p) => p.departmentOid === departmentOid)
    : positions;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredPositions.map((pos) => (
        <option key={pos.oid} value={pos.oid}>
          {pos.name} {pos.departmentName ? `(${pos.departmentName})` : ''}
        </option>
      ))}
    </select>
  );
}

export default PositionSelect;
