/**
 * 临时任务专属表格
 * 字段：任务编号、任务标题、紧急程度、执行人、派发人、状态、截止时间、创建时间、操作
 */

import React from 'react';
import { Edit2, Trash2, Send, Eye } from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import type { Task } from '../../../../types/task';
import { showConfirm } from '@/lib/dialogService';

/**
 * 优先级样式配置
 */
const PRIORITY_STYLES: Record<string, { bg: string; text: string }> = {
  urgent: { bg: 'bg-red-100', text: 'text-red-700' },
  high: { bg: 'bg-orange-100', text: 'text-orange-700' },
  normal: { bg: 'bg-blue-100', text: 'text-blue-700' },
  low: { bg: 'bg-gray-100', text: 'text-gray-700' },
};

/**
 * 优先级标签
 */
const PRIORITY_LABELS: Record<string, string> = {
  urgent: '紧急',
  high: '高',
  normal: '普通',
  low: '低',
};

export interface TempTaskTableProps {
  tasks: Task[];
  selectedRows: number[];
  onRowSelect: (index: number) => void;
  onSelectAll: () => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void; // 查看详情
  onPublish: (taskId: string) => void;
  onDelete: (taskId: string) => void;
}

/**
 * 临时任务表格组件
 */
export const TempTaskTable: React.FC<TempTaskTableProps> = ({
  tasks,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onEdit,
  onView,
  onPublish,
  onDelete,
}) => {
  // 可编辑状态列表
  const EDITABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'rejected'];

  // 可派发状态列表
  const PUBLISHABLE_STATUSES = ['draft'];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无临时任务</p>
        <p className="text-sm mt-1">点击「新建临时任务」创建第一条临时任务</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gray-50">
          <tr>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <input
                type="checkbox"
                checked={selectedRows.length === tasks.length}
                onChange={onSelectAll}
                className="rounded border-gray-400"
              />
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              任务编号
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              任务标题
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              紧急程度
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              执行人
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              派发人
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              截止时间
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              创建时间
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              操作
            </th>
          </tr>
        </thead>
        <tbody className="bg-white divide-y divide-gray-200">
          {tasks.map((task, index) => {
            const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG] || {
              label: task.status,
              bg: 'bg-gray-100',
              color: 'text-gray-600',
            };
            const priorityStyle = PRIORITY_STYLES[task.priority || 'normal'] || PRIORITY_STYLES.normal;

            return (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 ${
                  selectedRows.includes(index) ? 'bg-blue-50' : ''
                }`}
              >
                <td className="px-3 py-3">
                  <input
                    type="checkbox"
                    checked={selectedRows.includes(index)}
                    disabled={!EDITABLE_STATUSES.includes(task.status)}
                    onChange={() => onRowSelect(index)}
                    className="rounded border-gray-400"
                  />
                </td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">
                  {task.taskCode}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  {task.title}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${priorityStyle.bg} ${priorityStyle.text}`}
                  >
                    {PRIORITY_LABELS[task.priority || 'normal']}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.assigneeName || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.assignerName || (task as any).assignerName || '-'}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.dueDate || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(task)}
                      className="p-1 text-gray-400 hover:text-blue-600"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(task)}
                      disabled={!EDITABLE_STATUSES.includes(task.status)}
                      className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onPublish(task.id)}
                      disabled={!PUBLISHABLE_STATUSES.includes(task.status)}
                      className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="派发"
                    >
                      <Send className="w-4 h-4" />
                    </button>
                    <button
                      onClick={async () => {
                        if (await showConfirm('确定要删除吗？')) {
                          onDelete(task.id);
                        }
                      }}
                      className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
