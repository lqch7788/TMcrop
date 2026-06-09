/**
 * 临时任务专属表单
 * 简化字段：任务标题、紧急程度、执行人、截止时间
 */

import React, { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { useTasks } from '../../../../hooks/useTasks';
import type { Task } from '../../../../types/task';
import { DispatchMode } from '../../types/dispatch';
import { showAlert } from '@/lib/dialogService';
import { Button } from '@/components/ui';

// 紧急程度选项
const PRIORITY_OPTIONS = [
  { value: 'urgent', label: '紧急' },
  { value: 'high', label: '高' },
  { value: 'normal', label: '普通' },
  { value: 'low', label: '低' },
];

// 执行人选项
const EXECUTOR_OPTIONS = [
  { value: 'W001', label: '萧峰' },
  { value: 'W002', label: '虚竹' },
  { value: 'W003', label: '狄云' },
  { value: 'W004', label: '石破天' },
  { value: 'W005', label: '胡斐' },
  { value: 'W006', label: '袁承志' },
];

export interface TempTaskFormProps {
  task?: Task | null;
  onSave: () => void;
  onCancel: () => void;
}

/**
 * 临时任务表单组件
 */
export const TempTaskForm: React.FC<TempTaskFormProps> = ({
  task,
  onSave,
  onCancel,
}) => {
  const { createTask, updateTask } = useTasks();

  // 表单状态
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [priority, setPriority] = useState<'urgent' | 'high' | 'normal' | 'low'>('normal');
  const [assigneeId, setAssigneeId] = useState('');
  const [assigneeName, setAssigneeName] = useState('');
  const [dueDate, setDueDate] = useState('');

  // 初始化表单数据
  useEffect(() => {
    if (task) {
      setTitle(task.title || '');
      setDescription(task.description || '');
      setPriority((task.priority as 'urgent' | 'high' | 'normal' | 'low') || 'normal');
      setAssigneeId(task.assigneeId || '');
      setAssigneeName(task.assigneeName || '');
      setDueDate(task.dueDate || '');
    }
  }, [task]);

  // 处理执行人选择
  const handleExecutorChange = (value: string) => {
    setAssigneeId(value);
    const executor = EXECUTOR_OPTIONS.find((e) => e.value === value);
    setAssigneeName(executor?.label || value);
  };

  // 处理保存
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    if (!title.trim()) {
      showAlert('请输入任务标题');
      return;
    }

    if (!assigneeId) {
      showAlert('请选择执行人');
      return;
    }

    const taskData = {
      title,
      description,
      priority,
      assigneeId,
      assigneeName,
      dueDate,
    };

    if (task) {
      // 更新任务
      updateTask(task.id, taskData);
    } else {
      // 创建新任务
      createTask(taskData, 'tempTask' as DispatchMode);
    }

    onSave();
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">
          {task ? '编辑临时任务' : '新建临时任务'}
        </h3>
        <button
          onClick={onCancel}
          className="p-1 text-gray-400 hover:text-gray-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="p-6 space-y-6">
        {/* 任务标题 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="请输入任务标题"
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* 第一行：紧急程度 + 执行人 */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              紧急程度
            </label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as typeof priority)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              {PRIORITY_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">
              执行人 <span className="text-red-500">*</span>
            </label>
            <select
              value={assigneeId}
              onChange={(e) => handleExecutorChange(e.target.value)}
              className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
            >
              <option value="">请选择执行人</option>
              {EXECUTOR_OPTIONS.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* 截止日期 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            截止日期
          </label>
          <input
            type="date"
            value={dueDate}
            onChange={(e) => setDueDate(e.target.value)}
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* 任务描述 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            任务描述
          </label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="请输入任务描述..."
            className="w-full px-3 py-2 border border-gray-400 rounded-lg text-sm focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
          />
        </div>

        {/* 操作按钮 */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-gray-200">
          <Button variant="secondary" type="button" onClick={onCancel}>
            取消
          </Button>
          <Button className="bg-orange-600 text-white hover:bg-orange-700" type="submit">
            <Save className="w-4 h-4" />
            保存
          </Button>
        </div>
      </form>
    </div>
  );
};
