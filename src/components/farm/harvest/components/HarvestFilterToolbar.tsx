/**
 * 采收入库筛选工具栏组件
 */

import React from 'react';
import { Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui';
import { GRADE_OPTIONS } from '../../../../constants/cropConstants';

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
          <Label className="text-gray-700">采收单号</Label>
          <Input
            type="text"
            value={searchFilters.harvestCode}
            onChange={(e) => onFiltersChange({ ...searchFilters, harvestCode: e.target.value })}
            placeholder="请输入采收单号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 批次信息 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">批次信息</Label>
          <Input
            type="text"
            value={searchFilters.batchCode}
            onChange={(e) => onFiltersChange({ ...searchFilters, batchCode: e.target.value })}
            placeholder="请输入批次号"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 采收区域 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">采收区域</Label>
          <Select
            value={searchFilters.greenhouseId}
            onValueChange={(val) => onFiltersChange({ ...searchFilters, greenhouseId: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {greenhouses.map(g => (
                <SelectItem key={g.id} value={g.id}>{g.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 作物品种 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">作物品种</Label>
          <Input
            type="text"
            value={searchFilters.cropName}
            onChange={(e) => onFiltersChange({ ...searchFilters, cropName: e.target.value })}
            placeholder="请输入作物品种"
            className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 品质等级（使用共享常量 GRADE_OPTIONS） */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">品质等级</Label>
          <Select
            value={searchFilters.grade}
            onValueChange={(val) => onFiltersChange({ ...searchFilters, grade: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {GRADE_OPTIONS.map(opt => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 入库仓库 */}
        <div className="min-w-[150px]">
          <Label className="text-gray-700">入库仓库</Label>
          <Select
            value={searchFilters.warehouseId}
            onValueChange={(val) => onFiltersChange({ ...searchFilters, warehouseId: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              {warehouseOptions.map(w => (
                <SelectItem key={w.value} value={w.value}>{w.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* TODO: 状态选项含 'harvesting' 不在共享常量 HARVEST_STATUS_MAP 中，暂保留本地列表 */}
        <div className="min-w-[120px]">
          <Label className="text-gray-700">状态</Label>
          <Select
            value={searchFilters.status}
            onValueChange={(val) => onFiltersChange({ ...searchFilters, status: val })}
          >
            <SelectTrigger className="w-full h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="pending">待采收</SelectItem>
              <SelectItem value="harvesting">采收中</SelectItem>
              <SelectItem value="harvested">已采收</SelectItem>
              <SelectItem value="graded">已分级</SelectItem>
              <SelectItem value="stored">已入库</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 按钮行 - 放同一行后面 */}
        <div className="flex gap-2">
          <Button variant="secondary" size="sm" onClick={onReset}>
            重置
          </Button>
          <Button size="sm" onClick={onSearch}>
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
