/**
 * 采购计划数据表格组件
 */
import React from 'react';
import { ChevronDown, ChevronRightIcon, Plus, Edit, Trash2, Download, Pencil } from 'lucide-react';
import type { PurchasePlan, PurchasePlanItem } from '../../types/purchase';
import {
  calculateOverdueAlert,
  OVERDUE_ALERT_STYLE,
  PURCHASE_EXECUTION_STATUS_TEXT,
  PURCHASE_EXECUTION_STATUS_STYLE,
  type PurchaseExecutionStatus,
} from '../../types/purchase';
import { Button } from '@/components/ui';
import { Checkbox } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';
import { showAlert, showConfirm } from '@/lib/dialogService';
import { Pagination } from '@/components/ui';
import { MaterialItemsTable } from './MaterialItemsTable';

interface PurchasePlanTableProps {
  // 数据
  data: PurchasePlan[];
  // 分页状态
  currentPage: number;
  pageSize: number;
  // 选中状态
  selectedRows: string[];
  // L-6: 模式统一为单个 mode 标记（避免 EDIT_COLUMNS vs VIEW_COLUMNS 双契约分裂）
  // 兼容：原 exportMode / batchEditMode / batchDeleteMode 通过 helper 派生
  // 模式状态
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  // 排序状态
  sortConfig: { field: string; direction: 'asc' | 'desc' } | null;
  // 展开状态
  expandedRows: Set<string>;
  // 操作函数
  onToggleExpand: (id: string) => void;
  onSelectAll: () => void;
  onSelectRow: (id: string) => void;
  onSortChange: (field: string) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewDetail: (plan: PurchasePlan) => void;
  onEdit: (plan: PurchasePlan) => void;
  onDelete: (plan: PurchasePlan) => void;
  // 全选数据
  filteredAndSortedData: PurchasePlan[];
  // 工具栏权限
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canExport?: boolean;
  // 工具栏操作
  onCreate?: () => void;
  onBatchEdit?: () => void;
  onBatchDelete?: () => void;
  onExport?: () => void;
  onExportConfirm?: () => void;
  onExportCancel?: () => void;
  onBatchEditConfirm?: () => void;
  onBatchEditCancel?: () => void;
  onBatchDeleteConfirm?: () => void;
  onBatchDeleteCancel?: () => void;
}

// L-6: 统一 mode 派生 + 列显隐计算（消除 EDIT_COLUMNS vs VIEW_COLUMNS 双契约）
type TableMode = 'view' | 'export' | 'batchEdit' | 'batchDelete';
function deriveMode(exportMode: boolean, batchEditMode: boolean, batchDeleteMode: boolean): TableMode {
  if (exportMode) return 'export';
  if (batchEditMode) return 'batchEdit';
  if (batchDeleteMode) return 'batchDelete';
  return 'view';
}

/**
 * 优先级Badge组件
 */
