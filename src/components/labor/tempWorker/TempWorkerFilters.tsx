import { Search, RotateCw } from 'lucide-react';
import { Button } from '@/components/ui';
import { TempWorkerFiltersProps, WorkerType, StaffStatus } from './types';

/**
 * 临时工筛选栏组件
 */
export function TempWorkerFilters({
  filters,
  onFiltersChange,
  onSearch,
}: TempWorkerFiltersProps) {
  const workerTypes: WorkerType[] = ['正式工', '临时工', '季节工'];
  const statuses: StaffStatus[] = ['在职', '离职', '停薪留职', '试用期'];

  const handleChange = (field: keyof TempWorkerFilters, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  // 重置筛选条件
  const handleReset = () => {
    onFiltersChange({ keyword: '', workerType: '', status: '' });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-lg p-3">
      <div className="flex flex-wrap gap-3 items-end">
        {/* 关键词搜索 */}
        <div className="flex-1 min-w-[200px]">
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              value={filters.keyword}
              onChange={(e) => handleChange('keyword', e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && onSearch()}
              placeholder="搜索姓名或工号..."
              className="w-full h-10 pl-10 pr-4 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        {/* 工人类型筛选 */}
        <div className="w-[140px]">
          <select
            value={filters.workerType}
            onChange={(e) => handleChange('workerType', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部类型</option>
            {workerTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>

        {/* 状态筛选 */}
        <div className="w-[140px]">
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部状态</option>
            {statuses.map((status) => (
              <option key={status} value={status}>{status}</option>
            ))}
          </select>
        </div>

        {/* 操作按钮 */}
        <div className="flex gap-2">
          <Button size="sm" variant="outline" onClick={handleReset}>
            <RotateCw className="w-4 h-4" />
            重置
          </Button>
          <Button size="sm" variant="default" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
