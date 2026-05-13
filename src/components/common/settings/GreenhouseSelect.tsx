/**
 * 温室选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useGreenhouseStore } from '../../../stores';

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
  const greenhouses = useGreenhouseStore((state) => state.greenhouses);
  const loading = useGreenhouseStore((state) => state.loading);

  React.useEffect(() => {
    if (greenhouses.length === 0 && !loading) {
      useGreenhouseStore.getState().loadGreenhouses();
    }
  }, [greenhouses.length, loading]);

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
