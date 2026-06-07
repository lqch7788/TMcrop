import React, { useState } from 'react';
import { Search, RefreshCw, X, ChevronDown, ChevronUp } from 'lucide-react';
import { Input } from '@/components/ui';
import { Button } from '@/components/ui';

// 搜索栏组件接口
export interface StatSearchBarProps {
  // 筛选状态
  materialSearch: string;
  departmentFilter: string[];
  dateRange: { start: string; end: string };
  categoryFilter: string[];
  warehouseFilter: string[];
  supplierFilter: string[];
  batchCodeFilter: string[];
  productionPlanFilter: string[];
  usageAreaFilter: string[];
  requisitionerFilter: string[];
  quickFilterPeriod: string;

  // 选项数据
  departmentOptions: string[];
  categoryOptions: string[];
  warehouseOptions: string[];
  supplierOptions: string[];
  batchCodeOptions: string[];
  productionPlanOptions: string[];
  usageAreaOptions: string[];
  requisitionerOptions: string[];

  // 状态设置函数
  onMaterialSearchChange: (value: string) => void;
  onDepartmentChange: (value: string[]) => void;
  onDateRangeChange: (range: { start: string; end: string }) => void;
  onCategoryChange: (value: string[]) => void;
  onWarehouseChange: (value: string[]) => void;
  onSupplierChange: (value: string[]) => void;
  onBatchCodeChange: (value: string[]) => void;
  onProductionPlanChange: (value: string[]) => void;
  onUsageAreaChange: (value: string[]) => void;
  onRequisitionerChange: (value: string[]) => void;
  onQuickFilterChange: (period: string) => void;
  onReset: () => void;
}

// 快捷筛选选项
const quickFilterOptions = [
  { value: 'currentWeek', label: '本周' },
  { value: 'currentMonth', label: '本月' },
  { value: 'currentQuarter', label: '本季' },
  { value: 'currentYear', label: '本年' },
];

// 支持搜索的下拉输入组件
interface SearchSelectProps {
  value: string;
  options: string[];
  onChange: (value: string[]) => void;
  label: string;
  allowClear?: boolean;
}

const SearchSelect: React.FC<SearchSelectProps> = ({ value, options, onChange, label, allowClear = true }) => {
  const [inputValue, setInputValue] = useState(value);

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    if (newValue === '') {
      onChange([]);
    } else if (options.includes(newValue)) {
      onChange([newValue]);
    }
  };

  const handleClear = () => {
    setInputValue('');
    onChange([]);
  };

  // 过滤显示的选项（包含输入内容的选项）
  const filteredOptions = inputValue ? options.filter(opt => opt.toLowerCase().includes(inputValue.toLowerCase())) : options;

  return (
    <div className="relative">
      <Input
        type="text"
        value={inputValue}
        onChange={handleChange}
        list={`datalist-${label}`}
        placeholder="输入搜索"
        className="h-8 px-2 pr-7 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 w-36"
      />
      {allowClear && inputValue && (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={handleClear}
          className="absolute right-1.5 top-1/2 -translate-y-1/2 w-4 h-4 flex items-center justify-center text-gray-400 hover:text-gray-600"
        >
          <X className="w-2.5 h-2.5" />
        </Button>
      )}
      <datalist id={`datalist-${label}`}>
        {filteredOptions.map((opt) => (
          <option key={opt} value={opt} />
        ))}
      </datalist>
    </div>
  );
};

