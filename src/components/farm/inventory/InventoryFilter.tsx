/**
 * 库存筛选工具栏
 * 样式与 OrderFilter 保持一致（rounded-xl p-4 shadow-sm）
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import {
  StockType,
} from '../../../types/inventory';
// 2026-10-10：状态/来源筛选项改为常量驱动（与真实数据对齐，含历史别名匹配集合）
import {
  INVENTORY_STATUS_FILTER_OPTIONS,
  INVENTORY_SOURCE_FILTER_OPTIONS,
} from '../../../constants/cropConstants';

export interface InventoryFilterState {
  stockType: StockType | '';
  // 2026-10-10：放宽为 string——状态/来源含枚举外的真实值（frozen_partial/pending 等）
  status: string;
  sourceType: string;
  keyword: string;
}

interface InventoryFilterProps {
  filters: InventoryFilterState;
  onChange: (filters: InventoryFilterState) => void;
  // 2026-07-14：搜索栏后按钮由"刷新"改为"重置"（与种植管理页面 UI 一致）
  onReset: () => void;
}

export function InventoryFilter({ filters, onChange, onReset }: InventoryFilterProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm border border-gray-100">
      <div className="flex items-end gap-4 flex-wrap">
        {/* 关键词搜索 */}
        <div className="flex-1 min-w-[200px]">
          <Label className="text-gray-700">关键词搜索</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              value={filters.keyword}
              onChange={(e) => onChange({ ...filters, keyword: e.target.value })}
              placeholder="搜索实例ID、作物名称、品种..."
              className="pl-10 border-gray-300"
            />
          </div>
        </div>

        {/* 库存类型 */}
        <div className="w-40">
          <Label className="text-gray-700">库存类型</Label>
          <Select
            value={filters.stockType}
            onValueChange={(val) => onChange({ ...filters, stockType: val as StockType | '' })}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部类型</SelectItem>
              <SelectItem value={StockType.SEED}>种源</SelectItem>
              <SelectItem value={StockType.SEEDLING}>种苗</SelectItem>
              <SelectItem value={StockType.PRODUCT}>成品</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 状态（2026-10-10：选项来自常量，覆盖全部真实状态） */}
        <div className="w-40">
          <Label className="text-gray-700">状态</Label>
          <Select
            value={filters.status}
            onValueChange={(val) => onChange({ ...filters, status: val })}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部状态</SelectItem>
              {INVENTORY_STATUS_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 来源（2026-10-10：选项来自常量，覆盖全部真实来源） */}
        <div className="w-40">
          <Label className="text-gray-700">来源</Label>
          <Select
            value={filters.sourceType}
            onValueChange={(val) => onChange({ ...filters, sourceType: val })}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="全部来源" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="">全部来源</SelectItem>
              {INVENTORY_SOURCE_FILTER_OPTIONS.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>{opt.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 重置按钮（与种植管理 PlantingFilter 重置按钮 UI 完全一致） */}
        <Button
          variant="warning"
          onClick={onReset}
          size="sm"
          className="shrink-0"
        >
          <RotateCcw className="w-4 h-4" />
          重置
        </Button>
      </div>
    </div>
  );
}
