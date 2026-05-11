/**
 * 农事任务中心 - 任务管理Tab (增强版)
 * 使用从 TaskDispatchPage 迁移的 TaskTable 组件
 * 样式与 TaskDispatchPage 统一
 */

import React, { useState, useMemo, useCallback } from 'react';
import { Task } from '../../../hooks/useTasks';
import { FARM_OPERATION_TYPES } from '../../../types/farm/common';
import { TASK_STATUS_CONFIG } from '../../../hooks/useTasks';
import { useReminder } from '../../../hooks/useReminder';
import { Plus, Upload } from 'lucide-react';

// 导入迁移的 TaskTable 组件
import { TaskTable } from './components/TaskTable';
import { CalendarView } from './components/CalendarView';
import { taskDispatchStaff } from '../../../data/farmMockData';
import { EDITABLE_STATUSES, DELETABLE_STATUSES, BATCH_DISPATCH_STATUSES, STATUS_OPTIONS } from './constants_taskDispatch';

// 状态配置（从常量文件导入，与 taskDispatch 保持一致）
const STATUS_FILTERS = STATUS_OPTIONS;

// BATCH_DISPATCH_STATUSES 已从 constants_taskDispatch 导入

// 可批量验收的状态：待验收
const BATCH_ACCEPT_STATUSES = ['waiting_acceptance'];

// 工具栏状态类型
type ToolbarMode = 'normal' | 'export' | 'batchEdit' | 'batchDelete' | 'batchDispatch' | 'batchVerify';

// 视图模式类型
type ViewMode = 'list' | 'calendar';

interface TaskTabProps {
  tasks: Task[];
  stats?: {
    total: number;
    pending: number;
    inProgress: number;
    completed: number;
  };
  selectedIds: string[];
  onToggleSelect: (id: string) => void;
  onSelectAll: () => void;
  onClearSelection: () => void;
  filters: { status: string; type: string; area: string; search: string; assignee: string; batchCode: string };
  onFilterChange: (key: string, value: string) => void;
  onResetFilters: () => void;
  onViewTask?: (taskId: string) => void;
  onViewTaskInCalendar?: (task: Task) => void;
  onCreateTask?: () => void;
  // 任务操作回调
  onWithdraw?: (task: Task) => void;
  onCancel?: (task: Task) => void;
  onReassign?: (task: Task) => void;
  onOvertime?: (task: Task) => void;
  onContinue?: (taskId: string) => void;
  onAccept?: (task: Task) => void;
  onRemind?: (task: Task) => void;
  onViewSop?: (sopContent: string) => void;
  onSelectExecutor?: (task: Task) => void;
  onPublish?: (task: Task) => void;  // 发布草稿任务
  // 批量操作回调
  onBatchDispatch?: (taskIds: string[]) => void;
  onBatchVerify?: (taskIds: string[]) => void;
  onBatchDelete?: (taskIds: string[]) => void;
  onBatchEdit?: (taskIds: string[]) => void;
  // 导入回调
  onImport?: () => void;
  // 导出回调
  onExport?: (taskIds: string[]) => void;
}

/**
 * 任务管理Tab组件（增强版 - 使用 TaskTable）
 */
