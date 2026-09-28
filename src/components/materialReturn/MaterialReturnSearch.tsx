import { RotateCcw, Search } from 'lucide-react';
import { SearchForm, STATUS_OPTIONS } from './types';
import { useDepartmentOptions } from '../../hooks/useDepartmentOptions';
import { Button, DatePicker } from '@/components/ui';
import { todayLocal } from '@/lib/dateUtils';

interface MaterialReturnSearchProps {
  searchForm: SearchForm;
  onUpdateField: (field: keyof SearchForm, value: string) => void;
  onReset: () => void;
}

export function MaterialReturnSearch({
  searchForm,
  onUpdateField,
  onReset,
}: MaterialReturnSearchProps) {
  // 从 API 获取部门选项（包含"全部"选项）
  const { options: departmentOptions } = useDepartmentOptions({ includeAll: true, allText: '全部部门' });
  return (
    <div className="bg-[#F2F6FA] rounded-xl shadow-sm border border-gray-100 p-4 mb-6">
      <div className="flex flex-wrap items-end gap-4">
        {/* 退料单号 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">退料单号</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索退料单号..."
              value={searchForm.code}
              onChange={(e) => onUpdateField('code', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 物资名称 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">物资名称</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索物资名称..."
              value={searchForm.material}
              onChange={(e) => onUpdateField('material', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 申请人 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">申请人</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索申请人..."
              value={searchForm.applicant}
              onChange={(e) => onUpdateField('applicant', e.target.value)}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 审批状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">审批状态</label>
          <select
            value={searchForm.status}
            onChange={(e) => onUpdateField('status', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[120px]"
          >
            {STATUS_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>

        {/* 退料部门 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">退料部门</label>
          <select
            value={searchForm.department}
            onChange={(e) => onUpdateField('department', e.target.value)}
            className="px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent min-w-[140px]"
          >
            {departmentOptions.map((dept) => (
              <option key={dept} value={dept === '全部部门' ? 'all' : dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 2026-09-28 新增：退料日期范围筛选（从 / 到），与领料 ApplicationFilters 的日期范围口径一致 */}
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">退料日期从</label>
          <DatePicker
            selected={searchForm.dateFrom ? new Date(searchForm.dateFrom) : undefined}
            onChange={(date) => onUpdateField('dateFrom', todayLocal(date))}
            placeholder="开始日期"
            className="border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>
        <div className="flex-1 min-w-[160px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">退料日期到</label>
          <DatePicker
            selected={searchForm.dateTo ? new Date(searchForm.dateTo) : undefined}
            onChange={(date) => onUpdateField('dateTo', todayLocal(date))}
            placeholder="结束日期"
            className="border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          />
        </div>

        {/* 重置按钮（2026-09-28 改用 UI 库 Button；variant 与生产领料页 ApplicationFilters 统一为 warning） */}
        <Button variant="warning" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4" />
          重置
        </Button>
      </div>
    </div>
  );
}
