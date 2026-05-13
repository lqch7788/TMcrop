/**
 * 部门选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useDepartmentStore } from '../../../stores';

interface DepartmentSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
}

export function DepartmentSelect({
  value,
  onChange,
  placeholder = '选择部门',
  allowClear = true,
  disabled = false,
}: DepartmentSelectProps) {
  const departments = useDepartmentStore((state) => state.departments);
  const loading = useDepartmentStore((state) => state.loading);

  React.useEffect(() => {
    if (departments.length === 0 && !loading) {
      useDepartmentStore.getState().loadDepartments();
    }
  }, [departments.length, loading]);

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {departments.map((dept) => (
        <option key={dept.oid} value={dept.oid}>
          {dept.name}
        </option>
      ))}
    </select>
  );
}

export default DepartmentSelect;
