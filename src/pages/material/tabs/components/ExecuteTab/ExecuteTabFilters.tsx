// ExecuteTabFilters 组件
// 领料出库页面的筛选区域组件
import { RotateCcw, Search } from 'lucide-react';
import { Button } from '@/components/ui';
import { Input } from '@/components/ui';
import { Label } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

interface ExecuteTabFiltersProps {
  // 搜索状态
  executeSearchCode: string;
  setExecuteSearchCode: (code: string) => void;
  executeSearchApplicant: string;
  setExecuteSearchApplicant: (applicant: string) => void;
  executeSearchBatchCode: string;
  setExecuteSearchBatchCode: (code: string) => void;
  executeSearchWarehouse: string;
  setExecuteSearchWarehouse: (warehouse: string) => void;
  executeStatusFilter: string;
  setExecuteStatusFilter: (status: string) => void;

  // 重置函数
  onReset: () => void;
}

/**
 * ExecuteTabFilters 组件
 * 领料出库页面的筛选区域，包含出库单号、申领人、批次号、库存地点、状态筛选
 */
export function ExecuteTabFilters({
  executeSearchCode,
  setExecuteSearchCode,
  executeSearchApplicant,
  setExecuteSearchApplicant,
  executeSearchBatchCode,
  setExecuteSearchBatchCode,
  executeSearchWarehouse,
  setExecuteSearchWarehouse,
  executeStatusFilter,
  setExecuteStatusFilter,
  onReset,
}: ExecuteTabFiltersProps) {
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <div className="flex items-end gap-4">
        {/* 出库单号 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">出库单号</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索出库单号..."
              value={executeSearchCode}
              onChange={(e) => { setExecuteSearchCode(e.target.value); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 申领人 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">申领人</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索申领人..."
              value={executeSearchApplicant}
              onChange={(e) => { setExecuteSearchApplicant(e.target.value); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 生产计划批次号 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">生产计划批次号</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
            <Input
              type="text"
              placeholder="搜索生产计划批次号..."
              value={executeSearchBatchCode}
              onChange={(e) => { setExecuteSearchBatchCode(e.target.value); }}
              className="w-full pl-9 pr-4 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent"
            />
          </div>
        </div>

        {/* 库存地点 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">库存地点</Label>
          <Select
            value={executeSearchWarehouse || 'all'}
            onValueChange={(val) => { setExecuteSearchWarehouse(val === 'all' ? '' : val); }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              <SelectItem value="仓库A区">仓库A区</SelectItem>
              <SelectItem value="仓库B区">仓库B区</SelectItem>
              <SelectItem value="仓库C区">仓库C区</SelectItem>
              <SelectItem value="仓库D区">仓库D区</SelectItem>
              <SelectItem value="仓库E区">仓库E区</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 执行状态 */}
        <div className="flex-1">
          <Label className="block text-sm font-medium text-gray-900 mb-1">执行状态</Label>
          <Select
            value={executeStatusFilter}
            onValueChange={(val) => { setExecuteStatusFilter(val); }}
          >
            <SelectTrigger className="w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500 focus:border-transparent">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部状态</SelectItem>
              <SelectItem value="待出库">待出库</SelectItem>
              <SelectItem value="部分出库">部分出库</SelectItem>
              <SelectItem value="已出库">已出库</SelectItem>
              <SelectItem value="已取消">已取消</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* 重置按钮 */}
        <Button variant="warning" size="sm" onClick={onReset}>
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
      </div>
    </div>
  );
}
