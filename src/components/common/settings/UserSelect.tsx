/**
 * 用户选择组件
 * 直接从 API 获取用户数据，不使用 localStorage 缓存
 */

import React, { useState, useEffect, useRef } from 'react';
import { getUsers } from '../../../services/authorityService';
import { type User } from '../../../types/authority';

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
  /** 选项值字段：'oid'=用户ID, 'name'=用户姓名，默认 'oid' */
  valueField?: 'oid' | 'name';
}

export function UserSelect({
  value,
  onChange,
  placeholder = '选择用户',
  allowClear = true,
  disabled = false,
  activeOnly = true,
  valueField = 'oid',
}: UserSelectProps) {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsers();
        setUsers(data || []);
      } catch (error) {
        // logger.error('加载用户失败:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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
      disabled={disabled || loading}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{loading ? '加载中...' : placeholder}</option>
      {filteredUsers.map((user) => (
        <option key={user.oid} value={valueField === 'name' ? user.name : user.oid}>
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
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(false);
  const hasLoadedRef = useRef(false);

  useEffect(() => {
    if (hasLoadedRef.current) return;
    hasLoadedRef.current = true;

    const fetchUsers = async () => {
      setLoading(true);
      try {
        const data = await getUsers();
        setUsers(data || []);
      } catch (error) {
        // logger.error('加载用户失败:', error);
        setUsers([]);
      } finally {
        setLoading(false);
      }
    };

    fetchUsers();
  }, []);

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
      disabled={disabled || loading}
      className="w-full min-h-[100px] px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      {filteredUsers.map((user) => (
        <option key={user.oid} value={valueField === 'name' ? user.name : user.oid}>
          {user.name}
        </option>
      ))}
    </select>
  );
}

export default UserSelect;
