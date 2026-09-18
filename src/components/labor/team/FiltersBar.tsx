/**
 * 筛选栏（2026-09-18 抽自 TeamTable）
 *
 * 2026-09-18 修复 M-1：从 TeamTable 抽出筛选栏组件。
 *   TeamTable 从 ~659 行下降到 ~600 行。
 */
import { RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import type { TeamFilters } from './types';

export interface FiltersBarProps {
  filters: TeamFilters;
  onChange: (next: TeamFilters) => void;
}

export function FiltersBar({ filters, onChange }: FiltersBarProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-center gap-4 flex-wrap">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">班组名称:</span>
          <Input
            type="text"
            placeholder="请输入"
            value={filters.name}
            onChange={(e) => onChange({ ...filters, name: e.target.value })}
            className="w-[140px]"
          />
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500 whitespace-nowrap">负责人:</span>
          <Input
            type="text"
            placeholder="请输入"
            value={filters.leaderName}
            onChange={(e) => onChange({ ...filters, leaderName: e.target.value })}
            className="w-[140px]"
          />
        </div>
        {/* 2026-09-17：移除"作业区域"筛选项（对应列已下线） */}
        <div className="flex gap-2 ml-auto">
          <Button
            size="sm"
            variant="warning"
            onClick={() => onChange({ name: '', leaderName: '' })}
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>
    </div>
  );
}