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
import { Plus, RotateCcw, Upload } from 'lucide-react';
import { Button } from '@/components/ui';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui';

// 导入迁移的 TaskTable 组件
import { TaskTable } from './components/TaskTable';
import { CalendarView } from './components/CalendarView';
import { EDITABLE_STATUSES, BATCH_DISPATCH_STATUSES, BATCH_REASSIGN_STATUSES, STATUS_OPTIONS } from './constants_taskDispatch';

// 状态配置（从常量文件导入，与 taskDispatch 保持一致）
const STATUS_FILTERS = STATUS_OPTIONS;

// BATCH_DISPATCH_STATUSES 已从 constants_taskDispatch 导入

// 可批量验收的状态：待验收
const BATCH_ACCEPT_STATUSES = ['waiting_acceptance'];

// 工具栏状态类型
type ToolbarMode = 'normal' | 'export' | 'batchEdit' | 'batchDelete' | 'batchDispatch' | 'batchVerify' | 'batchReassign';

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
  onBatchReassign?: (taskIds: string[]) => void;
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
  onBatchReassign,
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

  // 处理批量重派确认
  const handleConfirmBatchReassign = useCallback(() => {
    if (onBatchReassign && selectedIds.length > 0) {
      onBatchReassign(selectedIds);
    }
    setToolbarMode('normal');
    onClearSelection();
  }, [onBatchReassign, selectedIds, onClearSelection]);

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
      // 批量删除模式：选中所有任务（不限制状态）
      filteredTasks.forEach(task => {
        if (!selectedIds.includes(task.id)) {
          onToggleSelect(task.id);
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
    } else if (toolbarMode === 'batchReassign') {
      // 批量重派模式：选中失败/已放弃状态的任务
      filteredTasks.forEach(task => {
        if (BATCH_REASSIGN_STATUSES.includes(task.status)) {
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

  const toggleBatchReassignMode = () => {
    setToolbarMode(prev => prev === 'batchReassign' ? 'normal' : 'batchReassign');
    onClearSelection();
  };

  return (
    <div className="space-y-4">
      {/* 筛选栏 - 水平展开不换行 */}
      <div className="flex flex-nowrap items-center gap-3 overflow-x-auto pb-2">
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-500 whitespace-nowrap">状态:</span>
          <Select
            value={filters.status}
            onValueChange={(val) => onFilterChange('status', val)}
          >
            <SelectTrigger className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]">
              <SelectValue placeholder="全部状态" />
            </SelectTrigger>
            <SelectContent>
              {STATUS_FILTERS.map((status) => (
                <SelectItem key={status.value} value={status.value}>
                  {status.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-500 whitespace-nowrap">类型:</span>
          <Select
            value={filters.type}
            onValueChange={(val) => onFilterChange('type', val)}
          >
            <SelectTrigger className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500">
              <SelectValue placeholder="全部类型" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部类型</SelectItem>
              {FARM_OPERATION_TYPES.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-500 whitespace-nowrap">执行人:</span>
          <Select
            value={filters.assignee}
            onValueChange={(val) => onFilterChange('assignee', val)}
          >
            <SelectTrigger className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[100px]">
              <SelectValue placeholder="全部" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部</SelectItem>
              {assigneeOptions.map((name) => (
                <SelectItem key={name} value={name}>
                  {name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="flex items-center gap-2 flex-shrink-0">
          <span className="text-sm text-gray-500 whitespace-nowrap">批次:</span>
          <Select
            value={filters.batchCode}
            onValueChange={(val) => onFilterChange('batchCode', val)}
          >
            <SelectTrigger className="px-3 py-1.5 text-sm border border-gray-400 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 bg-white min-w-[120px]">
              <SelectValue placeholder="全部批次" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">全部批次</SelectItem>
              {batchCodeOptions.map((code) => (
                <SelectItem key={code || ''} value={code || ''}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <Button
          variant="warning"
          size="sm"
          onClick={onResetFilters}
          className="flex-shrink-0"
        >
          <RotateCcw className="w-4 h-4" /> 重置
        </Button>
        {/* 视图切换 */}
        <div className="flex items-center gap-1 bg-gray-100 rounded-lg p-1 ml-4 flex-shrink-0">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('list')}
            className={`${
              viewMode === 'list'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            列表
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setViewMode('calendar')}
            className={`${
              viewMode === 'calendar'
                ? 'bg-blue-500 text-white shadow-sm'
                : 'text-gray-600 hover:text-gray-900'
            }`}
          >
            日历
          </Button>
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
        tasks={filteredTasks as any}
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
        batchReassignMode={toolbarMode === 'batchReassign'}
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
        onViewDetail={handleViewDetail as any}
        onViewSop={onViewSop as any}
        onAccept={handleAccept as any}
        onWithdraw={handleWithdraw as any}
        onCancel={handleCancel as any}
        onOvertime={handleOvertime as any}
        onContinue={handleContinue as any}
        onReassign={handleReassign as any}
        onSelectExecutor={handleSelectExecutor as any}
        onPublish={handlePublish as any}
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
        onBatchReassign={toggleBatchReassignMode}
        onConfirmBatchReassign={handleConfirmBatchReassign}
        onCancelBatchReassign={toggleBatchReassignMode}
        onConfirmBatchDelete={handleConfirmBatchDelete}
        onExport={toggleExportMode}
        onImport={onImport}
        onCreate={onCreateTask}
      />
      )}
    </div>
  );
}

export default TaskTab;