export const StatSearchBar: React.FC<StatSearchBarProps> = ({
  materialSearch,
  departmentFilter,
  dateRange,
  categoryFilter,
  warehouseFilter,
  supplierFilter,
  batchCodeFilter,
  productionPlanFilter,
  usageAreaFilter,
  requisitionerFilter,
  quickFilterPeriod,
  departmentOptions,
  categoryOptions,
  warehouseOptions,
  supplierOptions,
  batchCodeOptions,
  productionPlanOptions,
  usageAreaOptions,
  requisitionerOptions,
  onMaterialSearchChange,
  onDepartmentChange,
  onDateRangeChange,
  onCategoryChange,
  onWarehouseChange,
  onSupplierChange,
  onBatchCodeChange,
  onProductionPlanChange,
  onUsageAreaChange,
  onRequisitionerChange,
  onQuickFilterChange,
  onReset,
}) => {
  // 默认展开高级筛选
  const [showAdvanced, setShowAdvanced] = useState(true);

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-3 mb-4">
      {/* 第一行：基础筛选条件 */}
      <div className="flex items-center gap-3 flex-wrap">
        {/* 物料编码/名称搜索 */}
        <div className="flex items-center gap-1.5">
          <Search className="w-3.5 h-3.5 text-gray-400" />
          <Input
            type="text"
            value={materialSearch}
            onChange={(e) => onMaterialSearchChange(e.target.value)}
            placeholder="物料编码/名称"
            className="h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500 focus:border-emerald-500 w-32"
          />
        </div>

        {/* 部门筛选 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">部门</span>
          <SearchSelect
            value={departmentFilter[0] || ''}
            options={departmentOptions}
            onChange={onDepartmentChange}
            label="部门"
          />
        </div>

        {/* 时间范围 */}
        <div className="flex items-center gap-1.5">
          <span className="text-xs text-gray-500">时间</span>
          <Input
            type="date"
            value={dateRange.start}
            onChange={(e) => onDateRangeChange({ ...dateRange, start: e.target.value })}
            className="h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
          <span className="text-gray-300">-</span>
          <Input
            type="date"
            value={dateRange.end}
            onChange={(e) => onDateRangeChange({ ...dateRange, end: e.target.value })}
            className="h-8 px-2 border border-gray-200 rounded-lg text-xs focus:outline-none focus:ring-1 focus:ring-emerald-500"
          />
        </div>

        {/* 快捷筛选按钮 */}
        <div className="flex items-center gap-0.5 bg-gray-100 rounded-md p-0.5">
          {quickFilterOptions.map((option) => (
            <Button
              key={option.value}
              size="sm"
              variant={quickFilterPeriod === option.value ? 'default' : 'ghost'}
              onClick={() => onQuickFilterChange(option.value)}
              className={`px-2 py-1 text-xs font-medium rounded transition-all ${
                quickFilterPeriod === option.value
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'text-gray-600 hover:bg-white'
              }`}
            >
              {option.label}
            </Button>
          ))}
        </div>

        {/* 重置按钮 */}
        <Button
          variant="outline"
          size="sm"
          onClick={onReset}
          className="h-8 px-3 border border-gray-200 rounded-lg text-xs text-gray-600 hover:bg-gray-50 transition-all flex items-center gap-1"
        >
          <RefreshCw className="w-3 h-3" />
          重置
        </Button>

        {/* 高级筛选切换 */}
        <Button
          variant="ghost"
          size="sm"
          onClick={() => setShowAdvanced(!showAdvanced)}
          className="h-8 px-3 text-xs font-medium text-emerald-600 hover:bg-emerald-50 rounded-lg transition-all flex items-center gap-1"
        >
          {showAdvanced ? (
            <>
              <ChevronUp className="w-3 h-3" />
              收起
            </>
          ) : (
            <>
              <ChevronDown className="w-3 h-3" />
              高级筛选
            </>
          )}
        </Button>
      </div>

      {/* 高级筛选展开区域 */}
      {showAdvanced && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center gap-3 flex-wrap">
            {/* 分类筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">分类</span>
              <SearchSelect
                value={categoryFilter[0] || ''}
                options={categoryOptions}
                onChange={onCategoryChange}
                label="分类"
              />
            </div>

            {/* 仓库筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">仓库</span>
              <SearchSelect
                value={warehouseFilter[0] || ''}
                options={warehouseOptions}
                onChange={onWarehouseChange}
                label="仓库"
              />
            </div>

            {/* 供应商筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">供应商</span>
              <SearchSelect
                value={supplierFilter[0] || ''}
                options={supplierOptions}
                onChange={onSupplierChange}
                label="供应商"
              />
            </div>

            {/* 批次号筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">批次</span>
              <SearchSelect
                value={batchCodeFilter[0] || ''}
                options={batchCodeOptions}
                onChange={onBatchCodeChange}
                label="批次号"
              />
            </div>

            {/* 生产计划批次筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">计划批次</span>
              <SearchSelect
                value={productionPlanFilter[0] || ''}
                options={productionPlanOptions}
                onChange={onProductionPlanChange}
                label="生产计划批次"
              />
            </div>

            {/* 用途/区域筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">用途</span>
              <SearchSelect
                value={usageAreaFilter[0] || ''}
                options={usageAreaOptions}
                onChange={onUsageAreaChange}
                label="用途区域"
              />
            </div>

            {/* 领料人筛选 */}
            <div className="flex items-center gap-1.5">
              <span className="text-xs text-gray-500">领料人</span>
              <SearchSelect
                value={requisitionerFilter[0] || ''}
                options={requisitionerOptions}
                onChange={onRequisitionerChange}
                label="领料人"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StatSearchBar;
