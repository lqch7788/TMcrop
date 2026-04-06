// 仓库物料筛选器组件

import { WarehouseMaterial, FilterState, CategoryConfig } from './types';

interface WarehouseMaterialsFiltersProps {
  filters: FilterState;
  categoryConfig: CategoryConfig;
  materials: WarehouseMaterial[];
  onFilterChange: (filters: FilterState) => void;
  onReset: () => void;
}

export default function WarehouseMaterialsFilters({
  filters,
  categoryConfig,
  materials,
  onFilterChange,
  onReset,
}: WarehouseMaterialsFiltersProps) {
  // 获取大类选项
  const getSearchBigCategories = () => {
    return Object.keys(categoryConfig).map(key => ({
      code: key,
      name: categoryConfig[key].name,
    }));
  };

  // 获取中类选项
  const getSearchMidCategories = () => {
    if (!filters.searchBigCategory) return [];
    const bigCat = categoryConfig[filters.searchBigCategory];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取小类选项
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

  // 获取唯一供应商列表
  const uniqueSuppliers = Array.from(new Set(materials.map(m => m.supplier)));

  // 获取唯一位置列表
  const uniqueLocations = Array.from(new Set(materials.map(m => m.location)));

  const handleBigCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      searchBigCategory: value,
      searchMidCategory: '',
      searchSubCategory: '',
    });
  };

  const handleMidCategoryChange = (value: string) => {
    onFilterChange({
      ...filters,
      searchMidCategory: value,
      searchSubCategory: '',
    });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-8 gap-4">
        {/* 物料编号 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">物料编号</label>
          <input
            type="text"
            value={filters.code}
            onChange={(e) => onFilterChange({ ...filters, code: e.target.value })}
            placeholder="请输入"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 物料名称 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
          <input
            type="text"
            value={filters.name}
            onChange={(e) => onFilterChange({ ...filters, name: e.target.value })}
            placeholder="请输入"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 供应商 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
          <select
            value={filters.supplier}
            onChange={(e) => onFilterChange({ ...filters, supplier: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {uniqueSuppliers.map(s => (
              <option key={s} value={s}>{s}</option>
            ))}
          </select>
        </div>

        {/* 存放位置 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
          <select
            value={filters.location}
            onChange={(e) => onFilterChange({ ...filters, location: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {uniqueLocations.map(l => (
              <option key={l} value={l}>{l}</option>
            ))}
          </select>
        </div>

        {/* 大类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={filters.searchBigCategory}
            onChange={(e) => handleBigCategoryChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {getSearchBigCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 中类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={filters.searchMidCategory}
            onChange={(e) => handleMidCategoryChange(e.target.value)}
            disabled={!filters.searchBigCategory}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchMidCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 小类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
          <select
            value={filters.searchSubCategory}
            onChange={(e) => onFilterChange({ ...filters, searchSubCategory: e.target.value })}
            disabled={!filters.searchMidCategory}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchSubCategories().map(cat => (
              <option key={cat.code} value={cat.code}>{cat.code} - {cat.name}</option>
            ))}
          </select>
        </div>

        {/* 重置按钮 */}
        <div className="col-span-1 flex items-end">
          <button
            onClick={onReset}
            className="w-full h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center justify-center gap-2"
          >
            重置
          </button>
        </div>
      </div>
    </div>
  );
}
