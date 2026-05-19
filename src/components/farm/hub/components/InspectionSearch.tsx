import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';

// 搜索过滤器类型
export interface InspectionSearchFilters {
  recordCode: string;
  inspectorName: string;
  inspectionType: string;
  startDate: string;
  endDate: string;
  status: string;
  // 新增：问题处理状态筛选
  problemStatus: string;
}

interface InspectionSearchProps {
  filters: InspectionSearchFilters;
  onFiltersChange: (filters: InspectionSearchFilters) => void;
  onSearch: () => void;
  onReset: () => void;
}

/**
 * 巡查反馈搜索栏组件
 * 负责搜索过滤条件的显示和交互
 */
export function InspectionSearch({
  filters,
  onFiltersChange,
  onSearch,
  onReset,
}: InspectionSearchProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 巡查编号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">巡查编号</label>
          <input
            type="text"
            value={filters.recordCode}
            onChange={(e) => onFiltersChange({ ...filters, recordCode: e.target.value })}
            placeholder="请输入巡查编号"
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 巡查类型 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">巡查类型</label>
          <select
            value={filters.inspectionType}
            onChange={(e) => onFiltersChange({ ...filters, inspectionType: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="farm">种植区域巡查</option>
            <option value="equipment">设备保养巡查</option>
            <option value="infrastructure">基础设施巡检</option>
            <option value="other">其他</option>
          </select>
        </div>

        {/* 提交人 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">提交人</label>
          <input
            type="text"
            value={filters.inspectorName}
            onChange={(e) => onFiltersChange({ ...filters, inspectorName: e.target.value })}
            placeholder="请输入提交人"
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 巡查日期(起) */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">巡查日期(起)</label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFiltersChange({ ...filters, startDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 巡查日期(止) */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">巡查日期(止)</label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFiltersChange({ ...filters, endDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={(e) => onFiltersChange({ ...filters, status: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="normal">正常</option>
            <option value="attention">需关注</option>
            <option value="critical">异常</option>
          </select>
        </div>

        {/* 问题处理状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">问题处理状态</label>
          <select
            value={filters.problemStatus}
            onChange={(e) => onFiltersChange({ ...filters, problemStatus: e.target.value })}
            className="w-full h-10 px-3 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="待处理">待处理</option>
            <option value="处理中">处理中</option>
            <option value="待验收">待验收</option>
            <option value="已处理">已处理</option>
          </select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onReset}
          >
            重置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSearch}
          >
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}

export default InspectionSearch;
