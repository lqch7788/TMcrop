/**
 * 采收入库筛选工具栏组件
 */

import React from 'react';
import { Search } from 'lucide-react';

interface HarvestFilterToolbarProps {
  // 筛选状态
  searchFilters: {
    harvestCode: string;
    batchCode: string;
    greenhouseId: string;
    cropName: string;
    grade: string;
    harvesterName: string;
    warehouseId: string;
    status: string;
  };
  // 下拉选项
  greenhouses: Array<{ id: string; name: string }>;
  warehouseOptions: Array<{ value: string; label: string }>;
  // 回调
  onFiltersChange: (filters: any) => void;
  onSearch: () => void;
  onReset: () => void;
}

export function HarvestFilterToolbar({
  searchFilters,
  greenhouses,
  warehouseOptions,
  onFiltersChange,
  onSearch,
  onReset,
}: HarvestFilterToolbarProps) {
  return (
    <div className="bg-[#F2F6FA] rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-4 items-end">
        {/* 采收单号 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">采收单号</label>
          <input
            type="text"
            value={searchFilters.harvestCode}
            onChange={(e) => onFiltersChange({ ...searchFilters, harvestCode: e.target.value })}
            placeholder="请输入采收单号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 批次信息 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">批次信息</label>
          <input
            type="text"
            value={searchFilters.batchCode}
            onChange={(e) => onFiltersChange({ ...searchFilters, batchCode: e.target.value })}
            placeholder="请输入批次号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 采收区域 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">采收区域</label>
          <select
            value={searchFilters.greenhouseId}
            onChange={(e) => onFiltersChange({ ...searchFilters, greenhouseId: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {greenhouses.map(g => (
              <option key={g.id} value={g.id}>{g.name}</option>
            ))}
          </select>
        </div>

        {/* 作物名称 */}
        <div className="flex-1 min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">作物名称</label>
          <input
            type="text"
            value={searchFilters.cropName}
            onChange={(e) => onFiltersChange({ ...searchFilters, cropName: e.target.value })}
            placeholder="请输入作物名称"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 品质等级 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">品质等级</label>
          <select
            value={searchFilters.grade}
            onChange={(e) => onFiltersChange({ ...searchFilters, grade: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="A">A级</option>
            <option value="B">B级</option>
            <option value="C">C级</option>
          </select>
        </div>

        {/* 入库仓库 */}
        <div className="min-w-[150px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">入库仓库</label>
          <select
            value={searchFilters.warehouseId}
            onChange={(e) => onFiltersChange({ ...searchFilters, warehouseId: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            {warehouseOptions.map(w => (
              <option key={w.value} value={w.value}>{w.label}</option>
            ))}
          </select>
        </div>

        {/* 状态 */}
        <div className="min-w-[120px]">
          <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
          <select
            value={searchFilters.status}
            onChange={(e) => onFiltersChange({ ...searchFilters, status: e.target.value })}
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value="">全部</option>
            <option value="pending">待采收</option>
            <option value="harvesting">采收中</option>
            <option value="harvested">已采收</option>
            <option value="graded">已分级</option>
            <option value="stored">已入库</option>
          </select>
        </div>

        {/* 按钮行 - 放同一行后面 */}
        <div className="flex gap-2">
          <button
            onClick={onReset}
            className="h-10 px-4 bg-gray-200 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-300 flex items-center gap-2"
          >
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
