import { Search } from 'lucide-react';
import { SearchForm, STATUS_OPTIONS } from './types';
import { DEPARTMENTS } from './config';

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

        {/* 仓库位置 */}
        <div className="flex-1 min-w-[200px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">仓库位置</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索仓库位置..."
              value={searchForm.warehouse}
              onChange={(e) => onUpdateField('warehouse', e.target.value)}
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
            {DEPARTMENTS.map((dept) => (
              <option key={dept} value={dept === '全部部门' ? 'all' : dept}>{dept}</option>
            ))}
          </select>
        </div>

        {/* 重置按钮 */}
        <button
          onClick={onReset}
          className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 hover:bg-gray-100 rounded-lg"
        >
          重置
        </button>
      </div>
    </div>
  );
}
