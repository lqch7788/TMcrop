// 供应商筛选组件
import { useMemo, useEffect } from 'react';
import { Search } from 'lucide-react';
import { SupplierFiltersState } from './types';
import { supplierCategories, getSupplierTypeName } from './data';
import { useDictionaryStore } from '../../stores';

interface SupplierFiltersProps {
  filters: SupplierFiltersState;
  onFilterChange: (key: keyof SupplierFiltersState, value: string) => void;
  onReset: () => void;
}

export default function SupplierFilters({ filters, onFilterChange, onReset }: SupplierFiltersProps) {
  // 从全局设置数据获取供应商属性字典
  const dictionaries = useDictionaryStore((state) => state.dictionaries);
  const loadDictionaries = useDictionaryStore((state) => state.loadDictionaries);

  useEffect(() => {
    if (dictionaries.length === 0) {
      loadDictionaries();
    }
  }, [dictionaries.length, loadDictionaries]);

  const attributeOptions = useMemo(() => {
    const attrs = dictionaries.filter(d => d.categoryCode === 'supplier_attribute' && d.status === 'active');
    return ['全部', ...attrs.map(a => a.dictLabel)];
  }, [dictionaries]);

  const typeOptions = ['全部', 'SP', 'FE', 'PP', 'EQ', 'FA', 'IR', 'OP', 'PH', 'TS', 'UT', 'OT'];
  const statusOptions = ['全部', '合作中', '暂停', '终止'];
  const organizationOptions = ['全部', '宁波帮帮忙公司', '成都帮帮您公司'];

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* 供应商编号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商编号</label>
          <div className="relative">
            <input
              type="text"
              value={filters.code}
              onChange={(e) => onFilterChange('code', e.target.value)}
              placeholder="输入编号搜索"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* 供应商名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
          <div className="relative">
            <input
              type="text"
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              placeholder="输入名称搜索"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* 联系人 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">联系人</label>
          <div className="relative">
            <input
              type="text"
              value={filters.contact}
              onChange={(e) => onFilterChange('contact', e.target.value)}
              placeholder="输入联系人搜索"
              className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
            <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
          </div>
        </div>

        {/* 供应商类型 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商类型</label>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {typeOptions.map(opt => (
              <option key={opt} value={opt}>
                {opt === '全部' ? '全部类型' : getSupplierTypeName(opt)}
              </option>
            ))}
          </select>
        </div>

        {/* 供应商状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商状态</label>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {statusOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 供应商属性 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商属性</label>
          <select
            value={filters.supplierAttribute}
            onChange={(e) => onFilterChange('supplierAttribute', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {attributeOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 所属组织 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">所属组织</label>
          <select
            value={filters.organization}
            onChange={(e) => onFilterChange('organization', e.target.value)}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            {organizationOptions.map(opt => (
              <option key={opt} value={opt}>{opt}</option>
            ))}
          </select>
        </div>

        {/* 重置按钮 */}
        <div className="flex items-end">
          <button
            onClick={onReset}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200"
          >
            重置筛选
          </button>
        </div>
      </div>
    </div>
  );
}

// 筛选函数
export function filterSuppliers<T extends {
  id: number;
  code: string;
  name: string;
  contact: string;
  supplierType: string;
  status: string;
  supplierAttribute: string;
  organization: string;
}>(suppliers: T[], filters: SupplierFiltersState): T[] {
  return suppliers.filter(supplier => {
    if (filters.code && !supplier.code.toLowerCase().includes(filters.code.toLowerCase())) return false;
    if (filters.name && !supplier.name.toLowerCase().includes(filters.name.toLowerCase())) return false;
    if (filters.contact && !supplier.contact.toLowerCase().includes(filters.contact.toLowerCase())) return false;
    if (filters.type !== '全部' && supplier.supplierType !== filters.type) return false;
    if (filters.status !== '全部' && supplier.status !== filters.status) return false;
    if (filters.supplierAttribute !== '全部' && supplier.supplierAttribute !== filters.supplierAttribute) return false;
    if (filters.organization !== '全部' && supplier.organization !== filters.organization) return false;
    return true;
  });
}
