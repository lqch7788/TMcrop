// 物料管理筛选器组件
import { categoryConfig } from './mockData';

interface MaterialsFiltersProps {
  code: string;
  name: string;
  category: string;
  supplier: string;
  location: string;
  searchBigCategory: string;
  searchMidCategory: string;
  searchSubCategory: string;
  showLowStock: boolean;
  warehouseMaterials: Array<{
    id: number;
    code: string;
    name: string;
    category: string;
    unit: string;
    quantity: number;
    minStock: number;
    price: string;
    supplier: string;
    location: string;
  }>;
  onCodeChange: (value: string) => void;
  onNameChange: (value: string) => void;
  onCategoryChange: (value: string) => void;
  onSupplierChange: (value: string) => void;
  onLocationChange: (value: string) => void;
  onSearchBigCategoryChange: (value: string) => void;
  onSearchMidCategoryChange: (value: string) => void;
  onSearchSubCategoryChange: (value: string) => void;
  onShowLowStockChange: (value: boolean) => void;
  onReset: () => void;
}

export default function MaterialsFilters({
  code,
  name,
  category,
  supplier,
  location,
  searchBigCategory,
  searchMidCategory,
  searchSubCategory,
  showLowStock,
  warehouseMaterials,
  onCodeChange,
  onNameChange,
  onCategoryChange,
  onSupplierChange,
  onLocationChange,
  onSearchBigCategoryChange,
  onSearchMidCategoryChange,
  onSearchSubCategoryChange,
  onShowLowStockChange,
  onReset,
}: MaterialsFiltersProps) {
  // 获取搜索用大类选项
  const getSearchBigCategories = () => {
    return Object.keys(categoryConfig).map((key) => ({
      code: key,
      name: categoryConfig[key as keyof typeof categoryConfig].name,
    }));
  };

  // 获取搜索用中类选项
  const getSearchMidCategories = () => {
    if (!searchBigCategory) return [];
    const bigCat = categoryConfig[searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    return Object.entries(bigCat.categories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  // 获取搜索用小类选项
  const getSearchSubCategories = () => {
    if (!searchBigCategory || !searchMidCategory) return [];
    const bigCat = categoryConfig[searchBigCategory as keyof typeof categoryConfig];
    if (!bigCat) return [];
    const midCat = bigCat.categories[searchMidCategory as keyof typeof bigCat.categories];
    if (!midCat) return [];
    return Object.entries(midCat.subCategories).map(([code, data]) => ({
      code,
      name: data.name,
    }));
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="grid grid-cols-8 gap-4">
        {/* 物料编号 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">物料编号</label>
          <input
            type="text"
            value={code}
            onChange={(e) => onCodeChange(e.target.value)}
            placeholder="请输入"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 物料名称 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
          <input
            type="text"
            value={name}
            onChange={(e) => onNameChange(e.target.value)}
            placeholder="请输入"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 供应商 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
          <select
            value={supplier}
            onChange={(e) => onSupplierChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {warehouseMaterials
              .map((m) => m.supplier)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
          </select>
        </div>

        {/* 存放位置 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">存放位置</label>
          <select
            value={location}
            onChange={(e) => onLocationChange(e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {warehouseMaterials
              .map((m) => m.location)
              .filter((v, i, a) => a.indexOf(v) === i)
              .map((l) => (
                <option key={l} value={l}>
                  {l}
                </option>
              ))}
          </select>
        </div>

        {/* 大类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">大类</label>
          <select
            value={searchBigCategory}
            onChange={(e) => {
              onSearchBigCategoryChange(e.target.value);
              onSearchMidCategoryChange('');
              onSearchSubCategoryChange('');
            }}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {getSearchBigCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code} - {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 中类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">中类</label>
          <select
            value={searchMidCategory}
            onChange={(e) => {
              onSearchMidCategoryChange(e.target.value);
              onSearchSubCategoryChange('');
            }}
            disabled={!searchBigCategory}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchMidCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code} - {cat.name}
              </option>
            ))}
          </select>
        </div>

        {/* 小类 */}
        <div className="col-span-1">
          <label className="block text-sm font-medium text-gray-700 mb-1">小类</label>
          <select
            value={searchSubCategory}
            onChange={(e) => onSearchSubCategoryChange(e.target.value)}
            disabled={!searchMidCategory}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500 disabled:bg-gray-100"
          >
            <option value="">全部</option>
            {getSearchSubCategories().map((cat) => (
              <option key={cat.code} value={cat.code}>
                {cat.code} - {cat.name}
              </option>
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
