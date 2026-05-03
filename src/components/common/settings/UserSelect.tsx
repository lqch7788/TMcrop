/**
 * 用户选择组件
 * 从设置数据中获取用户列表
 */

import React from 'react';
import { useUsers } from './SettingsDataProvider';

interface UserSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  /** 筛选用户角色，如 'worker', 'technician' */
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
  roleFilter,
  activeOnly = true,
}: UserSelectProps) {
  const { users } = useUsers();

  const filteredUsers = users.filter((user) => {
    // 过滤活跃状态
    if (activeOnly && user.status !== 'active') {
      return false;
    }
    // 过滤角色
    if (roleFilter && roleFilter.length > 0) {
      const userRole = user.roleIds?.[0];
      // 简单的角色匹配
      if (!roleFilter.some(r => userRole?.includes(r))) {
        return false;
      }
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
        <option key={user.id} value={user.id}>
          {user.realName || user.name} ({user.departmentName || user.orgName || '未分配部门'})
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
  roleFilter,
  activeOnly = true,
}: UserMultiSelectProps) {
  const { users } = useUsers();

  const filteredUsers = users.filter((user) => {
    if (activeOnly && user.status !== 'active') {
      return false;
    }
    if (roleFilter && roleFilter.length > 0) {
      const userRole = user.roleIds?.[0];
      if (!roleFilter.some(r => userRole?.includes(r))) {
        return false;
      }
    }
    return true;
  });

  const handleToggle = (userId: string) => {
    if (values.includes(userId)) {
      onChange(values.filter((v) => v !== userId));
    } else {
      onChange([...values, userId]);
    }
  };

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
        <option key={user.id} value={user.id}>
          {user.realName || user.name} ({user.departmentName || user.orgName || '未分配部门'})
        </option>
      ))}
    </select>
  );
}

export default UserSelect;
