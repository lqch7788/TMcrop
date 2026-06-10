/**
 * 订单筛选工具栏组件
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { CropOrderFilters } from '@/types/crop';
import { todayLocal } from '@/lib/dateUtils';

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
      <div className="flex items-end gap-4 flex-wrap">
        {/* 订单编号 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            订单编号
          </Label>
          <Input
            type="text"
            value={filters.orderCode}
            onChange={(e) => onChange({ ...filters, orderCode: e.target.value })}
            placeholder="请输入订单编号"
            className="border-gray-300"
          />
        </div>

        {/* 订单名称 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            订单名称
          </Label>
          <Input
            type="text"
            value={filters.orderName}
            onChange={(e) => onChange({ ...filters, orderName: e.target.value })}
            placeholder="请输入订单名称"
            className="border-gray-300"
          />
        </div>

        {/* 作物品种 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            作物品种
          </Label>
          <Select
            value={filters.cropName}
            onValueChange={(v) => onChange({ ...filters, cropName: v })}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {cropNames.map((item) => (
                <SelectItem key={item.value} value={item.value}>
                  {item.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* 订单状态 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            订单状态
          </Label>
          <Select
            value={filters.status}
            onValueChange={(v) => onChange({ ...filters, status: v })}
          >
            <SelectTrigger className="border-gray-300">
              <SelectValue placeholder="请选择" />
            </SelectTrigger>
            <SelectContent>
              {orderStatusOptions.map((opt) => (
                <SelectItem key={opt.value} value={opt.value}>
                  {opt.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* P1 修复：单日期 orderDate 改为 startDate/endDate 区间（与 OrderPage filter 逻辑对齐） */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            开始日期
          </Label>
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date) => onChange({ ...filters, startDate: todayLocal(date) })}
            className="border-gray-300"
          />
        </div>
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            结束日期
          </Label>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date) => onChange({ ...filters, endDate: todayLocal(date) })}
            className="border-gray-300"
          />
        </div>

        {/* 按钮 */}
        <div className="flex gap-2">
          <Button
            variant="warning"
            size="sm"
            onClick={onReset}
            className="whitespace-nowrap"
          >
            <RotateCcw className="w-4 h-4" />
            重置
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={onSearch}
            className="whitespace-nowrap"
          >
            <Search className="w-4 h-4" />
            搜索
          </Button>
        </div>
      </div>
    </div>
  );
}
