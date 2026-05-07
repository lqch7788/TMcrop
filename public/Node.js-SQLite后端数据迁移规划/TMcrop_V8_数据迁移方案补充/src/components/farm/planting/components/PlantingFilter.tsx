/**
 * 种植筛选工具栏组件
 */

import React, { useState } from 'react';
import { Search, RotateCcw, ChevronDown, ChevronUp, Plus } from 'lucide-react';
import { PlantingFilters } from '../../../../types/crop';

interface PlantingFilterProps {
  filters: PlantingFilters;
  onChange: (filters: PlantingFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  onAdd?: () => void;  // 新增回调
  cropNames: Array<{ value: string; label: string }>;
  areas: Array<{ value: string; label: string; parent?: string }>;
  statusOptions: Array<{ value: string; label: string }>;
}

export function PlantingFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  onAdd,
  cropNames,
  areas,
  statusOptions
}: PlantingFilterProps) {
  // More展开状态
  const [showMore, setShowMore] = useState(false);

  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 作物品种 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物品种</label>
          <select
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {cropNames.map(c => (
              <option key={c.value} value={c.value}>{c.label}</option>
            ))}
          </select>
        </div>

        {/* 种植批号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">种植批号</label>
          <input
            type="text"
            value={filters.plantCode}
            onChange={(e) => onChange({ ...filters, plantCode: e.target.value })}
            placeholder="请输入种植批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 来源批号（种源/育苗批号） */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">来源批号</label>
          <input
            type="text"
            value={filters.sourceCode}
            onChange={(e) => onChange({ ...filters, sourceCode: e.target.value })}
            placeholder="请输入来源批号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 种植区域/大棚位置 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">大棚位置</label>
          <select
            value={filters.areaName}
            onChange={(e) => onChange({ ...filters, areaName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {areas.map(a => (
              <option key={a.value} value={a.value}>{a.label}</option>
            ))}
          </select>
        </div>

        {/* 采收状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">采收状态</label>
          <select
            value={filters.isHarvest}
            onChange={(e) => onChange({ ...filters, isHarvest: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="false">未采收</option>
            <option value="true">已采收</option>
          </select>
        </div>

        {/* 按钮行 */}
        <div className="flex gap-2 ml-auto">
          {onAdd && (
            <button
              onClick={onAdd}
              className="h-10 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
            >
              <Plus className="w-4 h-4" />
              新增
            </button>
          )}
          <button
            onClick={() => setShowMore(!showMore)}
            className="h-10 px-4 bg-blue-500 text-white rounded-lg text-sm font-medium hover:bg-blue-600 flex items-center gap-2"
          >
            {showMore ? (
              <>
                <ChevronUp className="w-4 h-4" />
                收起
              </>
            ) : (
              <>
                <ChevronDown className="w-4 h-4" />
                More
              </>
            )}
          </button>
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

      {/* 展开的更多筛选条件 */}
      {showMore && (
        <div className="mt-4 pt-4 border-t border-gray-200">
          <div className="flex flex-wrap gap-4 items-end">
            {/* 定植日期 */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">定植日期</label>
              <input
                type="date"
                value={filters.transplantDate}
                onChange={(e) => onChange({ ...filters, transplantDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 开始日期 */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">开始日期</label>
              <input
                type="date"
                value={filters.startDate}
                onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 结束日期 */}
            <div className="min-w-[150px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">结束日期</label>
              <input
                type="date"
                value={filters.endDate}
                onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>

            {/* 记录人员 */}
            <div className="flex-1 min-w-[120px]">
              <label className="block text-sm font-medium text-gray-700 mb-1">记录人员</label>
              <input
                type="text"
                value={filters.createBy}
                onChange={(e) => onChange({ ...filters, createBy: e.target.value })}
                placeholder="请输入记录人员"
                className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
