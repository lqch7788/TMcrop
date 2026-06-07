/**
 * 加班申请页面 - 筛选栏组件
 */
import { Search, RefreshCw, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import type { OvertimeFilters, BatchMode } from './types/overtimePage.types';
import { OVERTIME_TYPE_OPTIONS, STATUS_OPTIONS } from './types/overtimePage.types';

interface OvertimePageFiltersProps {
  filters: OvertimeFilters;
  batchMode: BatchMode;
  selectedRowKeys: React.Key[];
  onFilterChange: (field: keyof OvertimeFilters, value: string) => void;
  onResetFilters: () => void;
  onSearch: () => void;
  onOpenFormModal: () => void;
  onBatchModeChange: (mode: BatchMode) => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onExport: () => void;
  onCancelBatch: () => void;
}

export function OvertimePageFilters({
  filters,
  batchMode,
  selectedRowKeys,
  onFilterChange,
  onResetFilters,
  onSearch,
  onOpenFormModal,
  onBatchModeChange,
  onBatchApprove,
  onBatchReject,
  onExport,
  onCancelBatch,
}: OvertimePageFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {/* 员工姓名搜索 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索员工姓名"
            value={filters.staffName}
            onChange={(e) => onFilterChange('staffName', e.target.value)}
            className="h-10 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 加班类型筛选 */}
        <select
          value={filters.overtimeType}
          onChange={(e) => onFilterChange('overtimeType', e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部类型</option>
          {OVERTIME_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 状态筛选 */}
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 日期筛选 */}
        <div className="flex items-center gap-2">
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date: Date) => onFilterChange('startDate', date.toISOString().slice(0, 10))}
            placeholder="开始日期"
          />
          <span className="text-gray-400">至</span>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date: Date) => onFilterChange('endDate', date.toISOString().slice(0, 10))}
            placeholder="结束日期"
          />
        </div>

        {/* 搜索按钮 */}
        <Button variant="default" onClick={onSearch} className="gap-1">
          <Search className="w-4 h-4" />
          搜索
        </Button>

        {/* 重置按钮 */}
        <Button variant="secondary" onClick={onResetFilters} className="gap-1">
          <RefreshCw className="w-4 h-4" />
          重置
        </Button>
      </div>

      {/* 操作按钮栏 */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <Button variant="default" onClick={onOpenFormModal} className="gap-1">
          <Plus className="w-4 h-4" />
          新增加班
        </Button>

        {batchMode === 'none' && (
          <>
            <Button variant="blue" onClick={() => onBatchModeChange('approve')}>
              批量通过
            </Button>
            <Button variant="destructive" onClick={() => onBatchModeChange('reject')}>
              批量驳回
            </Button>
            <Button variant="outline" onClick={() => onBatchModeChange('export')} className="gap-1">
              <Download className="w-4 h-4" />
              导出
            </Button>
          </>
        )}

        {batchMode !== 'none' && (
          <>
            {batchMode === 'approve' && (
              <Button
                variant="blue"
                onClick={onBatchApprove}
                disabled={selectedRowKeys.length === 0}
              >
                确认通过 ({selectedRowKeys.length})
              </Button>
            )}
            {batchMode === 'reject' && (
              <Button
                variant="destructive"
                onClick={onBatchReject}
                disabled={selectedRowKeys.length === 0}
              >
                确认驳回 ({selectedRowKeys.length})
              </Button>
            )}
            {batchMode === 'export' && (
              <Button variant="outline" onClick={onExport}>
                确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
              </Button>
            )}
            <Button variant="secondary" onClick={onCancelBatch}>
              取消
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
