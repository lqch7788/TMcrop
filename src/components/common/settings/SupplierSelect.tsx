/**
 * 供应商选择组件
 * 从供应商服务获取供应商列表
 */

import React, { useEffect, useState } from 'react';
import { getActiveSuppliers } from '../../../services/apiSupplierService';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '../../ui/select';

interface SupplierOption {
  value: string;
  label: string;
  code: string;
}

interface SupplierSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** 供应商类型过滤 */
  supplierType?: string;
}

export function SupplierSelect({
  value,
  onChange,
  placeholder = '选择供应商',
  allowClear = true,
  disabled = false,
  supplierType,
}: SupplierSelectProps) {
  const [suppliers, setSuppliers] = useState<SupplierOption[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSuppliers = async () => {
      try {
        const data = await getActiveSuppliers();
        // 如果有类型过滤，对结果进行过滤
        const filtered = supplierType
          ? data.filter(s => s.code.startsWith(supplierType))
          : data;
        setSuppliers(filtered);
      } catch (error) {
        // logger.error('Failed to fetch suppliers:', error);
        setSuppliers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchSuppliers();
  }, [supplierType]);

  return (
    <Select
      value={value || ''}
      onValueChange={(val) => onChange(val)}
      disabled={disabled || loading}
    >
      <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed">
        <SelectValue placeholder={placeholder} />
      </SelectTrigger>
      <SelectContent>
        <SelectItem value="">{placeholder}</SelectItem>
        {suppliers.map((supplier) => (
          <SelectItem key={supplier.value} value={supplier.value}>
            {supplier.label} ({supplier.code})
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  );
}

export default SupplierSelect;