export function TaskTab({
  tasks,
  stats,
  selectedIds,
  onToggleSelect,
  onSelectAll,
  onClearSelection,
  filters,
  onFilterChange,
  onResetFilters,
  onViewTask,
  onViewTaskInCalendar,
  onCreateTask,
  onWithdraw,
  onCancel,
  onReassign,
  onOvertime,
  onContinue,
  onAccept,
  onRemind,
  onViewSop,
  onSelectExecutor,
  onPublish,
  onBatchDispatch,
  onBatchVerify,
  onBatchDelete,
  onBatchEdit,
  onImport,
  onExport,
}: TaskTabProps) {
  // 工具栏模式
  const [toolbarMode, setToolbarMode] = useState<ToolbarMode>('normal');

  // 视图模式
  const [viewMode, setViewMode] = useState<ViewMode>('list');

  // 分页状态
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(20);

  // 催办 hook
  const { canRemind, sendReminder } = useReminder();

  // 获取唯一的执行人列表
  const assigneeOptions = useMemo(() => {
    const names = [...new Set(tasks.map(t => t.assigneeName).filter(Boolean))];
    return names.sort();
  }, [tasks]);

  // 获取唯一的批次列表
  const batchCodeOptions = useMemo(() => {
    const codes = [...new Set(tasks.map(t => t.batchCode).filter(Boolean))];
    return codes.sort();
  }, [tasks]);

  // 过滤后的任务
  const filteredTasks = useMemo(() => {
    return tasks.filter(task => {
      // ========== 特殊状态过滤：pending状态且没有执行人的任务始终隐藏 ==========
      // pending状态表示等待分派执行人，如果没有执行人则说明还没分派
      // 无论什么筛选条件，这类任务都应对所有人隐藏
      if (task.status === 'pending' && !task.assigneeId) {
        return false;
      }

      // 状态筛选
      if (filters.status !== 'all' && task.status !== filters.status) {
        return false;
      }
      // 类型筛选
      if (filters.type !== 'all' && task.type !== filters.type) {
        return false;
      }
      // 区域筛选（如果可用）
      if (filters.area !== 'all' && task.greenhouseName !== filters.area) {
        return false;
      }
      // 执行人筛选
      if (filters.assignee !== 'all' && task.assigneeName !== filters.assignee) {
        return false;
      }
      // 批次筛选
      if (filters.batchCode !== 'all' && task.batchCode !== filters.batchCode) {
        return false;
      }
      return true;
    });
  }, [tasks, filters]);

  // 处理任务详情查看
  const handleViewDetail = useCallback((task: Task) => {
    if (onViewTask) {
      onViewTask(task.id);
    }
  }, [onViewTask]);

  // 处理验收
  const handleAccept = useCallback((task: Task) => {
    if (onAccept) {
      onAccept(task);
    }
  }, [onAccept]);

  // 处理撤回
  const handleWithdraw = useCallback((task: Task) => {
    if (onWithdraw) {
      onWithdraw(task);
    }
  }, [onWithdraw]);

  // 处理取消
  const handleCancel = useCallback((task: Task) => {
    if (onCancel) {
      onCancel(task);
    }
  }, [onCancel]);

  // 处理超时
  const handleOvertime = useCallback((task: Task) => {
    if (onOvertime) {
      onOvertime(task);
    }
  }, [onOvertime]);

  // 处理继续执行
  const handleContinue = useCallback((taskId: string) => {
    if (onContinue) {
      onContinue(taskId);
    }
  }, [onContinue]);

  // 处理重新派发
  const handleReassign = useCallback((task: Task) => {
    if (onReassign) {
      onReassign(task);
    }
  }, [onReassign]);

  // 处理催办
  const handleRemind = useCallback((task: Task) => {
    if (onRemind) {
      onRemind(task);
    }
  }, [onRemind]);

  // 处理选择执行人
  const handleSelectExecutor = useCallback((task: Task) => {
    if (onSelectExecutor) {
      onSelectExecutor(task);
    }
  }, [onSelectExecutor]);

  // 处理发布草稿任务
  const handlePublish = useCallback((task: Task) => {
    if (onPublish) {
      onPublish(task);
    }
  }, [onPublish]);

  // 处理导出确认
  const handleConfirmExport = useCallback(() => {
    if (onExport && selectedIds.length > 0) {
      onExport(selectedIds);
    }
    setToolbarMode('normal');
  }, [onExport, selectedIds]);

  // 处理批量删除确认
  const handleConfirmBatchDelete = useCallback(() => {
    if (onBatchDelete && selectedIds.length > 0) {
      onBatchDelete(selectedIds);
    }
    setToolbarMode('normal');
    onClearSelection();
  }, [onBatchDelete, selectedIds, onClearSelection]);

  // 处理批量派发确认
  const handleConfirmBatchDispatch = useCallback(() => {
    if (onBatchDispatch && selectedIds.length > 0) {
      onBatchDispatch(selectedIds);
    }
    setToolbarMode('normal');
    onClearSelection();
  }, [onBatchDispatch, selectedIds, onClearSelection]);

  // 处理批量验收确认
  const handleConfirmBatchVerify = useCallback(() => {
    if (onBatchVerify && selectedIds.length > 0) {
      onBatchVerify(selectedIds);
    }
    setToolbarMode('normal');
    onClearSelection();
  }, [onBatchVerify, selectedIds, onClearSelection]);

  // 处理全选
  const handleSelectAll = useCallback(() => {
    // 根据当前模式选中对应的任务
    if (toolbarMode === 'normal' || toolbarMode === 'export') {
      // 正常或导出模式：选中所有可见任务
      filteredTasks.forEach(task => {
        if (!selectedIds.includes(task.id)) {
          onToggleSelect(task.id);
        }
      });
    } else if (toolbarMode === 'batchEdit') {
      // 批量编辑模式：选中可编辑的任务（使用常量）
      filteredTasks.forEach(task => {
        if (EDITABLE_STATUSES.includes(task.status)) {
          if (!selectedIds.includes(task.id)) {
            onToggleSelect(task.id);
          }
        }
      });
    } else if (toolbarMode === 'batchDelete') {
      // 批量删除模式：选中可删除的任务（使用常量）
      filteredTasks.forEach(task => {
        if (DELETABLE_STATUSES.includes(task.status)) {
          if (!selectedIds.includes(task.id)) {
            onToggleSelect(task.id);
          }
        }
      });
    } else if (toolbarMode === 'batchDispatch') {
      // 批量派发模式：选中草稿或返工状态的任务
      filteredTasks.forEach(task => {
        if (BATCH_DISPATCH_STATUSES.includes(task.status)) {
          if (!selectedIds.includes(task.id)) {
            onToggleSelect(task.id);
          }
        }
      });
    } else if (toolbarMode === 'batchVerify') {
      // 批量验收模式：选中待验收状态的任务
      filteredTasks.forEach(task => {
        if (BATCH_ACCEPT_STATUSES.includes(task.status)) {
          if (!selectedIds.includes(task.id)) {
            onToggleSelect(task.id);
          }
        }
      });
    }
  }, [filteredTasks, selectedIds, onToggleSelect, toolbarMode]);

  // 切换工具栏模式
  const toggleExportMode = () => {
    setToolbarMode(prev => prev === 'export' ? 'normal' : 'export');
    onClearSelection();
  };

  const toggleBatchEditMode = () => {
    setToolbarMode(prev => prev === 'batchEdit' ? 'normal' : 'batchEdit');
    onClearSelection();
  };

  const toggleBatchDeleteMode = () => {
    setToolbarMode(prev => prev === 'batchDelete' ? 'normal' : 'batchDelete');
    onClearSelection();
  };

  const toggleBatchDispatchMode = () => {
    setToolbarMode(prev => prev === 'batchDispatch' ? 'normal' : 'batchDispatch');
    onClearSelection();
  };

  const toggleBatchVerifyMode = () => {
    setToolbarMode(prev => prev === 'batchVerify' ? 'normal' : 'batchVerify');
    onClearSelection();
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 */}
      <div className="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">状态:</span>
          <select
            value={filters.status}
            onChange={(e) => onFilterChange('status', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]"
          >
            {STATUS_FILTERS.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">类型:</span>
          <select
            value={filters.type}
            onChange={(e) => onFilterChange('type', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
          >
            <option value="all">全部类型</option>
            {FARM_OPERATION_TYPES.map((type) => (
              <option key={type.value} value={type.value}>
                {type.label}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">执行人:</span>
          <select
            value={filters.assignee}
            onChange={(e) => onFilterChange('assignee', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[100px]"
          >
            <option value="all">全部</option>
            {assigneeOptions.map((name) => (
              <option key={name} value={name}>
                {name}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">批次:</span>
          <select
            value={filters.batchCode}
            onChange={(e) => onFilterChange('batchCode', e.target.value)}
            className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]"
          >
            <option value="all">全部批次</option>
            {batchCodeOptions.map((code) => (
              <option key={code} value={code}>
                {code}
              </option>
            ))}
          </select>
        </div>
        <button
          onClick={onResetFilters}
          className="px-3 py-1 text-sm text-gray-500 hover:text-gray-700"
        >
          重置
        </button>
        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-4">
          <button
            onClick={() => setViewMode('list')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'list'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            列表
          </button>
          <button
            onClick={() => setViewMode('calendar')}
            className={`px-3 py-1.5 text-sm rounded-md transition-colors ${
              viewMode === 'calendar'
                ? 'bg-white text-emerald-600 shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            日历
          </button>
        </div>
      </div>

      {/* 视图内容 */}
      {viewMode === 'calendar' ? (
        <CalendarView
          tasks={filteredTasks}
          onSelectTask={(task) => {
            if (onViewTaskInCalendar) {
              onViewTaskInCalendar(task);
            } else if (onViewTask) {
              onViewTask(task.id);
            }
          }}
        />
      ) : (
      /* 使用迁移的 TaskTable 组件 */
      <TaskTable
        tasks={filteredTasks}
        stats={stats}
        currentPage={currentPage}
        pageSize={pageSize}
        // 传递 selectedIds（选中任务ID列表），让 TaskTable 根据 currentPage 和 pageSize 自己计算选中状态
        // 避免翻页后索引错乱的问题
        selectedIds={selectedIds}
        exportMode={toolbarMode === 'export'}
        batchEditMode={toolbarMode === 'batchEdit'}
        batchDeleteMode={toolbarMode === 'batchDelete'}
        batchDispatchMode={toolbarMode === 'batchDispatch'}
        batchVerifyMode={toolbarMode === 'batchVerify'}
        canRemind={canRemind}
        sendReminder={(
          taskId: string,
          taskCode: string,
          assigneeId: string,
          assigneeName: string,
          senderId: string,
          senderName: string
        ) => {
          sendReminder(
            taskId,
            taskCode,
            assigneeId,
            assigneeName,
            senderId,
            senderName
          );
        }}
        onSelectRow={(index) => {
          const task = filteredTasks[index];
          if (task) {
            onToggleSelect(task.id);
          }
        }}
        onSelectAll={handleSelectAll}
        onViewDetail={handleViewDetail}
        onViewSop={onViewSop}
        onAccept={handleAccept}
        onWithdraw={handleWithdraw}
        onCancel={handleCancel}
        onOvertime={handleOvertime}
        onContinue={handleContinue}
        onReassign={handleReassign}
        onSelectExecutor={handleSelectExecutor}
        onPublish={handlePublish}
        isMyTasksView={false}
        onPageChange={setCurrentPage}
        onPageSizeChange={(size) => {
          setPageSize(size);
          setCurrentPage(1);
        }}
        onConfirmExport={handleConfirmExport}
        onCancelExport={toggleExportMode}
        onBatchEdit={toggleBatchEditMode}
        onConfirmBatchEdit={() => {
          if (onBatchEdit && selectedIds.length > 0) {
            onBatchEdit(selectedIds);
          }
          setToolbarMode('normal');
          onClearSelection();
        }}
        onCancelBatchEdit={toggleBatchEditMode}
        onCancelBatchDelete={toggleBatchDeleteMode}
        onBatchDelete={toggleBatchDeleteMode}
        onBatchDispatch={toggleBatchDispatchMode}
        onConfirmBatchDispatch={handleConfirmBatchDispatch}
        onBatchVerify={toggleBatchVerifyMode}
        onConfirmBatchVerify={handleConfirmBatchVerify}
        onExport={toggleExportMode}
        onImport={onImport}
        onCreate={onCreateTask}
      />
      )}
    </div>
  );
}

export default TaskTab;
