/**
 * 农事任务Tab组件
 * 包含农事任务专属表格和表单
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Filter, Download, RefreshCw, Edit2, Trash2, Send, Eye } from 'lucide-react';
import { useTasks } from '../../../../hooks/useTasks';
import { FarmTaskTable } from './FarmTaskTable';
import { FarmTaskForm } from './FarmTaskForm';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import type { Task, TaskStatus, TaskRecord } from '../../../../types/task';
import { useAuthPermission } from '../../../../hooks/usePermission';

/**
 * 农事任务Tab组件
 */
export const FarmDispatchTab: React.FC = () => {
  const { unifiedTasks, publishTask, updateTask, deleteTask, getTaskRecordsByTaskId } = useTasks();

  // 权限检查
  const { can } = useAuthPermission();
  const canCreate = can('PROC_DISPATCH', 'create');
  const canEdit = can('PROC_DISPATCH', 'edit');
  const canDelete = can('PROC_DISPATCH', 'delete');
  const canPublish = can('PROC_DISPATCH', 'publish');

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 详情弹窗状态
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [viewingTaskRecords, setViewingTaskRecords] = useState<TaskRecord[]>([]);

  // 筛选农事任务数据（只显示dispatchMode='farm'的任务）
  const farmTasks = useMemo(() => {
    return unifiedTasks.filter((task) => task.dispatchMode === 'farm');
  }, [unifiedTasks]);

  // 应用搜索和状态筛选
  const filteredTasks = useMemo(() => {
    return farmTasks.filter((task) => {
      // 搜索过滤
      if (searchText) {
        const searchLower = searchText.toLowerCase();
        const matchSearch =
          task.title?.toLowerCase().includes(searchLower) ||
          task.taskCode?.toLowerCase().includes(searchLower) ||
          task.assigneeName?.toLowerCase().includes(searchLower) ||
          task.greenhouseName?.toLowerCase().includes(searchLower);
        if (!matchSearch) return false;
      }

      // 状态过滤
      if (statusFilter !== 'all' && task.status !== statusFilter) {
        return false;
      }

      return true;
    });
  }, [farmTasks, searchText, statusFilter]);

  // 处理新建
  const handleCreate = () => {
    setEditingTask(null);
    setShowForm(true);
  };

  // 处理查看详情
  const handleView = (task: Task) => {
    const records = getTaskRecordsByTaskId(task.id);
    setViewingTaskRecords(records);
    setViewingTask(task);
  };

  // 处理详情弹窗关闭
  const handleViewClose = () => {
    setViewingTask(null);
    setViewingTaskRecords([]);
  };

  // 处理编辑
  const handleEdit = (task: Task) => {
    setEditingTask(task);
    setShowForm(true);
  };

  // 处理派发
  const handlePublish = (taskId: string) => {
    publishTask(taskId);
  };

  // 处理删除
  const handleDelete = (taskId: string) => {
    if (window.confirm('确定要删除这个任务吗？')) {
      deleteTask(taskId);
    }
  };

  // 处理表单保存
  const handleFormSave = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  // 处理表单取消
  const handleFormCancel = () => {
    setShowForm(false);
    setEditingTask(null);
  };

  // 批量选择
  const handleRowSelect = (index: number) => {
    setSelectedRows((prev) =>
      prev.includes(index)
        ? prev.filter((i) => i !== index)
        : [...prev, index]
    );
  };

  // 全选
  const handleSelectAll = () => {
    if (selectedRows.length === filteredTasks.length) {
      setSelectedRows([]);
    } else {
      setSelectedRows(filteredTasks.map((_, i) => i));
    }
  };

  return (
    <div className="space-y-4">
      {showForm ? (
        // 显示表单
        <FarmTaskForm
          task={editingTask}
          onSave={handleFormSave}
          onCancel={handleFormCancel}
        />
      ) : (
        // 显示列表
        <>
          {/* 工具栏 */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              {/* 搜索 */}
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="搜索任务编号、标题、执行人..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                />
              </div>

              {/* 状态筛选 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
              >
                <option value="all">全部状态</option>
                {Object.entries(TASK_STATUS_CONFIG).map(([key, config]) => (
                  <option key={key} value={key}>
                    {config.label}
                  </option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              {canCreate && (
                <button
                  onClick={handleCreate}
                  className="flex items-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  新建任务
                </button>
              )}
            </div>
          </div>

          {/* 表格 */}
          <FarmTaskTable
            tasks={filteredTasks}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onView={handleView}
            onEdit={handleEdit}
            onPublish={handlePublish}
            onDelete={handleDelete}
            canCreate={canCreate}
            canEdit={canEdit}
            canDelete={canDelete}
            canPublish={canPublish}
          />

          {/* 分页信息 */}
          <div className="flex items-center justify-between text-sm text-gray-500">
            <span>
              共 {filteredTasks.length} 条任务，
              已选择 {selectedRows.length} 项
            </span>
          </div>
        </>
      )}

      {/* 详情弹窗 */}
      {viewingTask && (
        <TaskDetailModal
          task={viewingTask}
          taskRecords={viewingTaskRecords}
          onClose={handleViewClose}
        />
      )}
    </div>
  );
};
