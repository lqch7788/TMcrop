import { Search, RotateCw } from 'lucide-react';
import { RecruitmentStatus, RecruitmentSource } from './types';
import { Button } from '@/components/ui';

interface RecruitmentFiltersProps {
  searchTerm: string;
  statusFilter: RecruitmentStatus | 'all';
  sourceFilter: RecruitmentSource | 'all';
  onSearchChange: (value: string) => void;
  onStatusChange: (value: RecruitmentStatus | 'all') => void;
  onSourceChange: (value: RecruitmentSource | 'all') => void;
  onReset: () => void;
}

const statusOptions: { value: RecruitmentStatus | 'all'; label: string }[] = [
  { value: 'all', label: '全部状态' },
  { value: '待审批', label: '待审批' },
  { value: '招聘中', label: '招聘中' },
  { value: '已完成', label: '已完成' },
  { value: '已取消', label: '已取消' },
];

const sourceOptions: { value: RecruitmentSource | 'all'; label: string }[] = [
  { value: 'all', label: '全部来源' },
  { value: '劳务公司', label: '劳务公司' },
  { value: '个人零工', label: '个人零工' },
  { value: '学生实习', label: '学生实习' },
  { value: '内部推荐', label: '内部推荐' },
];

export function RecruitmentFilters({
  searchTerm,
  statusFilter,
  sourceFilter,
  onSearchChange,
  onStatusChange,
  onSourceChange,
  onReset,
}: RecruitmentFiltersProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* Search */}
        <div className="flex-1 min-w-[200px] relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索招聘编号、岗位、部门..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* Status Filter */}
        <div className="w-[140px]">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as RecruitmentStatus | 'all')}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* Source Filter */}
        <div className="w-[140px]">
          <select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value as RecruitmentSource | 'all')}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500 bg-white"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={onReset}>
            <RotateCw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" variant="default">
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}

export default RecruitmentFilters;
