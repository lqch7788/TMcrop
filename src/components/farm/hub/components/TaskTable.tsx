/**
 * 任务表格组件
 * 整合表头、行、分页器
 */

import React, { useState } from 'react';
import { Download, Plus, Edit, Trash2, Upload, Send, CheckCircle, RotateCcw, ChevronDown, ChevronUp } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { Pagination } from '@/components/ui/Pagination';
import { Table, TableHeader, TableBody } from '@/components/ui';
import { EDITABLE_STATUSES, STATUS_MAP } from '../constants_taskDispatch';

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
  // 统计信息
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  // 分页
  currentPage: number;
  pageSize: number;
  // 选择状态 - 改为接收选中任务的 ID 列表，由组件自己计算选中状态
  selectedIds: string[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  batchDispatchMode: boolean;
  batchVerifyMode: boolean;
  batchReassignMode: boolean;
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
  onSelectExecutor?: (task: Task) => void;
  onPublish?: (task: Task) => void;  // 发布草稿任务
  // 是否为"我的任务"视图（true=执行人视图，显示接受/拒绝；false=管理者视图，显示撤回/取消）
  isMyTasksView?: boolean;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onConfirmExport?: () => void;
  onCancelExport?: () => void;
  onBatchEdit?: () => void;
  onConfirmBatchEdit?: () => void;
  onCancelBatchEdit?: () => void;
  onCancelBatchDelete?: () => void;
  onBatchDelete?: () => void;
  onConfirmBatchDelete?: () => void;
  onBatchDispatch?: () => void;
  onConfirmBatchDispatch?: () => void;
  onBatchVerify?: () => void;
  onConfirmBatchVerify?: () => void;
  onBatchReassign?: () => void;
  onConfirmBatchReassign?: () => void;
  onCancelBatchReassign?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onCreate?: () => void;
}

