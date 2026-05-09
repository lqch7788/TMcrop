/**
 * 仓库入库筛选器组件
 * 从 WarehouseInboundPage 拆分出来，处理搜索筛选功能
 */

import React from 'react';
import { RotateCw } from 'lucide-react';
import { Button } from '@/components/ui/button';
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
            <label className="block text-sm font-medium text-gray-700 mb-1">入库单号</label>
            <input
              type="text"
              value={searchCode}
              onChange={(e) => onSearchCodeChange(e.target.value)}
              placeholder="搜索单号"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 供应商搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">供应商</label>
            <input
              type="text"
              value={searchSupplier}
              onChange={(e) => onSearchSupplierChange(e.target.value)}
              placeholder="搜索供应商"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 状态筛选 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">状态</label>
            <select
              value={searchStatus}
              onChange={(e) => onSearchStatusChange(e.target.value)}
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value="">全部</option>
              <option value="pending">待审核</option>
              <option value="completed">已完成</option>
              <option value="voided">已作废</option>
            </select>
          </div>

          {/* 物料名称搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物料名称</label>
            <input
              type="text"
              value={searchMaterialName}
              onChange={(e) => onSearchMaterialNameChange(e.target.value)}
              placeholder="搜索物料名称"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* 物料编码搜索 */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">物料编码</label>
            <input
              type="text"
              value={searchMaterialCode}
              onChange={(e) => onSearchMaterialCodeChange(e.target.value)}
              placeholder="搜索物料编码"
              className="w-full h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
