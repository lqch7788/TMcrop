/**
 * 招聘申请筛选器组件
 */
import { Button } from '../../../components/ui/button';
import { FilterBar, FilterItem } from '../../../components/ui/FilterBar';
import type { RecruitmentFilters as RecruitmentFiltersType } from '../types/recruitment.types';
import { PRIORITY_OPTIONS, STATUS_OPTIONS } from '../types/recruitment.types';

export interface RecruitmentFiltersProps {
  filters: RecruitmentFiltersType;
  departments: { oid: string; name: string }[];
  positions: { id: string; name: string }[];
  onFilterChange: (field: keyof RecruitmentFiltersType, value: string) => void;
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
 * 招聘申请页面筛选器组件
 */
export function RecruitmentFilters({
  filters,
  departments,
  positions,
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
}: RecruitmentFiltersProps) {
  return (
    <FilterBar onSearch={onSearch} onReset={onReset}>
      {/* 招聘编号搜索 */}
      <FilterItem label="招聘编号">
        <input
          type="text"
          placeholder="搜索招聘编号"
          value={filters.recruitmentCode}
          onChange={(e) => onFilterChange('recruitmentCode', e.target.value)}
          className="h-9 w-44 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        />
      </FilterItem>

      {/* 部门筛选 */}
      <FilterItem label="部门">
        <select
          value={filters.deptId}
          onChange={(e) => onFilterChange('deptId', e.target.value)}
          className="h-9 w-28 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部部门</option>
          {departments.map(dept => (
            <option key={dept.oid} value={dept.oid}>{dept.name}</option>
          ))}
        </select>
      </FilterItem>

      {/* 岗位筛选 */}
      <FilterItem label="岗位">
        <select
          value={filters.position}
          onChange={(e) => onFilterChange('position', e.target.value)}
          className="h-9 w-28 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部岗位</option>
          {positions.map(pos => (
            <option key={pos.id} value={pos.name}>{pos.name}</option>
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

      {/* 优先级筛选 */}
      <FilterItem label="优先级">
        <select
          value={filters.priority}
          onChange={(e) => onFilterChange('priority', e.target.value)}
          className="h-9 w-20 px-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
        >
          <option value="">全部</option>
          {PRIORITY_OPTIONS.map(opt => (
            <option key={opt.value} value={opt.value}>{opt.label}</option>
          ))}
        </select>
      </FilterItem>

      {/* 操作按钮 */}
      <div className="flex items-center gap-2 ml-auto">
        {batchMode === 'none' && (
          <>
            <Button variant="default" size="sm" onClick={onAdd}>
              新增招聘
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
