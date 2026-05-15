// ApplicationFilters 组件
// 领料申请单的搜索筛选区域
import { Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { UseApplicationTabReturn } from '../hooks/useApplicationTab';

interface ApplicationFiltersProps {
  // 搜索状态
  searchCode: string;
  setSearchCode: (value: string) => void;
  searchApplicant: string;
  setSearchApplicant: (value: string) => void;
  searchBatchCode: string;
  setSearchBatchCode: (value: string) => void;
  searchWarehouse: string;
  setSearchWarehouse: (value: string) => void;
  statusFilter: string;
  setStatusFilter: (value: string) => void;
  // 操作
  onReset: () => void;
  onPageChange: (page: number) => void;
}

/**
 * ApplicationFilters 组件 - 领料申请单筛选器
 */
export function ApplicationFilters({
  searchCode,
  setSearchCode,
  searchApplicant,
  setSearchApplicant,
  searchBatchCode,
  setSearchBatchCode,
  searchWarehouse,
  setSearchWarehouse,
  statusFilter,
  setStatusFilter,
  onReset,
  onPageChange,
}: ApplicationFiltersProps) {
  return (
    /* 搜索区域 */
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-end gap-4">
        {/* 领料单号搜索 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">领料单号</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索领料单号..."
              value={searchCode}
              onChange={(e) => { setSearchCode(e.target.value); onPageChange(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 申领人搜索 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">申领人</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索申领人..."
              value={searchApplicant}
              onChange={(e) => { setSearchApplicant(e.target.value); onPageChange(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 生产计划批次号搜索 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <input
              type="text"
              placeholder="搜索生产计划批次号..."
              value={searchBatchCode}
              onChange={(e) => { setSearchBatchCode(e.target.value); onPageChange(1); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 库存地点筛选 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">库存地点</label>
          <select
            value={searchWarehouse}
            onChange={(e) => { setSearchWarehouse(e.target.value); onPageChange(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="">全部</option>
            <option value="仓库A区">仓库A区</option>
            <option value="仓库B区">仓库B区</option>
            <option value="仓库C区">仓库C区</option>
            <option value="仓库D区">仓库D区</option>
            <option value="仓库E区">仓库E区</option>
          </select>
        </div>

        {/* 审批状态筛选 */}
        <div className="flex-1">
          <label className="block text-sm font-medium text-gray-900 mb-1">审批状态</label>
          <select
            value={statusFilter}
            onChange={(e) => { setStatusFilter(e.target.value); onPageChange(1); }}
            className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
          >
            <option value="all">全部状态</option>
            <option value="待审批">待审批</option>
            <option value="已审批">已审批</option>
            <option value="已拒绝">已拒绝</option>
            <option value="已作废">已作废</option>
            <option value="已取消">已取消</option>
          </select>
        </div>

        {/* 重置按钮 */}
        <Button variant="secondary" size="sm" onClick={onReset}>
          重置
        </Button>
      </div>
    </div>
  );
}
