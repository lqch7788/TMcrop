/**
 * 订单筛选工具栏组件
 */

import React from 'react';
import { Search, RotateCcw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { DatePicker } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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
            className="border-gray-200"
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
            className="border-gray-200"
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
            <SelectTrigger className="border-gray-200">
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
            <SelectTrigger className="border-gray-200">
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

        {/* 订单日期 */}
        <div className="flex-1 min-w-[150px]">
          <Label className="text-gray-700">
            订单日期
          </Label>
          <DatePicker
            selected={filters.orderDate ? new Date(filters.orderDate) : undefined}
            onChange={(date) => onChange({ ...filters, orderDate: date.toISOString().split('T')[0] })}
            className="border-gray-200"
          />
        </div>

        {/* 按钮 */}
        <div className="flex gap-2">
          <Button
            variant="secondary"
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
