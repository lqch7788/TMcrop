/**
 * 请假申请筛选器组件
 */
import { Button } from '../../../components/ui/button';
import { FilterBar, FilterItem } from '../../../components/ui/FilterBar';
import type { LeaveFilters as LeaveFiltersType, LeaveType } from '../../../components/labor/leave/types';
import { LEAVE_TYPE_OPTIONS, STATUS_OPTIONS } from '../hooks/useLeave';

export interface LeaveFiltersProps {
  filters: LeaveFiltersType;
  onFilterChange: (field: keyof LeaveFiltersType, value: string) => void;
  onReset: () => void;
  onSearch: () => void;
  onAdd: () => void;
  batchMode: 'none' | 'approve' | 'reject' | 'export';
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onExport: () => void;
  onCancelBatch: () => void;
  selectedCount: number;
}

/**
 * 请假申请页面筛选器组件
 */
export function LeaveFilters({
  filters,
  onFilterChange,
  onReset,
  onSearch,
  onAdd,
  batchMode,
  onBatchApprove,
  onBatchReject,
  onExport,
  onCancelBatch,
  selectedCount,
}: LeaveFiltersProps) {
  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      {/* 员工姓名搜索 */}
      <FilterItem label="员工姓名">
        <input
          type="text"
          placeholder="搜索员工姓名"
          value={filters.staffName}
          onChange={(e) => onFilterChange('staffName', e.target.value)}
          className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </FilterItem>

      {/* 请假类型筛选 */}
      <FilterItem label="请假类型">
        <select
          value={filters.leaveType}
          onChange={(e) => onFilterChange('leaveType', e.target.value)}
          className="h-9 w-24 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部类型</option>
          {LEAVE_TYPE_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 状态筛选 */}
      <FilterItem label="状态">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-9 w-24 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 日期筛选 */}
      <FilterItem label="日期范围">
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            className="h-9 w-32 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            className="h-9 w-32 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>
      </FilterItem>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {batchMode === 'none' && (
          <>
            <Button variant="default" size="sm" onClick={onAdd}>
              新增请假
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBatchApprove()}>
              批量通过
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBatchReject()}>
              批量驳回
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport()}>
              导出
            </Button>
          </>
        )}

        {batchMode !== 'none' && (
          <>
            {batchMode === 'approve' && (
              <Button variant="default" size="sm" onClick={onBatchApprove} disabled={selectedCount === 0}>
                确认通过 ({selectedCount})
              </Button>
            )}
            {batchMode === 'reject' && (
              <Button variant="default" size="sm" onClick={onBatchReject} disabled={selectedCount === 0}>
                确认驳回 ({selectedCount})
              </Button>
            )}
            {batchMode === 'export' && (
              <Button variant="default" size="sm" onClick={onExport}>
                确认导出 {selectedCount > 0 ? `(${selectedCount}条)` : '(全部)'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onCancelBatch}>
              取消
            </Button>
          </>
        )}
      </div>
    </FilterBar>
  );
}
