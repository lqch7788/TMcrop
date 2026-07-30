/**
 * TeamChipMultiSelect
 *
 * 横向 chip 列表，多选班组。
 * 数据源 useTeamStore.teams，超过 6 个班组时显示 "+N"。
 * 用于 SmartDispatch 派工页面的班组候选池筛选。
 *
 * 排班调度 × 班组分配贯通（2026-07-30）
 */
import React from 'react';
import { useTeamStore } from '../../stores/useTeamStore';

export interface TeamChipMultiSelectProps {
  /** 当前选中的班组 ID 数组 */
  value: string[];
  /** 选中变化回调 */
  onChange: (teamIds: string[]) => void;
}

/** 超过此数量时折叠显示 "+N" */
const VISIBLE_LIMIT = 6;

export function TeamChipMultiSelect({ value, onChange }: TeamChipMultiSelectProps) {
  const { teams, loading } = useTeamStore();

  // 切换选中：已选则取消，未选则追加
  const toggle = (teamId: string): void => {
    if (value.includes(teamId)) {
      onChange(value.filter((id) => id !== teamId));
    } else {
      onChange([...value, teamId]);
    }
  };

  if (loading) {
    return (
      <div className="text-sm text-gray-500" data-testid="team-chip-multiselect">
        班组加载中...
      </div>
    );
  }
  if (teams.length === 0) {
    return null;
  }

  const visible = teams.slice(0, VISIBLE_LIMIT);
  const hidden = teams.length - visible.length;

  return (
    <div className="flex flex-wrap gap-2" data-testid="team-chip-multiselect">
      {visible.map((team) => {
        const selected = value.includes(team.id);
        return (
          <button
            key={team.id}
            type="button"
            data-testid={`team-chip-${team.id}`}
            onClick={() => toggle(team.id)}
            aria-pressed={selected}
            className={`px-3 py-1 rounded-full text-sm border transition-colors ${
              selected
                ? 'bg-emerald-500 text-white border-emerald-500'
                : 'bg-white text-gray-700 border-gray-300 hover:border-emerald-400'
            }`}
          >
            {team.teamName}
          </button>
        );
      })}
      {hidden > 0 && (
        <span className="px-3 py-1 text-sm text-gray-500">+{hidden}</span>
      )}
    </div>
  );
}