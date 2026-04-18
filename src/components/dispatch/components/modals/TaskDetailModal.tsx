/**
 * 任务详情弹窗组件
 * 展示任务详情和完整的流转记录
 */

import React from 'react';
import { X } from 'lucide-react';
import { TaskDetail } from '../shared/TaskDetail';
import type { Task, TaskRecord } from '../../../../types/task';

interface TaskDetailModalProps {
  task: Task | null;
  taskRecords: TaskRecord[];
  onClose: () => void;
}

/**
 * 任务详情弹窗组件
 */
export const TaskDetailModal: React.FC<TaskDetailModalProps> = ({ task, taskRecords, onClose }) => {
  if (!task) return null;

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto">
      {/* 背景遮罩 */}
      <div
        className="fixed inset-0 bg-black bg-opacity-50 transition-opacity"
        onClick={onClose}
      />

      {/* 弹窗内容 */}
      <div className="flex min-h-full items-center justify-center p-4">
        <div className="relative w-full max-w-2xl max-h-[90vh] overflow-hidden rounded-xl bg-white shadow-2xl">
          {/* 关闭按钮 */}
          <button
            onClick={onClose}
            className="absolute right-4 top-4 z-10 p-1 text-gray-400 hover:text-gray-600 bg-white rounded-full shadow"
          >
            <X className="w-5 h-5" />
          </button>

          {/* 详情内容 */}
          <div className="overflow-y-auto max-h-[90vh] p-6">
            <TaskDetail
              task={task}
              taskRecords={taskRecords}
              onClose={onClose}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
