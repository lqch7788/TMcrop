import React, { useState, useRef, useEffect } from 'react';
import { Calendar, ChevronDown, X, Check } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { useDepartmentOptions } from '../../hooks/useDepartmentOptions';

export interface CostFilters {
  dateRange: {
    start: string;
    end: string;
  };
  quickPeriod: string;
  departments: string[];
  categories: string[];
  batches: string[];
  warehouses: string[];
}

// 筛选选项
// 注意：CATEGORIES 和 WAREHOUSES 仍是硬编码，如果需要动态化，后续可以从 API 获取
export const CATEGORIES = ['种质资源', '肥料与土壤改良剂', '农药与植保产品', '农业机械', '劳保与防护用品', '采收容器', '监测设备', '其他'];
export const WAREHOUSES = ['仓库A区', '仓库B区', '仓库C区', '仓库D区', '仓库E区'];

interface MultiSelectDropdownProps {
  label: string;
  options: string[];
  selected: string[];
  onChange: (value: string) => void;
  color?: 'emerald' | 'cyan';
}

const MultiSelectDropdown: React.FC<MultiSelectDropdownProps> = ({
  label,
  options,
  selected,
  onChange,
  color = 'emerald'
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const activeColor = color === 'emerald' ? 'emerald' : 'cyan';
  const activeBg = color === 'emerald' ? 'bg-emerald-500' : 'bg-cyan-500';

  return (
    <div className="relative" ref={dropdownRef}>
      <Button
        variant="ghost"
        size="sm"
        onClick={() => setIsOpen(!isOpen)}
        className={`flex items-center gap-2 px-3 py-1.5 text-sm border border-gray-200 rounded-lg hover:border-gray-400 transition-colors ${
          selected.length > 0 ? activeBg + ' text-white border-transparent' : 'bg-white text-gray-600'
        }`}
      >
        <span>{label}</span>
        {selected.length > 0 && <span className="text-xs">({selected.length})</span>}
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
      </Button>

      {isOpen && (
        <div className="absolute top-full left-0 mt-1 w-48 bg-white rounded-lg shadow-lg border border-gray-200 py-1 z-50">
          {options.map(option => (
            <Button
              key={option}
              variant="ghost"
              size="sm"
              onClick={() => onChange(option)}
              className="w-full flex items-center gap-2 px-3 py-2 text-sm text-gray-700 hover:bg-gray-50 justify-start"
            >
              <div className={`w-4 h-4 rounded border flex items-center justify-center ${
                selected.includes(option)
                  ? activeBg + ' border-transparent'
                  : 'border-gray-400'
              }`}>
                {selected.includes(option) && <Check className="w-3 h-3 text-white" />}
              </div>
              <span>{option}</span>
            </Button>
          ))}
        </div>
      )}
    </div>
  );
};

interface CostFiltersFormProps {
  filters: CostFilters;
  onChange: (filters: CostFilters) => void;
}

export const CostFiltersForm: React.FC<CostFiltersFormProps> = ({ filters, onChange }) => {
  // 从 API 获取部门选项
  const { options: departmentOptions } = useDepartmentOptions();

  // 快捷周期选项
  const quickPeriods = [
    { label: '本周', value: 'week' },
    { label: '本月', value: 'month' },
    { label: '本季', value: 'quarter' },
    { label: '本年', value: 'year' },
  ];

  // 处理快捷周期选择
  const handleQuickPeriod = (period: string) => {
    const now = new Date();
    let start = '';
    let end = '';

    switch (period) {
      case 'week': {
        const weekStart = new Date(now);
        weekStart.setDate(now.getDate() - now.getDay());
        start = weekStart.toISOString().split('T')[0];
        end = now.toISOString().split('T')[0];
        break;
      }
      case 'month':
        start = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      case 'quarter': {
        const quarterMonth = Math.floor(now.getMonth() / 3) * 3;
        start = `${now.getFullYear()}-${String(quarterMonth + 1).padStart(2, '0')}-01`;
        end = now.toISOString().split('T')[0];
        break;
      }
      case 'year':
        start = `${now.getFullYear()}-01-01`;
        end = now.toISOString().split('T')[0];
        break;
    }

    onChange({ ...filters, quickPeriod: period, dateRange: { start, end } });
  };

  // 处理日期范围变化
  const handleDateChange = (field: 'start' | 'end', value: string) => {
    onChange({
      ...filters,
      quickPeriod: 'custom',
      dateRange: { ...filters.dateRange, [field]: value },
    });
  };

  // 处理多选变化
  const handleMultiChange = (field: keyof CostFilters, value: string) => {
    const current = filters[field] as string[];
    const newValue = current.includes(value)
      ? current.filter(v => v !== value)
      : [...current, value];
    onChange({ ...filters, [field]: newValue });
  };

  // 重置筛选
  const handleReset = () => {
    const now = new Date();
    const start = `${now.getFullYear()}-01-01`;
    const end = now.toISOString().split('T')[0];
    onChange({
      quickPeriod: 'year',
      dateRange: { start, end },
      departments: [],
      categories: [],
      batches: [],
      warehouses: [],
    });
  };

  return (
    <div className="bg-white/50 rounded-xl p-4 border border-gray-100 mb-4">
      {/* 第一行：快捷周期 + 日期范围 + 下拉筛选 + 重置 */}
      <div className="flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2">
          <Calendar className="w-4 h-4 text-gray-500" />
          <span className="text-sm text-gray-600">时间：</span>
        </div>
        <div className="flex gap-1">
          {quickPeriods.map(period => (
            <Button
              key={period.value}
              size="sm"
              variant={filters.quickPeriod === period.value ? 'default' : 'ghost'}
              onClick={() => handleQuickPeriod(period.value)}
              className={`px-3 py-1.5 text-xs font-medium rounded-lg transition-colors ${
                filters.quickPeriod === period.value
                  ? 'bg-emerald-500 text-white hover:bg-emerald-600'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {period.label}
            </Button>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <Input
            id="cost-start-date"
            type="date"
            value={filters.dateRange.start}
            onChange={e => handleDateChange('start', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-400">至</span>
          <Input
            id="cost-end-date"
            type="date"
            value={filters.dateRange.end}
            onChange={e => handleDateChange('end', e.target.value)}
            className="px-2 py-1.5 text-sm border border-gray-200 rounded-lg focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 部门下拉 */}
        <MultiSelectDropdown
          label="部门"
          options={departmentOptions}
          selected={filters.departments}
          onChange={(val) => handleMultiChange('departments', val)}
          color="emerald"
        />

        {/* 分类下拉 */}
        <MultiSelectDropdown
          label="分类"
          options={CATEGORIES}
          selected={filters.categories}
          onChange={(val) => handleMultiChange('categories', val)}
          color="cyan"
        />

        {/* 重置按钮 */}
        <Button
          variant="secondary"
          size="sm"
          onClick={handleReset}
          className="ml-auto px-4 py-1.5 text-sm text-white bg-gray-400 hover:bg-gray-500 rounded-lg flex items-center gap-1 transition-colors"
        >
          <X className="w-4 h-4" />
          重置
        </Button>
      </div>
    </div>
  );
};

export default CostFiltersForm;
// logger.info('组件创建成功: CostFiltersForm');
