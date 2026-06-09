import { RotateCcw, Search } from 'lucide-react';
import { Button, Label, DatePicker } from '@/components/ui';
import { Input } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

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
          <Label className="text-gray-700 mb-1">巡查编号</Label>
          <Input
            type="text"
            value={filters.recordCode}
            onChange={(e) => onFiltersChange({ ...filters, recordCode: e.target.value })}
            placeholder="请输入巡查编号"
            className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 巡查类型 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700 mb-1">巡查类型</Label>
          <Select
            value={filters.inspectionType}
            onValueChange={(val) => onFiltersChange({ ...filters, inspectionType: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="farm">种植区域巡查</SelectItem>
              <SelectItem value="equipment">设备保养巡查</SelectItem>
              <SelectItem value="infrastructure">基础设施巡检</SelectItem>
              <SelectItem value="other">其他</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 提交人 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700 mb-1">提交人</Label>
          <Input
            type="text"
            value={filters.inspectorName}
            onChange={(e) => onFiltersChange({ ...filters, inspectorName: e.target.value })}
            placeholder="请输入提交人"
            className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 巡查日期(起) */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700 mb-1">巡查日期(起)</Label>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date) => onFiltersChange({ ...filters, startDate: date.toISOString().split('T')[0] })}
            placeholder="选择日期"
          />
        </div>

        {/* 巡查日期(止) */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700 mb-1">巡查日期(止)</Label>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date) => onFiltersChange({ ...filters, endDate: date.toISOString().split('T')[0] })}
            placeholder="选择日期"
          />
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700 mb-1">状态</Label>
          <Select
            value={filters.status}
            onValueChange={(val) => onFiltersChange({ ...filters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="normal">正常</SelectItem>
              <SelectItem value="attention">需关注</SelectItem>
              <SelectItem value="critical">异常</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 问题处理状态 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700 mb-1">问题处理状态</Label>
          <Select
            value={filters.problemStatus}
            onValueChange={(val) => onFiltersChange({ ...filters, problemStatus: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-400 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="待处理">待处理</SelectItem>
              <SelectItem value="处理中">处理中</SelectItem>
              <SelectItem value="待验收">待验收</SelectItem>
              <SelectItem value="已处理">已处理</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <Button
            variant="default"
            size="sm"
            onClick={onReset}
          >
            <RotateCcw className="w-4 h-4" /> 重置
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
