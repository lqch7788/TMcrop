/**
 * 考勤补录页面 - 筛选栏组件
 */
import { Search, RefreshCw, Plus, Download } from 'lucide-react';
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
            className="h-9 w-40 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 部门筛选 */}
        <select
          value={filters.department}
          onChange={(e) => onFilterChange('department', e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {departmentOptions.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 补录原因筛选 */}
        <select
          value={filters.reason}
          onChange={(e) => onFilterChange('reason', e.target.value)}
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
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
          className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          {STATUS_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>

        {/* 日期范围 */}
        <div className="flex items-center gap-2">
          <input
            type="date"
            value={filters.startDate}
            onChange={(e) => onFilterChange('startDate', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <span className="text-gray-400">至</span>
          <input
            type="date"
            value={filters.endDate}
            onChange={(e) => onFilterChange('endDate', e.target.value)}
            className="h-9 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
        </div>

        {/* 搜索按钮 */}
        <button
          onClick={onSearch}
          className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
        >
          <Search className="w-4 h-4" />
          搜索
        </button>

        {/* 重置按钮 */}
        <button
          onClick={onResetFilters}
          className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 flex items-center gap-1"
        >
          <RefreshCw className="w-4 h-4" />
          重置
        </button>
      </div>

      {/* 操作按钮栏 */}
      <div className="flex items-center gap-2 mt-4 pt-4 border-t border-gray-100">
        <button
          onClick={onOpenFormModal}
          className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
        >
          <Plus className="w-4 h-4" />
          新增补录
        </button>

        {batchMode === 'none' && (
          <>
            <button
              onClick={() => onBatchModeChange('approve')}
              className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
            >
              批量通过
            </button>
            <button
              onClick={() => onBatchModeChange('reject')}
              className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
            >
              批量驳回
            </button>
            <button
              onClick={() => onBatchModeChange('export')}
              className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 flex items-center gap-1"
            >
              <Download className="w-4 h-4" />
              导出
            </button>
          </>
        )}

        {batchMode !== 'none' && (
          <>
            {batchMode === 'approve' && (
              <button
                onClick={onBatchApprove}
                disabled={selectedRowKeys.length === 0}
                className="h-9 px-4 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-50"
              >
                确认通过 ({selectedRowKeys.length})
              </button>
            )}
            {batchMode === 'reject' && (
              <button
                onClick={onBatchReject}
                disabled={selectedRowKeys.length === 0}
                className="h-9 px-4 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 disabled:opacity-50"
              >
                确认驳回 ({selectedRowKeys.length})
              </button>
            )}
            {batchMode === 'export' && (
              <button
                onClick={onExport}
                className="h-9 px-4 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700"
              >
                确认导出 {selectedRowKeys.length > 0 ? `(${selectedRowKeys.length}条)` : '(全部)'}
              </button>
            )}
            <button
              onClick={onCancelBatch}
              className="h-9 px-4 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200"
            >
              取消
            </button>
          </>
        )}
      </div>
    </div>
  );
}
