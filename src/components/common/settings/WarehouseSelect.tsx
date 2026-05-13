/**
 * 仓库选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useWarehouseStore } from '../../../stores';

interface WarehouseSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  warehouseType?: string;
}

export function WarehouseSelect({
  value,
  onChange,
  placeholder = '选择仓库',
  allowClear = true,
  disabled = false,
  warehouseType,
}: WarehouseSelectProps) {
  const warehouses = useWarehouseStore((state) => state.warehouses);
  const loading = useWarehouseStore((state) => state.loading);

  React.useEffect(() => {
    if (warehouses.length === 0 && !loading) {
      useWarehouseStore.getState().loadWarehouses();
    }
  }, [warehouses.length, loading]);

  const filteredWarehouses = warehouseType
    ? warehouses.filter((w) => w.warehouseType === warehouseType)
    : warehouses;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredWarehouses.map((wh) => (
        <option key={wh.oid} value={wh.oid}>
          {wh.name} ({wh.code})
        </option>
      ))}
    </select>
  );
}

export default WarehouseSelect;
