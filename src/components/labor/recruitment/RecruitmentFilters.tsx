import { Search, Filter, X } from 'lucide-react';
import { RecruitmentStatus, RecruitmentSource } from './types';
import { Button } from '@/components/ui/button';

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
  const hasActiveFilters = searchTerm || statusFilter !== 'all' || sourceFilter !== 'all';

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex flex-col lg:flex-row gap-4">
        {/* Search */}
        <div className="flex-1 relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="text"
            placeholder="搜索招聘编号、岗位、部门..."
            value={searchTerm}
            onChange={(e) => onSearchChange(e.target.value)}
            className="w-full pl-10 pr-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* Status Filter */}
        <div className="relative">
          <select
            value={statusFilter}
            onChange={(e) => onStatusChange(e.target.value as RecruitmentStatus | 'all')}
            className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {statusOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Source Filter */}
        <div className="relative">
          <select
            value={sourceFilter}
            onChange={(e) => onSourceChange(e.target.value as RecruitmentSource | 'all')}
            className="appearance-none w-full lg:w-40 px-4 py-2.5 border border-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white"
          >
            {sourceOptions.map((option) => (
              <option key={option.value} value={option.value}>{option.label}</option>
            ))}
          </select>
          <svg className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400 pointer-events-none" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
          </svg>
        </div>

        {/* Reset Button */}
        {hasActiveFilters && (
          <Button variant="secondary" onClick={onReset}>
            <X className="w-4 h-4" />
            重置
          </Button>
        )}

        <Button variant="secondary">
          <Filter className="w-4 h-4" />
          更多筛选
        </Button>
      </div>
    </div>
  );
}

export default RecruitmentFilters;
