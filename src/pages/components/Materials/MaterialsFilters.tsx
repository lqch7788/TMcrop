/**
 * 仓库物料筛选器组件
 * 提供物料筛选和导出功能
 */
import { Button } from '../../../components/ui/button';
import type { Material } from '../../types/materials.types';

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
  exportMode: boolean;
  selectedRows: number[];
  filteredMaterials: Material[];
  canExport: boolean;
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
  onExportClick: () => void;
  onConfirmExport: () => void;
  onCancelExport: () => void;
  onSelectAll: () => void;
}

// 大类选项
const BIG_CATEGORIES = [
  { code: 'SP', name: '生产投入类' },
  { code: 'EQ', name: '设施与装备类' },
  { code: 'OP', name: '作业支持类' },
  { code: 'PH', name: '采后处理与流通类' },
  { code: 'IT', name: '数字化与管理类' },
  { code: 'EC', name: '能源与通用耗材' },
  { code: 'OT', name: '其他类' },
];

// 简单分类选项
const SIMPLE_CATEGORIES = ['全部', '种子种苗', '肥料', '农药', '农膜'];

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
  exportMode,
  selectedRows,
  filteredMaterials,
  canExport,
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
  onExportClick,
  onConfirmExport,
  onCancelExport,
  onSelectAll,
}: MaterialsFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm space-y-4">
      {/* 导出模式 */}
      {exportMode ? (
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-4">
            <span className="text-sm text-gray-600">
              已选择 <span className="text-blue-600 font-medium">{selectedRows.length}</span> 项
            </span>
            <Button variant="ghost" onClick={onSelectAll}>
              {selectedRows.length === filteredMaterials.length ? '取消全选' : '全选'}
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <Button variant="secondary" onClick={onCancelExport}>取消</Button>
            <Button variant="blue" onClick={onConfirmExport} disabled={selectedRows.length === 0}>
              确认导出
            </Button>
          </div>
        </div>
      ) : (
        <>
          {/* 第一行：简单筛选 */}
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">物料编号:</label>
              <input
                type="text"
                value={code}
                onChange={(e) => onCodeChange(e.target.value)}
                placeholder="输入编号"
                className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">物料名称:</label>
              <input
                type="text"
                value={name}
                onChange={(e) => onNameChange(e.target.value)}
                placeholder="输入名称"
                className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">简单分类:</label>
              <select
                value={category}
                onChange={(e) => onCategoryChange(e.target.value)}
                className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm"
              >
                {SIMPLE_CATEGORIES.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">供应商:</label>
              <input
                type="text"
                value={supplier}
                onChange={(e) => onSupplierChange(e.target.value)}
                placeholder="输入供应商"
                className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm w-32"
              />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-sm text-gray-600 whitespace-nowrap">存放位置:</label>
              <input
                type="text"
                value={location}
                onChange={(e) => onLocationChange(e.target.value)}
                placeholder="输入位置"
                className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm w-24"
              />
            </div>
            <Button variant="secondary" onClick={onReset} size="sm">重置</Button>
            {canExport && (
              <Button variant="blue" onClick={onExportClick} size="sm">导出</Button>
            )}
          </div>

          {/* 第二行：三级分类筛选 */}
          <div className="flex flex-wrap items-center gap-4">
            <span className="text-sm text-gray-600">三级分类:</span>
            <select
              value={searchBigCategory}
              onChange={(e) => onSearchBigCategoryChange(e.target.value)}
              className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm"
            >
              <option value="">全部大类</option>
              {BIG_CATEGORIES.map(cat => (
                <option key={cat.code} value={cat.code}>{cat.name}</option>
              ))}
            </select>
            <select
              value={searchMidCategory}
              onChange={(e) => onSearchMidCategoryChange(e.target.value)}
              disabled={!searchBigCategory}
              className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm disabled:opacity-50"
            >
              <option value="">全部中类</option>
            </select>
            <select
              value={searchSubCategory}
              onChange={(e) => onSearchSubCategoryChange(e.target.value)}
              disabled={!searchMidCategory}
              className="px-3 py-1.5 border border-gray-400 rounded-lg text-sm disabled:opacity-50"
            >
              <option value="">全部小类</option>
            </select>
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={showLowStock}
                onChange={(e) => onShowLowStockChange(e.target.checked)}
                className="w-4 h-4 rounded border-gray-400 text-blue-600"
              />
              <span className="text-sm text-amber-600">仅显示库存不足</span>
            </label>
          </div>
        </>
      )}
    </div>
  );
}
