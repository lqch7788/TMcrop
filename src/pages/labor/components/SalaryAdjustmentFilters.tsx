/**
 * 调薪申请筛选器组件
 */
import { Check, Download, Plus, RefreshCw, Search, X, XCircle } from 'lucide-react';
import { Button } from '../../../components/ui/button';
import { FilterBar, FilterItem } from '../../../components/ui/FilterBar';
import { DatePicker } from '@/components/ui';
import type { SalaryAdjustmentFilters as SalaryAdjustmentFiltersType } from '../types/salaryAdjustment.types';
import { ADJUSTMENT_TYPE_OPTIONS, STATUS_OPTIONS } from '../types/salaryAdjustment.types';

export interface SalaryAdjustmentFiltersProps {
  filters: SalaryAdjustmentFiltersType;
  departmentOptions: { value: string; label: string }[];
  onFilterChange: (field: keyof SalaryAdjustmentFiltersType, value: string) => void;
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
 * 调薪申请页面筛选器组件
 */
export function SalaryAdjustmentFilters({
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
}: SalaryAdjustmentFiltersProps) {
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
          className="h-10 w-32 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {departmentOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 调整类型筛选 */}
      <FilterItem label="调整类型">
        <select
          value={filters.adjustmentType}
          onChange={(e) => onFilterChange('adjustmentType', e.target.value)}
          className="h-10 w-28 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部类型</option>
          {ADJUSTMENT_TYPE_OPTIONS.map(opt => (
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
      <FilterItem label="生效日期">
        <div className="flex items-center gap-2">
          <DatePicker
            selected={filters.startDate ? new Date(filters.startDate) : undefined}
            onChange={(date: Date) => onFilterChange('startDate', date.toISOString().slice(0, 10))}
            placeholder="开始日期"
            className="w-32"
          />
          <span className="text-gray-400">至</span>
          <DatePicker
            selected={filters.endDate ? new Date(filters.endDate) : undefined}
            onChange={(date: Date) => onFilterChange('endDate', date.toISOString().slice(0, 10))}
            placeholder="结束日期"
            className="w-32"
          />
        </div>
      </FilterItem>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {batchMode === 'none' && (
          <>
            <Button variant="default" size="sm" onClick={onAdd}>
              <Plus className="w-4 h-4" /> 新增调薪
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBatchApprove()}>
              <Check className="w-4 h-4" /> 批量通过
            </Button>
            <Button variant="outline" size="sm" onClick={() => onBatchReject()}>
              <XCircle className="w-4 h-4" /> 批量驳回
            </Button>
            <Button variant="outline" size="sm" onClick={() => onExport()}>
              <Download className="w-4 h-4" /> 导出
            </Button>
          </>
        )}

        {batchMode !== 'none' && (
          <>
            {batchMode === 'approve' && (
              <Button variant="default" size="sm" onClick={onBatchApprove} disabled={selectedCount === 0}>
                <Check className="w-4 h-4" /> 确认通过 ({selectedCount})
              </Button>
            )}
            {batchMode === 'reject' && (
              <Button variant="default" size="sm" onClick={onBatchReject} disabled={selectedCount === 0}>
                <Check className="w-4 h-4" /> 确认驳回 ({selectedCount})
              </Button>
            )}
            {batchMode === 'export' && (
              <Button variant="default" size="sm" onClick={onExport}>
                <Download className="w-4 h-4" /> 确认导出 {selectedCount > 0 ? `(${selectedCount}条)` : '(全部)'}
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={onCancelBatch}>
              <X className="w-4 h-4" /> 取消
            </Button>
          </>
        )}
      </div>
    </FilterBar>
  );
}
