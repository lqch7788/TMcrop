// 供应商筛选组件
import { useMemo, useEffect } from 'react';
import { SupplierFiltersState } from './types';
import { getSupplierTypeName } from './data';
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
      <div className="flex items-end gap-4">
        <div className="flex-1 grid grid-cols-5 gap-4">
          {/* 供应商名称 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商名称</label>
            <input
              type="text"
              value={filters.name}
              onChange={(e) => onFilterChange('name', e.target.value)}
              placeholder="输入名称搜索"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 供应商类型 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商类型</label>
            <select
              value={filters.type}
              onChange={(e) => onFilterChange('type', e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              {organizationOptions.map(opt => (
                <option key={opt} value={opt}>{opt}</option>
              ))}
            </select>
          </div>
        </div>

        {/* 重置按钮 */}
        <button
          onClick={onReset}
          className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm hover:bg-gray-200 whitespace-nowrap"
        >
          重置筛选
        </button>
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
