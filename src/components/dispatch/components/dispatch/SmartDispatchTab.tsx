/**
 * 智能派工Tab组件
 * 包含智能派工专属表格和表单，显示推荐执行人和评分
 */

import React, { useState, useMemo } from 'react';
import { Plus, Search, Send, Edit2, Sparkles, Eye } from 'lucide-react';
import { useTasks } from '../../../../hooks/useTasks';
import { SmartTaskTable } from './SmartTaskTable';
import { SmartTaskForm } from './SmartTaskForm';
import { TaskDetailModal } from '../modals/TaskDetailModal';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import type { Task, TaskStatus, TaskRecord } from '../../../../types/task';

/**
 * 智能派工Tab组件
 */
export const SmartDispatchTab: React.FC = () => {
  const { unifiedTasks, publishTask, getTaskRecordsByTaskId } = useTasks();

  // 搜索和筛选状态
  const [searchText, setSearchText] = useState('');
  const [statusFilter, setStatusFilter] = useState<TaskStatus | 'all'>('all');
  const [showForm, setShowForm] = useState(false);
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [selectedRows, setSelectedRows] = useState<number[]>([]);

  // 详情弹窗状态
  const [viewingTask, setViewingTask] = useState<Task | null>(null);
  const [viewingTaskRecords, setViewingTaskRecords] = useState<TaskRecord[]>([]);

  // 筛选智能派工数据（只显示dispatchMode='smart'的任务）
  const smartTasks = useMemo(() => {
    return unifiedTasks.filter((task) => task.dispatchMode === 'smart');
  }, [unifiedTasks]);

  // 应用搜索和状态筛选
  const filteredTasks = useMemo(() => {
    return smartTasks.filter((task) => {
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
  }, [smartTasks, searchText, statusFilter]);

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
        <SmartTaskForm
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
                  placeholder="搜索任务..."
                  value={searchText}
                  onChange={(e) => setSearchText(e.target.value)}
                  className="pl-10 pr-4 py-2 border border-gray-300 rounded-lg w-64 text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
                />
              </div>

              {/* 状态筛选 */}
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as TaskStatus | 'all')}
                className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-2 focus:ring-purple-500 focus:border-purple-500"
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
              <button
                onClick={handleCreate}
                className="flex items-center gap-2 px-4 py-2 bg-purple-600 text-white rounded-lg text-sm font-medium hover:bg-purple-700 transition-colors"
              >
                <Sparkles className="w-4 h-4" />
                新建智能派工
              </button>
            </div>
          </div>

          {/* 表格 */}
          <SmartTaskTable
            tasks={filteredTasks}
            selectedRows={selectedRows}
            onRowSelect={handleRowSelect}
            onSelectAll={handleSelectAll}
            onView={handleView}
            onEdit={handleEdit}
            onPublish={handlePublish}
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
