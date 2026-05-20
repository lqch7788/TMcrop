/**
 * 任务表格组件
 * 整合表头、行、分页器
 */

import React from 'react';
import { Download, Plus, Edit, Trash2 } from 'lucide-react';
import { Button } from '../../../ui/button';
import { Table, TableHeader, TableBody } from '../../../ui/table';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { Pagination } from '../../../ui/Pagination';
import { EDITABLE_STATUSES, DELETABLE_STATUSES, STATUS_MAP } from '../constants/taskDispatchConstants';

interface Task {
  id: string;
  taskCode?: string;
  types: string[];
  typeLabel?: string;
  field: string;
  crop: string;
  assignee: string;
  assigneeId?: string;
  assigneeName?: string;
  planStart: string;
  planEnd: string;
  progress: number;
  status: string;
  priority: string;
  batchCode?: string;
  remarks?: string;
  cropRemarks?: string;
  sopContent?: string;
  estimatedDays?: number;
  estimatedHours?: number;
  timeout?: any;
}

interface TaskTableProps {
  // 数据
  tasks: Task[];
  // 分页
  currentPage: number;
  pageSize: number;
  // 选择状态
  selectedRows: number[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  // 催办
  canRemind: (taskId: string) => { allowed: boolean; reason?: string };
  sendReminder: (
    taskId: string,
    taskCode: string,
    assigneeId: string,
    assigneeName: string,
    senderId: string,
    senderName: string
  ) => void;
  // 操作回调
  onSelectRow: (index: number) => void;
  onSelectAll: () => void;
  onViewDetail: (task: Task) => void;
  onViewSop?: (task: Task) => void;
  onAccept?: (task: Task) => void;
  onWithdraw?: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onOvertime?: (task: Task) => void;
  onContinue?: (taskId: string) => void;
  onReassign?: (task: Task) => void;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
  onBatchEdit?: () => void;
  onConfirmBatchEdit?: () => void;
  onCancelBatchEdit?: () => void;
  onBatchDelete?: () => void;
  onExport?: () => void;
  onCreate?: () => void;
}

export function TaskTable({
  tasks,
  currentPage,
  pageSize,
  selectedRows,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  canRemind,
  sendReminder,
  onSelectRow,
  onSelectAll,
  onViewDetail,
  onViewSop,
  onAccept,
  onWithdraw,
  onCancel,
  onOvertime,
  onContinue,
  onReassign,
  onPageChange,
  onPageSizeChange,
  onConfirmExport,
  onCancelExport,
  onBatchEdit,
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onBatchDelete,
  onExport,
  onCreate,
}: TaskTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode;
  const total = tasks.length;
  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 计算当前页可编辑的全局索引（用于批量编辑模式）
  const currentPageStartIdx = (currentPage - 1) * pageSize;
  const currentPageEditableIndexes = batchEditMode
    ? paginatedTasks
        .map((task, idx) => {
          const editableStatuses = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'rejected'];
          return editableStatuses.includes(task.status) ? currentPageStartIdx + idx : -1;
        })
        .filter(idx => idx !== -1)
    : paginatedTasks.map((_, idx) => currentPageStartIdx + idx);

  // 全选状态计算 - 使用全局索引
  const isAllSelected = currentPageEditableIndexes.length > 0 && currentPageEditableIndexes.every(idx => selectedRows.includes(idx));
  const isSomeSelected = currentPageEditableIndexes.some(idx => selectedRows.includes(idx)) || selectedRows.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头 + 操作按钮 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">农事任务表</h3>
        <div className="flex items-center gap-2">
          {/* 导出模式 */}
          {exportMode ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmExport}
                disabled={selectedRows.length === 0}
              >
                <Download className="w-4 h-4" />
                确认导出
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancelExport}
              >
                取消
              </Button>
            </>
          ) : batchEditMode ? (
            <>
              <Button
                variant="blue"
                size="sm"
                onClick={onConfirmBatchEdit}
                disabled={selectedRows.length === 0}
              >
                <Edit className="w-4 h-4" />
                确认编辑
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onCancelBatchEdit?.(); }}
              >
                取消
              </Button>
            </>
          ) : batchDeleteMode ? (
            <>
              <Button
                variant="destructive"
                size="sm"
                onClick={onBatchDelete}
                disabled={selectedRows.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => {}}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              {/* 正常模式按钮 */}
              {onCreate && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onCreate}
                >
                  <Plus className="w-4 h-4" />
                  新建
                </Button>
              )}
              {onBatchEdit && (
                <Button
                  variant="blue"
                  size="sm"
                  onClick={onBatchEdit}
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </Button>
              )}
              {onBatchDelete && (
                <Button
                  variant="destructive"
                  size="sm"
                  onClick={onBatchDelete}
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </Button>
              )}
              {onExport && (
                <Button
                  variant="default"
                  size="sm"
                  onClick={onExport}
                >
                  <Download className="w-4 h-4" />
                  导出
                </Button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <Table>
        <TableHeader>
          <TaskTableHeader
            exportMode={exportMode}
            batchEditMode={batchEditMode}
            batchDeleteMode={batchDeleteMode}
            isAllSelected={isAllSelected}
            isSomeSelected={isSomeSelected}
            onSelectAll={onSelectAll}
          />
        </TableHeader>
        <TableBody className="divide-y divide-gray-300">
          {paginatedTasks.map((task, index) => {
            const globalIndex = (currentPage - 1) * pageSize + index;
            const isEditable = batchEditMode && EDITABLE_STATUSES.includes(task.status);
            const isDeletable = batchDeleteMode && DELETABLE_STATUSES.includes(task.status);
            const isSelectable = batchEditMode ? isEditable : (batchDeleteMode ? isDeletable : true);
            const statusName = STATUS_MAP[task.status]?.label || task.status;
            const selectableReason = !isSelectable ? `${statusName}状态不支持此操作` : undefined;

            return (
              <TaskTableRow
                key={task.id}
                task={task}
                index={globalIndex}
                showCheckbox={showCheckbox}
                isSelected={selectedRows.includes(globalIndex)}
                isSelectable={isSelectable}
                selectableReason={selectableReason}
                onSelect={() => onSelectRow(globalIndex)}
                onViewDetail={() => onViewDetail(task)}
                onViewSop={onViewSop ? () => onViewSop(task) : undefined}
                onAccept={onAccept ? () => onAccept(task) : undefined}
                onWithdraw={onWithdraw ? () => onWithdraw(task) : undefined}
                onCancel={onCancel ? () => onCancel(task) : undefined}
                onOvertime={onOvertime ? () => onOvertime(task) : undefined}
                onContinue={onContinue ? () => onContinue(task.id) : undefined}
                onReassign={onReassign ? () => onReassign(task) : undefined}
                canRemind={canRemind}
                sendReminder={sendReminder}
                remindProps={{
                  allowed: canRemind(task.id).allowed,
                  cooldownSec: 0,
                  todayCount: 0,
                }}
              />
            );
          })}
        </TableBody>
      </Table>

      {/* 分页 */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        totalPages={Math.ceil(total / pageSize) || 1}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        showPageSize
      />

      {/* 导出模式底部栏 */}
      {exportMode && (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{selectedRows.length === tasks.length ? '全不选' : '全选'}</span>
          <span className="text-sm text-gray-500">已选择 {selectedRows.length} 项</span>
        </div>
      )}
    </div>
  );
}
