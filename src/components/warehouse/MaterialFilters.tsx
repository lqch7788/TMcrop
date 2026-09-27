import { useState, useMemo } from 'react';
import { RotateCcw } from 'lucide-react';

import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';

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
  /** 备注（2026-09-27 新增列：入库明细的备注可落到主数据） */
  remarks?: string;
  /** 有效批次数（来自 batch_inventory 聚合，多批次物料表格显示"共 N 批"） */
  batchCount?: number;
  /** 最早有效批次效期（FEFO 视角，临期预警；空表示无带效期的有效批次） */
  earliestExpiry?: string;
}

export interface MaterialFiltersState {
  code: string;
  name: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
}

// 2026-09-27 类型统一：分类配置结构复用 types/warehouseInbound.types 的 CategoryConfig，
// 删除本地重复定义（此前两套同名不同类型，props 声明与页面传入互不兼容）
import type { CategoryConfig } from '@/types/warehouseInbound.types';

interface MaterialFiltersProps {
  filters: MaterialFiltersState;
  onFiltersChange: (filters: MaterialFiltersState) => void;
  lowStockCount: number;
  onLowStockClick: () => void;
  // 2026-09-27 类型修复：实际传入的是"大类码 → 配置"的字典（组件内按 categoryConfig[bigCode] 取用），
  // 此前声明为单个 CategoryConfig，与实际用法不符
  categoryConfig: Record<string, CategoryConfig>;
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
      name: categoryConfig[key].name,
    }));
  };

  const getSearchMidCategories = () => {
    if (!filters.searchBigCategory) return [];
    const bigCat = categoryConfig[filters.searchBigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  const getSearchSubCategories = () => {
    if (!filters.searchBigCategory || !filters.searchMidCategory) return [];
    const bigCat = categoryConfig[filters.searchBigCategory];
    if (!bigCat) return [];
    const midCat = bigCat.categories[filters.searchMidCategory];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  const handleChange = (field: keyof MaterialFiltersState, value: string | boolean) => {
    // 2026-09-27 类型修复：按字段收窄 string/boolean，此前直接把 string|boolean 赋给 string 字段
    if (field === 'searchBigCategory') {
      onFiltersChange({ ...filters, searchBigCategory: String(value), searchMidCategory: '', searchSubCategory: '' });
    } else if (field === 'searchMidCategory') {
      onFiltersChange({ ...filters, searchMidCategory: String(value), searchSubCategory: '' });
    } else if (field === 'showLowStock') {
      onFiltersChange({ ...filters, showLowStock: Boolean(value) });
    } else {
      onFiltersChange({ ...filters, [field]: String(value) });
    }
  };

  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3">
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">物料编号</Label>
          <Input
            type="text"
            value={filters.code}
            onChange={(e) => handleChange('code', e.target.value)}
            placeholder="搜索编号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">物料名称</Label>
          <Input
            type="text"
            value={filters.name}
            onChange={(e) => handleChange('name', e.target.value)}
            placeholder="搜索名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">供应商</Label>
          <Input
            type="text"
            value={filters.supplier}
            onChange={(e) => handleChange('supplier', e.target.value)}
            placeholder="搜索供应商"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">存放位置</Label>
          <Input
            type="text"
            value={filters.location}
            onChange={(e) => handleChange('location', e.target.value)}
            placeholder="搜索位置"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">大类</Label>
          <Select value={filters.searchBigCategory} onValueChange={(val) => handleChange('searchBigCategory', val)}>
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {getSearchBigCategories().map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">中类</Label>
          <Select value={filters.searchMidCategory} onValueChange={(val) => handleChange('searchMidCategory', val)} disabled={!filters.searchBigCategory}>
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {getSearchMidCategories().map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label className="block text-sm font-medium text-gray-700 mb-1">小类</Label>
          <Select value={filters.searchSubCategory} onValueChange={(val) => handleChange('searchSubCategory', val)} disabled={!filters.searchMidCategory}>
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部</SelectItem>
              {getSearchSubCategories().map((cat) => (
                <SelectItem key={cat.code} value={cat.code}>{cat.code} - {cat.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-end gap-2">
          <Button
            size="sm"
            variant="warning"
            onClick={() => onFiltersChange({
              code: '',
              name: '',
              supplier: '',
              location: '',
              searchBigCategory: '',
              searchMidCategory: '',
              searchSubCategory: '',
              showLowStock: false,
            })}
          >
            <RotateCcw className="w-4 h-4" /> 重置
          </Button>
        </div>
      </div>
    </div>
  );
}

export function filterMaterials(materials: Material[], filters: MaterialFiltersState): Material[] {
  if (!Array.isArray(materials)) return [];
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
