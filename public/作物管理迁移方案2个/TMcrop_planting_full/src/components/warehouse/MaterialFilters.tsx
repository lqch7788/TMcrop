import { useState, useMemo } from 'react';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { useNavigate } from 'react-router-dom';

export interface Material {
  id: number;
  code: string;
  name: string;
  category: string;
  specification: string;
  unit: string;
  quantity: number;
  minStock: number;
  maxStock: number;
  price: string;
  supplier: string;
  location: string;
  barcode: string;
  batchNo: string;
  productionDate: string;
  expiryDate: string;
  lastUpdateTime: string;
  dataStatus: string;
}

export interface MaterialFiltersState {
  code: string;
  name: string;
  category: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
}

interface MaterialFiltersProps {
  filters: MaterialFiltersState;
  onFiltersChange: (filters: MaterialFiltersState) => void;
  lowStockCount: number;
  onLowStockClick: () => void;
  categoryConfig: Record<string, any>;
}

const bigCategories = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

export function MaterialFilters({ 
  filters, 
  onFiltersChange, 
  lowStockCount, 
  onLowStockClick,
  categoryConfig 
}: MaterialFiltersProps) {
  const getSearchBigCategories = () => {
    return Object.keys(categoryConfig).map(key => ({
      code: key,
      name: categoryConfig[key as keyof typeof categoryConfig].name,
    }));
  };

  const getSearchMidCategories = () => {
    if (!filters.searchBigCategory) return [];
    const bigCat = categoryConfig[filters.searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]: [string, any]) => ({
      code,
      name: data.name,
    }));
  };

  const getSearchSubCategories = () => {
    if (!filters.searchBigCategory || !filters.searchMidCategory) return [];
    const bigCat = categoryConfig[filters.searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[filters.searchMidCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]: [string, any]) => ({
      code,
      name: data.name,
    }));
  };

  const handleChange = (field: keyof MaterialFiltersState, value: any) => {
    if (field === 'searchBigCategory') {
      onFiltersChange({ ...filters, searchBigCategory: value, searchMidCategory: '', searchSubCategory: '' });
    } else if (field === 'searchMidCategory') {
      onFiltersChange({ ...filters, searchMidCategory: value, searchSubCategory: '' });
    } else {
      onFiltersChange({ ...filters, [field]: value });
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">物料编号</label>
          <input
            type="text"
            value={filters.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="搜索编号"
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="搜索名称"
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
          <input
            type="text"
            value={filters.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            placeholder="搜索供应商"
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
          <input
            type="text"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="搜索位置"
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={filters.searchBigCategory}
            onChange={(e) => handleChange('searchBigCategory', e.target.value)}
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {getSearchBigCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={filters.searchMidCategory}
            onChange={(e) => handleChange('searchMidCategory', e.target.value)}
            disabled={!filters.searchBigCategory}
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchMidCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
          <select
            value={filters.searchSubCategory}
            onChange={(e) => handleChange('searchSubCategory', e.target.value)}
            disabled={!filters.searchMidCategory}
            className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchSubCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>
        <div className="flex items-end gap-2">
          <button
            onClick={() => onFiltersChange({
              code: '',
              name: '',
              category: '全部',
              supplier: '',
              location: '',
              searchBigCategory: '',
              searchMidCategory: '',
              searchSubCategory: '',
              showLowStock: false,
            })}
            className="h-9 px-4 rounded-lg text-sm font-medium bg-emerald-600 text-white hover:bg-emerald-700 border border-emerald-600 whitespace-nowrap"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
}

export function filterMaterials(materials: Material[], filters: MaterialFiltersState): Material[] {
  return materials.filter((m) => {
    if (filters.code && !m.code.includes(filters.code)) return false;
    if (filters.name && !m.name.includes(filters.name)) return false;
    if (filters.supplier && m.supplier !== filters.supplier) return false;
    if (filters.location && m.location !== filters.location) return false;
    if (filters.searchBigCategory && !m.code.startsWith(filters.searchBigCategory)) return false;
    if (filters.searchMidCategory && !m.code.slice(2, 4).startsWith(filters.searchMidCategory)) return false;
    if (filters.searchSubCategory && !m.code.slice(4, 6).startsWith(filters.searchSubCategory)) return false;
    if (filters.showLowStock && m.quantity >= m.minStock) return false;
    return true;
  });
}
