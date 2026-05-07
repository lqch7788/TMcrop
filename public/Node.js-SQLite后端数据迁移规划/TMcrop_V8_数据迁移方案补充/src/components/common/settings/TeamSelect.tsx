/**
 * 班组选择组件
 * 从设置数据中获取班组列表
 */

import React from 'react';
import { useTeams } from './SettingsDataProvider';

interface TeamSelectProps {
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  allowClear?: boolean;
  disabled?: boolean;
  departmentOid?: string;
}

export function TeamSelect({
  value,
  onChange,
  placeholder = '选择班组',
  allowClear = true,
  disabled = false,
  departmentOid,
}: TeamSelectProps) {
  const { teams } = useTeams();

  const filteredTeams = departmentOid
    ? teams.filter((t) => t.departmentOid === departmentOid)
    : teams;

  return (
    <select
      value={value || ''}
      onChange={(e) => onChange(e.target.value)}
      disabled={disabled}
      className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
    >
      <option value="">{placeholder}</option>
      {filteredTeams.map((team) => (
        <option key={team.oid} value={team.oid}>
          {team.teamName} {team.shiftType === 'day' ? '(白班)' : '(夜班)'}
        </option>
      ))}
    </select>
  );
}

export default TeamSelect;
