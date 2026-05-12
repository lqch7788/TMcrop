/**
 * 农事任务专属表格
 * 字段：任务编号、任务标题、温室、农事类型、执行人、派发人、状态、紧急程度、创建时间、操作
 */

import React from 'react';
import { Edit2, Trash2, Send, Eye } from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import type { Task } from '../../../../types/task';

/**
 * 农事任务表格组件 Props
 */
export interface FarmTaskTableProps {
  tasks: Task[];
  selectedRows: number[];
  onRowSelect: (index: number) => void;
  onSelectAll: () => void;
  onEdit: (task: Task) => void;
  onView: (task: Task) => void; // 查看详情
  onPublish: (taskId: string) => void;
  onDelete: (taskId: string) => void;
  // 权限控制
  canCreate?: boolean;
  canEdit?: boolean;
  canDelete?: boolean;
  canPublish?: boolean;
}

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

/**
 * 农事任务表格组件
 */
export const FarmTaskTable: React.FC<FarmTaskTableProps> = ({
  tasks,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onEdit,
  onView,
  onPublish,
  onDelete,
  canCreate = true,
  canEdit = true,
  canDelete = true,
  canPublish = true,
}) => {
  // 可编辑状态列表
  const EDITABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'rejected'];

  // 可删除状态列表（所有状态都可以删除）
  const DELETABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'completed', 'rejected', 'failed', 'cancelled', 'abandoned'];

  // 可派发状态列表
  const PUBLISHABLE_STATUSES = ['draft'];

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无农事任务</p>
        <p className="text-sm mt-1">点击「新建任务」创建第一条农事任务</p>
      </div>
    );
  }

  return (
    <div className="overflow-x-auto">
      <table className="min-w-full divide-y divide-gray-200">
        <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
          <tr>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
              <input
                type="checkbox"
                checked={selectedRows.length === tasks.length}
                onChange={onSelectAll}
                className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
              />
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              任务编号
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              任务标题
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              温室
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              农事类型
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              执行人
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              状态
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              紧急程度
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              物资
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
              创建时间
            </th>
            <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">
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
            const priorityStyle = PRIORITY_STYLES[task.priority || 'normal'];

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
                    className="rounded border-gray-300"
                  />
                </td>
                <td className="px-3 py-3 text-sm font-medium text-gray-900">
                  {task.taskCode}
                </td>
                <td className="px-3 py-3 text-sm text-gray-900">
                  {task.title}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.greenhouseName || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.typeName || '-'}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.assigneeName || '-'}
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${statusConfig.bg} ${statusConfig.color}`}
                  >
                    {statusConfig.label}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span
                    className={`inline-flex px-2 py-1 text-xs font-medium rounded ${priorityStyle.bg} ${priorityStyle.text}`}
                  >
                    {PRIORITY_LABELS[task.priority || 'normal']}
                  </span>
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.materials && task.materials.length > 0 ? (
                    <span className="text-orange-600" title={task.materials.map(m => `${m.name}×${m.qty}${m.unit}`).join(', ')}>
                      {task.materials.length}种物资
                    </span>
                  ) : '-'}
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
                    {canEdit && (
                      <button
                        onClick={() => onEdit(task)}
                        disabled={!EDITABLE_STATUSES.includes(task.status)}
                        className="p-1 text-gray-400 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="编辑"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                    )}
                    {canPublish && (
                      <button
                        onClick={() => onPublish(task.id)}
                        disabled={!PUBLISHABLE_STATUSES.includes(task.status)}
                        className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="派发"
                      >
                        <Send className="w-4 h-4" />
                      </button>
                    )}
                    {canDelete && (
                      <button
                        onClick={() => {
                          if (window.confirm('确定要删除吗？')) {
                            onDelete(task.id);
                          }
                        }}
                        disabled={!DELETABLE_STATUSES.includes(task.status)}
                        className="p-1 text-gray-400 hover:text-red-600 disabled:opacity-50 disabled:cursor-not-allowed"
                        title="删除"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
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
