/**
 * 订单筛选工具栏组件
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { CropOrderFilters } from '@/types/crop';

interface OrderFilterProps {
  filters: CropOrderFilters;
  onChange: (filters: CropOrderFilters) => void;
  onSearch: () => void;
  onReset: () => void;
  orderStatusOptions: { value: string; label: string }[];
  cropNames: { value: string; label: string }[];
}

export function OrderFilter({
  filters,
  onChange,
  onSearch,
  onReset,
  orderStatusOptions,
  cropNames,
}: OrderFilterProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="grid grid-cols-7 gap-4">
        {/* 订单编号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            订单编号
          </label>
          <input
            type="text"
            value={filters.orderCode}
            onChange={(e) => onChange({ ...filters, orderCode: e.target.value })}
            placeholder="请输入订单编号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 订单名称 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            订单名称
          </label>
          <input
            type="text"
            value={filters.orderName}
            onChange={(e) => onChange({ ...filters, orderName: e.target.value })}
            placeholder="请输入订单名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 作物品种 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            作物品种
          </label>
          <select
            value={filters.cropName}
            onChange={(e) => onChange({ ...filters, cropName: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {cropNames.map((item) => (
              <option key={item.value} value={item.value}>
                {item.label}
              </option>
            ))}
          </select>
        </div>

        {/* 订单状态 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            订单状态
          </label>
          <select
            value={filters.status}
            onChange={(e) => onChange({ ...filters, status: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">请选择</option>
            {orderStatusOptions.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>

        {/* 开始日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            开始日期
          </label>
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onChange({ ...filters, startDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 结束日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            结束日期
          </label>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onChange({ ...filters, endDate: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 记录人员 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            记录人员
          </label>
          <input
            type="text"
            value={filters.createBy}
            onChange={(e) => onChange({ ...filters, createBy: e.target.value })}
            placeholder="请输入记录人员"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </div>

      {/* 搜索和重置按钮 */}
      <div className="flex justify-end gap-2 mt-4">
        <button
          onClick={onReset}
          className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-2"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </button>
        <button
          onClick={onSearch}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-2"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>
      </div>
    </div>
  );
}
