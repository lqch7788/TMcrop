/**
 * 温室选择组件
 * 从设置数据中获取温室列表
 */

import React from 'react';
import { useGreenhouses } from './SettingsDataProvider';

interface GreenhouseSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  greenhouseType?: string;
}

export function GreenhouseSelect({
  value,
  onChange,
  placeholder = '选择温室',
  allowClear = true,
  disabled = false,
  greenhouseType,
}: GreenhouseSelectProps) {
  const { greenhouses } = useGreenhouses();

  const filteredGreenhouses = greenhouseType
    ? greenhouses.filter((g) => g.greenhouseType === greenhouseType)
    : greenhouses;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredGreenhouses.map((gh) => (
        <option key={gh.oid} value={gh.oid}>
          {gh.name} ({gh.code})
        </option>
      ))}
    </select>
  );
}

export default GreenhouseSelect;
