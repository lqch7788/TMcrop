/**
 * 合同续签筛选器组件
 */
import { Search, RefreshCw, Plus, Download } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { FilterBar, FilterItem } from '../../../components/ui/FilterBar';
import { DatePicker } from '@/components/ui';
import type { ContractRenewalFilters as ContractRenewalFiltersType } from '../types/contractRenewal.types';
import { STATUS_OPTIONS } from '../types/contractRenewal.types';

export interface ContractRenewalFiltersProps {
  filters: ContractRenewalFiltersType;
  departmentOptions: { value: string; label: string }[];
  onFilterChange: (field: keyof ContractRenewalFiltersType, value: string) => void;
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
 * 合同续签页面筛选器组件
 */
export function ContractRenewalFilters({
  filters,
  departmentOptions,
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
}: ContractRenewalFiltersProps) {
  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      {/* 员工姓名搜索 */}
      <FilterItem label="员工姓名">
        <input
          type="text"
          placeholder="搜索员工姓名"
          value={filters.employeeName}
          onChange={(e) => onFilterChange('employeeName', e.target.value)}
          className="h-10 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </FilterItem>

      {/* 部门筛选 */}
      <FilterItem label="部门">
        <select
          value={filters.department}
          onChange={(e) => onFilterChange('department', e.target.value)}
          className="h-10 w-28 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {departmentOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 状态筛选 */}
      <FilterItem label="状态">
        <select
          value={filters.status}
          onChange={(e) => onFilterChange('status', e.target.value)}
          className="h-10 w-24 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 日期范围 */}
      <FilterItem label="合同到期">
        <DatePicker
          selected={filters.startDate ? new Date(filters.startDate) : undefined}
          onChange={(date: Date) => onFilterChange('startDate', date.toISOString().slice(0, 10))}
          placeholder="开始日期"
          className="w-32"
        />
        <span className="mx-1 text-gray-400">至</span>
        <DatePicker
          selected={filters.endDate ? new Date(filters.endDate) : undefined}
          onChange={(date: Date) => onFilterChange('endDate', date.toISOString().slice(0, 10))}
          placeholder="结束日期"
          className="w-32"
        />
      </FilterItem>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {batchMode === 'none' && (
          <>
            <Button variant="default" size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4 mr-1" />
              新增续签
            </Button>
            <Button variant="outline" size="sm" onClick={onBatchApprove}>
              批量通过
            </Button>
            <Button variant="outline" size="sm" onClick={onBatchReject}>
              批量驳回
            </Button>
            <Button variant="outline" size="sm" onClick={onExport}>
              <Download className="w-4 h-4 mr-1" />
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
