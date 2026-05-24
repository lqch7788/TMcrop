/**
 * 仓库选择组件
 * 直接使用 Zustand Store
 */

import React, { useEffect } from 'react';
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
  const loadWarehouses = useWarehouseStore((state) => state.loadWarehouses);

  // 初始加载或当 warehouseType 变化但数据为空时重新加载
  useEffect(() => {
    if (warehouses.length === 0 && !loading) {
      loadWarehouses();
    }
  }, [warehouses.length, loading, loadWarehouses]);

  // 当切换仓库类型时，如果过滤结果为空，强制刷新数据
  useEffect(() => {
    if (warehouseType && warehouses.length > 0) {
      const filtered = warehouses.filter((w) => w.warehouseType === warehouseType);
      if (filtered.length === 0) {
        // 强制重新加载数据
        loadWarehouses();
      }
    }
  }, [warehouseType, warehouses, loadWarehouses]);

  const filteredWarehouses = warehouseType
    ? warehouses.filter((w) => w.warehouseType === warehouseType)
    : warehouses;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
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