export function TaskTable({
  tasks,
  stats,
  currentPage,
  pageSize,
  selectedIds,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  batchDispatchMode,
  batchVerifyMode,
  batchReassignMode,
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
  onSelectExecutor,
  onPublish,
  isMyTasksView = false,
  onPageChange,
  onPageSizeChange,
  onConfirmExport,
  onCancelExport,
  onBatchEdit,
  onConfirmBatchEdit,
  onCancelBatchEdit,
  onCancelBatchDelete,
  onBatchDelete,
  onConfirmBatchDelete,
  onBatchDispatch,
  onConfirmBatchDispatch,
  onBatchVerify,
  onConfirmBatchVerify,
  onBatchReassign,
  onConfirmBatchReassign,
  onCancelBatchReassign,
  onExport,
  onImport,
  onCreate,
}: TaskTableProps) {
  const [showMoreActions, setShowMoreActions] = useState(false);
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode || batchDispatchMode || batchVerifyMode || batchReassignMode;
  const total = tasks.length;
  const paginatedTasks = tasks.slice((currentPage - 1) * pageSize, currentPage * pageSize);

  // 计算当前页可编辑的任务ID（用于批量编辑模式）
  const currentPageEditableIds = batchEditMode
    ? paginatedTasks
        .filter(task => EDITABLE_STATUSES.includes(task.status))
        .map(task => task.id)
    : paginatedTasks.map(task => task.id);

  // 全选状态计算 - 使用任务ID
  const isAllSelected = currentPageEditableIds.length > 0 && currentPageEditableIds.every(id => selectedIds.includes(id));
  const isSomeSelected = currentPageEditableIds.some(id => selectedIds.includes(id)) || selectedIds.length > 0;

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      {/* 表头 + 操作按钮 */}
      <div className="px-4 py-3 border-b border-gray-100 bg-gray-50 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <h3 className="text-lg font-semibold text-gray-900">农事任务表</h3>
          {stats && (
            <div className="flex items-center gap-2 text-sm">
              <span className="text-gray-500">共</span>
              <span className="px-2 py-0.5 bg-emerald-100 text-emerald-700 font-semibold rounded">{stats.total}</span>
              <span className="text-gray-500">条</span>
              <span className="text-amber-600">| 待执行 {stats.pending}</span>
              <span className="text-blue-600">| 进行中 {stats.inProgress}</span>
              <span className="text-green-600">| 已完成 {stats.completed}</span>
            </div>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 导出模式 */}
          {exportMode ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmExport}
                disabled={selectedIds.length === 0}
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
                disabled={selectedIds.length === 0}
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
                onClick={onConfirmBatchDelete}
                disabled={selectedIds.length === 0}
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onCancelBatchDelete?.(); }}
              >
                取消
              </Button>
            </>
          ) : batchDispatchMode ? (
            <>
              <Button
                size="sm"
                onClick={onConfirmBatchDispatch}
                disabled={selectedIds.length === 0}
                className="bg-purple-600 text-white hover:bg-purple-700"
              >
                确认派发
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancelBatchDelete}
              >
                取消
              </Button>
            </>
          ) : batchVerifyMode ? (
            <>
              <Button
                variant="default"
                size="sm"
                onClick={onConfirmBatchVerify}
                disabled={selectedIds.length === 0}
              >
                确认验收
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={onCancelBatchDelete}
              >
                取消
              </Button>
            </>
          ) : batchReassignMode ? (
            <>
              <Button
                variant="warning"
                size="sm"
                onClick={onConfirmBatchReassign}
                disabled={selectedIds.length === 0}
              >
                确认重派
              </Button>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => { onCancelBatchReassign?.(); }}
              >
                取消
              </Button>
            </>
          ) : (
            <>
              {/* 正常模式按钮 - 常用操作始终显示 */}
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
              {/* 更多操作下拉 */}
              {(onBatchDispatch || onBatchVerify || onBatchReassign || onExport || onImport) && (
                <div className="relative">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setShowMoreActions(!showMoreActions)}
                  >
                    更多
                    {showMoreActions ? <ChevronUp className="w-3.5 h-3.5" /> : <ChevronDown className="w-3.5 h-3.5" />}
                  </Button>
                  {showMoreActions && (
                    <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg z-50 p-1.5 flex items-center gap-1">
                      {onBatchDispatch && (
                        <Button
                          size="sm"
                          onClick={() => { onBatchDispatch?.(); setShowMoreActions(false); }}
                          className="bg-purple-600 text-white hover:bg-purple-700 whitespace-nowrap"
                        >
                          <Send className="w-4 h-4" />
                          派发
                        </Button>
                      )}
                      {onBatchVerify && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => { onBatchVerify?.(); setShowMoreActions(false); }}
                          className="whitespace-nowrap"
                        >
                          <CheckCircle className="w-4 h-4" />
                          验收
                        </Button>
                      )}
                      {onBatchReassign && (
                        <Button
                          variant="warning"
                          size="sm"
                          onClick={() => { onBatchReassign?.(); setShowMoreActions(false); }}
                          className="whitespace-nowrap"
                        >
                          <RotateCcw className="w-4 h-4" />
                          重派
                        </Button>
                      )}
                      {onExport && (
                        <Button
                          variant="default"
                          size="sm"
                          onClick={() => { onExport?.(); setShowMoreActions(false); }}
                          className="whitespace-nowrap"
                        >
                          <Download className="w-4 h-4" />
                          导出
                        </Button>
                      )}
                      {onImport && (
                        <Button
                          variant="blue"
                          size="sm"
                          onClick={() => { onImport?.(); setShowMoreActions(false); }}
                          className="whitespace-nowrap"
                        >
                          <Upload className="w-4 h-4" />
                          导入
                        </Button>
                      )}
                    </div>
                  )}
                </div>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <Table>
          <TableHeader>
            <TaskTableHeader
              exportMode={exportMode}
              batchEditMode={batchEditMode}
              batchDeleteMode={batchDeleteMode}
              batchDispatchMode={batchDispatchMode}
              batchVerifyMode={batchVerifyMode}
              batchReassignMode={batchReassignMode}
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onSelectAll={onSelectAll}
            />
          </TableHeader>
          <TableBody className="divide-y divide-gray-300">
            {paginatedTasks.map((task, index) => {
              const isEditable = batchEditMode && EDITABLE_STATUSES.includes(task.status);
              const isSelectable = batchEditMode ? isEditable : true;
              const statusName = STATUS_MAP[task.status]?.label || task.status;
              const selectableReason = !isSelectable ? `${statusName}状态不支持此操作` : undefined;

              return (
                <TaskTableRow
                  key={task.id}
                  task={task}
                  index={index}
                  showCheckbox={showCheckbox}
                  isSelected={selectedIds.includes(task.id)}
                  isSelectable={isSelectable}
                  selectableReason={selectableReason}
                  onSelect={() => onSelectRow(index)}
                  onViewDetail={() => onViewDetail(task)}
                  onViewSop={onViewSop ? () => onViewSop(task) : undefined}
                  onAccept={onAccept ? () => onAccept(task) : undefined}
                  onWithdraw={onWithdraw ? () => onWithdraw(task) : undefined}
                  onCancel={onCancel ? () => onCancel(task) : undefined}
                  onOvertime={onOvertime ? () => onOvertime(task) : undefined}
                  onContinue={onContinue ? () => onContinue(task.id) : undefined}
                  onReassign={onReassign ? () => onReassign(task) : undefined}
                  onSelectExecutor={onSelectExecutor ? () => onSelectExecutor(task) : undefined}
                  onPublish={onPublish ? () => onPublish(task) : undefined}
                  isMyTasksView={isMyTasksView}
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
      </div>

      {/* 分页 */}
      <Pagination
        currentPage={currentPage}
        totalPages={Math.ceil(total / pageSize) || 1}
        pageSize={pageSize}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
        showPageSize={true}
      />

      {/* 导出模式底部栏 */}
      {exportMode && (
        <div className="flex items-center gap-4 px-4 py-3 border-t border-gray-100">
          <span className="text-sm text-gray-500">{selectedIds.length === tasks.length ? '全不选' : '全选'}</span>
          <span className="text-sm text-gray-500">已选择 {selectedIds.length} 项</span>
        </div>
      )}
    </div>
  );
}