function PriorityBadge({ priority, priorityText }: { priority: string; priorityText: string }) {
  return (
    <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
      priority === 'urgent' ? 'bg-red-100 text-red-700' :
      priority === 'high' ? 'bg-orange-100 text-orange-700' :
      priority === 'normal' ? 'bg-blue-100 text-blue-700' :
      'bg-gray-100 text-gray-600'
    }`}>
      {priorityText}
    </span>
  );
}

/**
 * 状态Badge组件（仅展示审批状态）
 * 业务执行进度（采购中/已完成/已取消）由独立的"执行状态"列展示
 */
function StatusBadge({ status, statusText, plan }: { status: string; statusText: string; plan: PurchasePlan }) {
  const alert = calculateOverdueAlert(plan);
  return (
    <>
      <span className={`inline-flex px-2 py-1 rounded-full text-xs font-medium ${
        status === 'rejected' ? 'bg-red-100 text-red-700' :
        status === 'pending' ? 'bg-amber-100 text-amber-700' :
        status === 'approved' ? 'bg-blue-100 text-blue-700' :
        'bg-gray-100 text-gray-600'  // draft / 其它
      }`}>
        {statusText}
      </span>
      {/* 逾期预警标记 */}
      {alert.level !== 'normal' && (
        <span className={`inline-flex items-center ml-1 px-1.5 py-0.5 rounded text-xs font-medium ${OVERDUE_ALERT_STYLE[alert.level].bg} ${OVERDUE_ALERT_STYLE[alert.level].text}`}>
          {alert.level === 'overdue' ? '🔴逾期' : '⚠️将到期'}
        </span>
      )}
    </>
  );
}

/**
 * 采购执行状态 Badge（4 档）
 */
function ExecutionStatusBadge({ executionStatus }: { executionStatus?: string }) {
  const status = (executionStatus || 'pending_execution') as PurchaseExecutionStatus;
  const style = PURCHASE_EXECUTION_STATUS_STYLE[status] || PURCHASE_EXECUTION_STATUS_STYLE.pending_execution;
  const text = PURCHASE_EXECUTION_STATUS_TEXT[status] || '待执行';
  return (
    <span className={`inline-flex px-2 py-0.5 rounded-full text-xs font-medium ${style.bg} ${style.text}`}>
      {text}
    </span>
  );
}

/**
 * 采购计划数据表格组件
 */
export function PurchasePlanTable({
  data,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  sortConfig,
  expandedRows,
  onToggleExpand,
  onSelectAll,
  onSelectRow,
  onSortChange,
  onPageChange,
  onPageSizeChange,
  onViewDetail,
  onEdit,
  onDelete,
  filteredAndSortedData,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canExport = true,
  onCreate,
  onBatchEdit,
  onBatchDelete,
  onExport,
  onExportConfirm,
  onExportCancel,
  onBatchEditConfirm,
  onBatchEditCancel,
  onBatchDeleteConfirm,
  onBatchDeleteCancel,
}: PurchasePlanTableProps) {
  // 计算总页数
  const totalPages = Math.ceil(filteredAndSortedData.length / pageSize) || 1;

  // L-6: 派生统一 mode（避免列显隐到处写 exportMode || batchEditMode || batchDeleteMode）
  const mode = deriveMode(exportMode, batchEditMode, batchDeleteMode);
  const isSelectable = mode !== 'view';
  const isBatchAction = mode === 'batchEdit' || mode === 'batchDelete';

  // 获取排序指示器
  const getSortIndicator = (field: string) => {
    if (sortConfig?.field !== field) return null;
    return sortConfig.direction === 'asc' ? ' ↑' : ' ↓';
  };

  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      {/* 工具栏 - 与技术方案页面保持一致 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">采购计划列表</h3>
        {exportMode || batchEditMode || batchDeleteMode ? (
          <div className="flex gap-2">
            {batchEditMode && (
              <>
                <Button
                  size="sm"
                  variant="blue"
                  onClick={() => {
                    if (selectedRows.length === 0) {
                      showAlert('请先选择要编辑的数据');
                      return;
                    }
                    onBatchEditConfirm?.();
                  }}
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
                <Button size="sm" variant="secondary" onClick={onBatchEditCancel}>
                  取消
                </Button>
              </>
            )}
            {batchDeleteMode && (
              <>
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => {
                    if (selectedRows.length === 0) {
                      showAlert('请先选择要删除的数据');
                      return;
                    }
                    onBatchDeleteConfirm?.();
                  }}
                  disabled={selectedRows.length === 0}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
                <Button size="sm" variant="secondary" onClick={onBatchDeleteCancel}>
                  取消
                </Button>
              </>
            )}
            {exportMode && (
              <>
                <Button size="sm" onClick={onExportConfirm}>
                  <Download className="w-4 h-4" />
                  确认导出
                </Button>
                <Button size="sm" variant="secondary" onClick={onExportCancel}>
                  取消
                </Button>
              </>
            )}
          </div>
        ) : (
          <div className="flex gap-2">
            {canCreate && onCreate && (
              <Button size="sm" onClick={onCreate}>
                <Plus className="w-4 h-4" />
                新增
              </Button>
            )}
            {canEdit && onBatchEdit && (
              <Button size="sm" variant="blue" onClick={onBatchEdit}>
                <Edit className="w-4 h-4" />
                编辑
              </Button>
            )}
            {canDelete && onBatchDelete && (
              <Button size="sm" variant="destructive" onClick={onBatchDelete}>
                <Trash2 className="w-4 h-4" />
                删除
              </Button>
            )}
            {canExport && onExport && (
              <Button size="sm" onClick={onExport}>
                <Download className="w-4 h-4" />
                导出
              </Button>
            )}
          </div>
        )}
      </div>
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {/* 展开按钮列 - 非导出模式时显示 */}
              {!(exportMode || batchEditMode || batchDeleteMode) && (
                <th className="px-2 py-3 text-left text-sm font-semibold whitespace-nowrap w-10">
                </th>
              )}
              {/* checkbox 列 - 导出/批量模式时显示 */}
              {(exportMode || batchEditMode || batchDeleteMode) && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <Checkbox
                    checked={selectedRows.length === filteredAndSortedData.length && filteredAndSortedData.length > 0}
                    onCheckedChange={() => onSelectAll()}
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">采购申请批次号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">关联生产批次</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('purchaseType')}>采购类型{sortConfig?.field === 'purchaseType' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('applicant')}>申请人{sortConfig?.field === 'applicant' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">申请部门</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('applyDate')}>申请日期{sortConfig?.field === 'applyDate' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('requiredDate')}>需求日期{sortConfig?.field === 'requiredDate' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('priority')}>优先级{sortConfig?.field === 'priority' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap cursor-pointer hover:bg-blue-600/10" onClick={() => onSortChange('status')}>状态{sortConfig?.field === 'status' && <span className="ml-1">{sortConfig.direction === 'asc' ? '↑' : '↓'}</span>}</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">执行状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-24">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-300">
            {data.slice((currentPage - 1) * pageSize, currentPage * pageSize).map((plan) => (
              <React.Fragment key={plan.id}>
                <tr className={`transition-colors ${
                  (batchEditMode || batchDeleteMode) && (plan.executionStatus === 'completed' || plan.executionStatus === 'cancelled')
                    ? 'bg-gray-100 hover:bg-gray-100'
                    : 'hover:bg-blue-50'
                }`}>
                  {/* 展开/折叠按钮 - 非导出模式时显示 */}
                  {!(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-2 py-3 w-10">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => onToggleExpand(plan.id)}
                        title={expandedRows.has(plan.id) ? '折叠' : '展开'}
                      >
                        {expandedRows.has(plan.id) ? (
                          <ChevronDown className="w-4 h-4 text-gray-500" />
                        ) : (
                          <ChevronRightIcon className="w-4 h-4 text-gray-500" />
                        )}
                      </Button>
                    </td>
                  )}
                  {/* checkbox - 导出/批量模式时显示 */}
                  {(exportMode || batchEditMode || batchDeleteMode) && (
                    <td className="px-4 py-3">
                      <Checkbox
                        checked={selectedRows.includes(plan.purchaseApplicationCode)}
                        onCheckedChange={() => onSelectRow(plan.purchaseApplicationCode)}
                        disabled={(batchEditMode || batchDeleteMode) && (plan.executionStatus === 'completed' || plan.executionStatus === 'cancelled')}
                      />
                    </td>
                  )}
                  <td className="px-4 py-3 text-sm whitespace-nowrap">
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewDetail(plan)}
                      className="text-blue-600 hover:text-blue-800 hover:underline font-medium cursor-pointer p-0 h-auto"
                      title="点击查看详情"
                    >
                      {plan.purchaseApplicationCode}
                    </Button>
                  </td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.relatedBatchCode || '不关联批次'}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.purchaseTypeName}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applicant}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applicantDepartment}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.applyDate}</td>
                  <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{plan.requiredDate}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <PriorityBadge priority={plan.priority} priorityText={plan.priorityText} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <StatusBadge status={plan.status} statusText={plan.statusText} plan={plan} />
                  </td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <ExecutionStatusBadge executionStatus={plan.executionStatus} />
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex items-center gap-1">
                      {/* 只在执行状态为"已完成"或"已取消"时禁用编辑/删除（视为归档） */}
                      {plan.executionStatus !== 'completed' && plan.executionStatus !== 'cancelled' && (
                        <>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => onEdit(plan)}
                            title="编辑"
                          >
                            <Pencil className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={async () => {
                              // 2026-06-07: 业务调整允许删除任何状态采购计划
                              const isTerminal = ['approved', 'purchasing', 'completed'].includes(plan.status);
                              const confirmMsg = isTerminal
                                ? `采购计划 ${plan.purchaseApplicationCode} 状态为「${plan.status}」，删除后不可恢复。\n\n确定要继续删除吗？`
                                : `确定要删除采购计划 ${plan.purchaseApplicationCode} 吗？`;
                              if (await showConfirm(confirmMsg)) {
                                onDelete(plan);
                              }
                            }}
                            title="删除"
                          >
                            <Trash2 className="w-4 h-4" />
                          </Button>
                        </>
                      )}
                      {(plan.executionStatus === 'completed' || plan.executionStatus === 'cancelled') && (
                        <span className="text-xs text-gray-400">已归档</span>
                      )}
                    </div>
                  </td>
                </tr>
                {/* 展开的物料明细行 */}
                {expandedRows.has(plan.id) && (
                  <tr key={`${plan.id}-expanded`} className="bg-blue-50/50">
                    <td colSpan={12} className="px-4 py-4">
                      <div className="text-sm font-medium text-gray-700 mb-3">物料明细（共 {plan.items?.length || 0} 项）</div>
                      <MaterialItemsTable items={plan.items || []} headerTheme="emerald" />
                    </td>
                  </tr>
                )}
              </React.Fragment>
            ))}
          </tbody>
        </table>
        {(exportMode || batchEditMode || batchDeleteMode) && (
          <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="sm"
                onClick={onSelectAll}
                className="text-emerald-600 hover:text-emerald-700 p-0 h-auto"
              >
                {selectedRows.length === filteredAndSortedData.length ? '全不选' : '全选'}
              </Button>
              <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
            </div>
          </div>
        )}
      </div>

      {/* Pagination */}
      <div className="flex items-center justify-between px-4 py-3 bg-white border-t border-gray-100 rounded-b-xl">
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={onPageChange}
          pageSize={pageSize}
          onPageSizeChange={onPageSizeChange}
          showPageSize={true}
        />
      </div>
    </div>
  );
}

export default PurchasePlanTable;
