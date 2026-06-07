/**
 * 考勤补录页面 - 筛选栏组件
 */
import { Search, RefreshCw, Plus, Download } from 'lucide-react';
import { Button } from '@/components/ui';
import { DatePicker } from '@/components/ui';
import type { AttendanceRepairFilters, BatchMode } from './types/attendanceRepairPage.types';
import { REPAIR_REASON_OPTIONS, STATUS_OPTIONS } from './types/attendanceRepairPage.types';

interface AttendanceRepairPageFiltersProps {
  filters: AttendanceRepairFilters;
  departmentOptions: { value: string; label: string }[];
  batchMode: BatchMode;
  selectedRowKeys: React.Key[];
  onFilterChange: (field: keyof AttendanceRepairFilters, value: string) => void;
  onResetFilters: () => void;
  onSearch: () => void;
  onOpenFormModal: () => void;
  onBatchModeChange: (mode: BatchMode) => void;
  onBatchApprove: () => void;
  onBatchReject: () => void;
  onExport: () => void;
  onCancelBatch: () => void;
}

export function AttendanceRepairPageFilters({
  filters,
  departmentOptions,
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
}: AttendanceRepairPageFiltersProps) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-sm">
      <div className="flex flex-wrap gap-3">
        {/* 员工姓名搜索 */}
        <div className="flex items-center gap-2">
          <input
            type="text"
            placeholder="搜索员工姓名"
            value={filters.employeeName}
            onChange={(e) => onFilterChange('employeeName', e.target.value)}
            className="h-10 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 部门筛选 */}
        <select
          value={filters.department}
          onChange={(e) => onFilterChange('department', e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {departmentOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 补录原因筛选 */}
        <select
          value={filters.reason}
          onChange={(e) => onFilterChange('reason', e.target.value)}
          className="h-10 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部原因</option>
          {REPAIR_REASON_OPTIONS.map(opt => (
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

        {/* 日期范围 */}
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
        <Button onClick={onSearch} variant="default" size="default">
          <Search className="w-4 h-4" />
          搜索
        </Button>

        {/* 重置按钮 */}
        <Button onClick={onResetFilters} variant="secondary" size="default">
          <RefreshCw className="w-4 h-4" />
          重置
        </Button>
      </div>

      {/* 操作按钮栏 */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <Button
          onClick={onOpenFormModal}
          variant="default"
          size="default"
        >
          <Plus className="w-4 h-4" />
          新增补录
        </Button>

        {batchMode === 'none' && (
          <>
            <Button
              onClick={() => onBatchModeChange('approve')}
              variant="blue"
              size="default"
            >
              批量通过
            </Button>
            <Button
              onClick={() => onBatchModeChange('reject')}
              variant="destructive"
              size="default"
            >
              批量驳回
            </Button>
            <Button
              onClick={() => onBatchModeChange('export')}
              variant="default"
              size="default"
            >
              <Download className="w-4 h-4" />
              导出
            </Button>
          </>
        )}

        {batchMode !== 'none' && (
          <>
            {batchMode === 'approve' && (
              <Button
                onClick={onBatchApprove}
                disabled={selectedRowKeys.length === 0}
                variant="blue"
                size="default"
              >
                确认通过 ({selectedRowKeys.length})
              </Button>
            )}
            {batchMode === 'reject' && (
              <Button
                onClick={onBatchReject}
                disabled={selectedRowKeys.length === 0}
                variant="destructive"
                size="default"
              >
                确认驳回 ({selectedRowKeys.length})
              </Button>
            )}
            {batchMode === 'export' && (
              <Button
                onClick={onExport}
                variant="default"
                size="default"
              >
                确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
              </Button>
            )}
            <Button
              onClick={onCancelBatch}
              variant="secondary"
              size="default"
            >
              取消
            </Button>
          </>
        )}
      </div>
    </div>
  );
}
