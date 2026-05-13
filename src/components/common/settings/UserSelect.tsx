/**
 * 用户选择组件
 * 直接使用 Zustand Store
 */

import React from 'react';
import { useUserStore } from '../../../stores';

interface UserSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** 筛选用户角色，如 'worker', 'technician' - 暂不支持 */
  roleFilter?: string[];
  /** 是否只显示活跃用户 */
  activeOnly?: boolean;
}

export function UserSelect({
  value,
  onChange,
  placeholder = '选择用户',
  allowClear = true,
  disabled = false,
  activeOnly = true,
}: UserSelectProps) {
  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);

  React.useEffect(() => {
    if (users.length === 0 && !loading) {
      useUserStore.getState().loadUsers();
    }
  }, [users.length, loading]);

  const filteredUsers = users.filter((user) => {
    // 过滤活跃状态
    if (activeOnly && user.status !== 'active') {
      return false;
    }
    return true;
  });

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredUsers.map((user) => (
        <option key={user.oid} value={user.oid}>
          {user.name}
        </option>
      ))}
    </select>
  );
}

// 多选用户选择组件
interface UserMultiSelectProps {
  values: string[];
  onChange: (values: string[]) => void;
  placeholder?: string;
  disabled?: boolean;
  roleFilter?: string[];
  activeOnly?: boolean;
}

export function UserMultiSelect({
  values,
  onChange,
  placeholder = '选择用户',
  disabled = false,
  activeOnly = true,
}: UserMultiSelectProps) {
  const users = useUserStore((state) => state.users);
  const loading = useUserStore((state) => state.loading);

  React.useEffect(() => {
    if (users.length === 0 && !loading) {
      useUserStore.getState().loadUsers();
    }
  }, [users.length, loading]);

  const filteredUsers = users.filter((user) => {
    if (activeOnly && user.status !== 'active') {
      return false;
    }
    return true;
  });

  return (
    <select
      multiple
      value={values}
      onChange={(e) => {
        const selected = Array.from(e.target.selectedOptions, (option) => option.value);
        onChange(selected);
      }}
      disabled={disabled}
      className="w-full min-h-[100px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      {filteredUsers.map((user) => (
        <option key={user.oid} value={user.oid}>
          {user.name}
        </option>
      ))}
    </select>
  );
}

export default UserSelect;
