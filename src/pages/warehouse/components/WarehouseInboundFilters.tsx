/**
 * 仓库入库筛选器组件
 * 从 WarehouseInboundPage 拆分出来，处理搜索筛选功能
 */

import React from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectTrigger, SelectValue, SelectContent, SelectItem } from '@/components/ui/select';
import { InboundSearchFilters } from '../../../types/warehouseInbound.types';

interface WarehouseInboundFiltersProps {
  // 搜索条件
  searchCode: string;
  searchSupplier: string;
  searchStatus: string;
  searchMaterialName: string;
  searchMaterialCode: string;
  onSearchCodeChange: (value: string) => void;
  onSearchSupplierChange: (value: string) => void;
  onSearchStatusChange: (value: string) => void;
  onSearchMaterialNameChange: (value: string) => void;
  onSearchMaterialCodeChange: (value: string) => void;
  onReset: () => void;
}

export const WarehouseInboundFilters: React.FC<WarehouseInboundFiltersProps> = ({
  searchCode,
  searchSupplier,
  searchStatus,
  searchMaterialName,
  searchMaterialCode,
  onSearchCodeChange,
  onSearchSupplierChange,
  onSearchStatusChange,
  onSearchMaterialNameChange,
  onSearchMaterialCodeChange,
  onReset,
}) => {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex items-end gap-4">
        <div className="flex-1 grid grid-cols-5 gap-4">
          {/* 入库单号搜索 */}
          <div>
            <Label>入库单号</Label>
            <Input
              type="text"
              value={searchCode}
              onChange={(e) => onSearchCodeChange(e.target.value)}
              placeholder="搜索单号"
              className="h-10"
            />
          </div>

          {/* 供应商搜索 */}
          <div>
            <Label>供应商</Label>
            <Input
              type="text"
              value={searchSupplier}
              onChange={(e) => onSearchSupplierChange(e.target.value)}
              placeholder="搜索供应商"
              className="h-10"
            />
          </div>

          {/* 状态筛选 */}
          <div>
            <Label>状态</Label>
            <Select
              value={searchStatus || 'all'}
              onValueChange={(val) => onSearchStatusChange(val === 'all' ? '' : val)}
            >
              <SelectTrigger className="h-10">
                <SelectValue placeholder="全部" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">全部</SelectItem>
                <SelectItem value="pending">待审核</SelectItem>
                <SelectItem value="completed">已完成</SelectItem>
                <SelectItem value="voided">已作废</SelectItem>
              </SelectContent>
            </Select>
          </div>

          {/* 物料名称搜索 */}
          <div>
            <Label>物料名称</Label>
            <Input
              type="text"
              value={searchMaterialName}
              onChange={(e) => onSearchMaterialNameChange(e.target.value)}
              placeholder="搜索物料名称"
              className="h-10"
            />
          </div>

          {/* 物料编码搜索 */}
          <div>
            <Label>物料编码</Label>
            <Input
              type="text"
              value={searchMaterialCode}
              onChange={(e) => onSearchMaterialCodeChange(e.target.value)}
              placeholder="搜索物料编码"
              className="h-10"
            />
          </div>
        </div>

        {/* 重置按钮 */}
        <div className="flex gap-2">
          <Button
            size="sm"
            variant="secondary"
            onClick={onReset}
          >
            <RotateCw className="w-4 h-4" />
            重置
          </Button>
        </div>
      </div>
    </div>
  );
};

export default WarehouseInboundFilters;
