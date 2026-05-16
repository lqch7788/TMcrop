/**
 * 施肥管理筛选工具栏组件
 * 筛选字段：肥料名称、肥料类型(字典)、作物品种、温室位置、数据来源、日期范围、操作员
 */
import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { DictSelect } from '../../common/settings/DictSelect';

interface FertilizerFilterProps {
  filters: Record<string, string>;
  onChange: (filters: Record<string, string>) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function FertilizerFilter({
  filters,
  onChange,
  onSearch,
  onReset,
}: FertilizerFilterProps) {
  const updateFilter = (key: string, value: string) => {
    onChange({ ...filters, [key]: value });
  };

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 肥料名称 */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">肥料名称</label>
          <input
            type="text"
            value={filters.fertilizerName || ''}
            onChange={(e) => updateFilter('fertilizerName', e.target.value)}
            placeholder="请输入肥料名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 肥料类型（字典选择） */}
        <div className="min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">肥料类型</label>
          <DictSelect
            category="fertilizer_type"
            value={filters.fertilizerType || ''}
            onChange={(value) => updateFilter('fertilizerType', value)}
            placeholder="全部"
          />
        </div>

        {/* 作物品种 */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
          <input
            type="text"
            value={filters.cropName || ''}
            onChange={(e) => updateFilter('cropName', e.target.value)}
            placeholder="请输入作物品种"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 温室位置 */}
        <div className="flex-1 min-w-[140px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">温室位置</label>
          <input
            type="text"
            value={filters.greenhouseName || ''}
            onChange={(e) => updateFilter('greenhouseName', e.target.value)}
            placeholder="请输入温室位置"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 数据来源 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">数据来源</label>
          <select
            value={filters.dataSource || ''}
            onChange={(e) => updateFilter('dataSource', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="manual">手动</option>
            <option value="auto_iot">IoT自动</option>
          </select>
        </div>

        {/* 日期范围 - 开始 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
          <input
            type="date"
            value={filters.startDate || ''}
            onChange={(e) => updateFilter('startDate', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 日期范围 - 结束 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
          <input
            type="date"
            value={filters.endDate || ''}
            onChange={(e) => updateFilter('endDate', e.target.value)}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 操作员 */}
        <div className="flex-1 min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">操作员</label>
          <input
            type="text"
            value={filters.operatorName || ''}
            onChange={(e) => updateFilter('operatorName', e.target.value)}
            placeholder="请输入操作员"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="h-10 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2"
          >
            <RotateCcw className="w-4 h-4" />
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
