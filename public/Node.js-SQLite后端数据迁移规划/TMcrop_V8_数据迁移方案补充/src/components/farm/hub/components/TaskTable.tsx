/**
 * 任务表格组件
 * 整合表头、行、分页器
 */

import React from 'react';
import { Download, Plus, Edit, Trash2, Upload, Send, CheckCircle } from 'lucide-react';
import { TaskTableHeader } from './TaskTableHeader';
import { TaskTableRow } from './TaskTableRow';
import { Pagination } from './Pagination';
import { EDITABLE_STATUSES, DELETABLE_STATUSES, STATUS_MAP } from '../constants_taskDispatch';

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
  // 选择状态 - 改为接收选中任务的 ID 列表，由组件自己计算选中状态
  selectedIds: string[];
  exportMode: boolean;
  batchEditMode: boolean;
  batchDeleteMode: boolean;
  batchDispatchMode: boolean;
  batchVerifyMode: boolean;
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
  onBatchDispatch?: () => void;
  onConfirmBatchDispatch?: () => void;
  onBatchVerify?: () => void;
  onConfirmBatchVerify?: () => void;
  onExport?: () => void;
  onImport?: () => void;
  onCreate?: () => void;
}

export function TaskTable({
  tasks,
  currentPage,
  pageSize,
  selectedIds,
  exportMode,
  batchEditMode,
  batchDeleteMode,
  batchDispatchMode,
  batchVerifyMode,
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
  onBatchDispatch,
  onConfirmBatchDispatch,
  onBatchVerify,
  onConfirmBatchVerify,
  onExport,
  onImport,
  onCreate,
}: TaskTableProps) {
  const showCheckbox = exportMode || batchEditMode || batchDeleteMode || batchDispatchMode || batchVerifyMode;
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
        <h3 className="text-lg font-semibold text-gray-900">农事任务表</h3>
        <div className="flex items-center gap-2">
          {/* 导出模式 */}
          {exportMode ? (
            <>
              <button
                onClick={onConfirmExport}
                disabled={selectedIds.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Download className="w-4 h-4" />
                确认导出
              </button>
              <button
                onClick={onCancelExport}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : batchEditMode ? (
            <>
              <button
                onClick={onConfirmBatchEdit}
                disabled={selectedIds.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Edit className="w-4 h-4" />
                确认编辑
              </button>
              <button
                onClick={() => { onCancelBatchEdit?.(); }}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : batchDeleteMode ? (
            <>
              <button
                onClick={onBatchDelete}
                disabled={selectedIds.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Trash2 className="w-4 h-4" />
                确认删除
              </button>
              <button
                onClick={() => { onCancelBatchDelete?.(); }}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : batchDispatchMode ? (
            <>
              <button
                onClick={onConfirmBatchDispatch}
                disabled={selectedIds.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认派发
              </button>
              <button
                onClick={onCancelBatchDelete}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : batchVerifyMode ? (
            <>
              <button
                onClick={onConfirmBatchVerify}
                disabled={selectedIds.length === 0}
                className="h-8 px-3 flex items-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                确认验收
              </button>
              <button
                onClick={onCancelBatchDelete}
                className="h-8 px-3 flex items-center gap-2 bg-gray-100 text-gray-700 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
              >
                取消
              </button>
            </>
          ) : (
            <>
              {/* 正常模式按钮 */}
              {onCreate && (
                <button
                  onClick={onCreate}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建
                </button>
              )}
              {onBatchEdit && (
                <button
                  onClick={onBatchEdit}
                  className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Edit className="w-4 h-4" />
                  编辑
                </button>
              )}
              {onBatchDelete && (
                <button
                  onClick={onBatchDelete}
                  className="h-8 px-3 flex items-center gap-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700 transition-colors"
                >
                  <Trash2 className="w-4 h-4" />
                  删除
                </button>
              )}
              {onBatchDispatch && (
                <button
                  onClick={onBatchDispatch}
                  className="h-8 px-3 flex items-center gap-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
                >
                  <Send className="w-4 h-4" />
                  派发
                </button>
              )}
              {onBatchVerify && (
                <button
                  onClick={onBatchVerify}
                  className="h-8 px-3 flex items-center gap-2 bg-green-600 text-white rounded-lg text-sm font-medium hover:bg-green-700 transition-colors"
                >
                  <CheckCircle className="w-4 h-4" />
                  验收
                </button>
              )}
              {onExport && (
                <button
                  onClick={onExport}
                  className="h-8 px-3 flex items-center gap-2 bg-emerald-600 text-white rounded-lg text-sm font-medium hover:bg-emerald-700 transition-colors"
                >
                  <Download className="w-4 h-4" />
                  导出
                </button>
              )}
              {onImport && (
                <button
                  onClick={onImport}
                  className="h-8 px-3 flex items-center gap-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Upload className="w-4 h-4" />
                  导入
                </button>
              )}
            </>
          )}
        </div>
      </div>

      {/* 表格 */}
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <TaskTableHeader
              exportMode={exportMode}
              batchEditMode={batchEditMode}
              batchDeleteMode={batchDeleteMode}
              batchDispatchMode={batchDispatchMode}
              batchVerifyMode={batchVerifyMode}
              isAllSelected={isAllSelected}
              isSomeSelected={isSomeSelected}
              onSelectAll={onSelectAll}
            />
          </thead>
          <tbody className="divide-y divide-gray-300">
            {paginatedTasks.map((task, index) => {
              const isEditable = batchEditMode && EDITABLE_STATUSES.includes(task.status);
              const isDeletable = batchDeleteMode && DELETABLE_STATUSES.includes(task.status);
              const isSelectable = batchEditMode ? isEditable : (batchDeleteMode ? isDeletable : true);
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
          </tbody>
        </table>
      </div>

      {/* 分页 */}
      <Pagination
        currentPage={currentPage}
        pageSize={pageSize}
        total={total}
        onPageChange={onPageChange}
        onPageSizeChange={onPageSizeChange}
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
