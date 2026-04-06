import { Search } from 'lucide-react';
import { SupplierFiltersState } from './types';
import { supplierTypeOptions } from './data';

interface SupplierFiltersProps {
  filters: SupplierFiltersState;
  onFiltersChange: (filters: SupplierFiltersState) => void;
  onReset: () => void;
  onSearch: () => void;
}

export function SupplierFilters({
  filters,
  onFiltersChange,
  onReset,
  onSearch,
}: SupplierFiltersProps) {
  const handleChange = (field: keyof SupplierFiltersState, value: string) => {
    onFiltersChange({ ...filters, [field]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
          <input
            type="text"
            value={filters.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="请输入供应商编号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="flex-1 min-w-[180px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="请输入名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
          <input
            type="text"
            value={filters.contact}
            onChange={(e) => handleChange('contact', e.target.value)}
            placeholder="请输入联系人"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应物资类型</label>
          <select
            value={filters.type}
            onChange={(e) => handleChange('type', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="全部">全部</option>
            {supplierTypeOptions.map(opt => (
              <option key={opt.value} value={opt.value}>{opt.label}</option>
            ))}
          </select>
        </div>
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={filters.status}
            onChange={(e) => handleChange('status', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option>全部</option>
            <option>合作中</option>
            <option>暂停</option>
            <option>已淘汰</option>
          </select>
        </div>
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            重置
          </button>
          <button
            onClick={onSearch}
            className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
          >
            <Search className="w-4 h-4" />
            搜索
          </button>
        </div>
      </div>
    </div>
  );
}
