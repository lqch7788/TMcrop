/**
 * 智能派工专属表格
 * 字段：任务编号、任务标题、推荐执行人、推荐评分、温室、执行人、状态、创建时间、操作
 */

import React from 'react';
import { Edit2, Send, Eye } from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import type { Task } from '../../../../types/task';
// ★ 排班联动：派发后同步 schedule 行
import { useDispatchScheduleBridge } from '../../../../hooks/useDispatchScheduleBridge';

/**
 * 推荐评分样式
 */
const getScoreStyle = (score: number): { bg: string; text: string } => {
  if (score >= 80) return { bg: 'bg-green-100', text: 'text-green-700' };
  if (score >= 60) return { bg: 'bg-blue-100', text: 'text-blue-700' };
  if (score >= 40) return { bg: 'bg-orange-100', text: 'text-orange-700' };
  return { bg: 'bg-gray-100', text: 'text-gray-700' };
};

export interface SmartTaskTableProps {
  tasks: Task[];
  selectedRows: number[];
  onRowSelect: (index: number) => void;
  onSelectAll: () => void;
  onView: (task: Task) => void; // 查看详情
  onEdit: (task: Task) => void;
  onPublish: (taskId: string) => void;
}

/**
 * 智能派工表格组件
 */
export const SmartTaskTable: React.FC<SmartTaskTableProps> = ({
  tasks,
  selectedRows,
  onRowSelect,
  onSelectAll,
  onView,
  onEdit,
  onPublish,
}) => {
  // 可编辑状态列表
  const EDITABLE_STATUSES = ['draft', 'pending', 'accepted', 'in_progress', 'waiting_acceptance', 'rejected'];

  // 可派发状态列表
  const PUBLISHABLE_STATUSES = ['draft'];

  // ★ 排班联动 hook：派发成功后 fire-and-forget 同步 schedule 行
  const { syncAfterDispatch } = useDispatchScheduleBridge();

  if (tasks.length === 0) {
    return (
      <div className="text-center py-12 text-gray-500">
        <p>暂无智能派工任务</p>
        <p className="text-sm mt-1">点击「新建智能派工」创建第一条智能派工任务</p>
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
              推荐执行人
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              推荐评分
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              温室
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              执行人
            </th>
            <th className="px-3 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              状态
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

            // 从任务中获取推荐信息
            const recommendedExecutorName = (task as any).recommendedExecutorName || '-';
            const recommendScore = (task as any).recommendScore || 0;
            const scoreStyle = getScoreStyle(recommendScore);

            return (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 ${
                  selectedRows.includes(index) ? 'bg-purple-50' : ''
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
                <td className="px-3 py-3 text-sm text-purple-600 font-medium">
                  {recommendedExecutorName}
                </td>
                <td className="px-3 py-3">
                  {recommendScore > 0 ? (
                    <span
                      className={`inline-flex px-2 py-1 text-xs font-medium rounded ${scoreStyle.bg} ${scoreStyle.text}`}
                    >
                      {recommendScore}
                    </span>
                  ) : (
                    <span className="text-gray-400">-</span>
                  )}
                </td>
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.greenhouseName || '-'}
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
                <td className="px-3 py-3 text-sm text-gray-500">
                  {task.createdAt ? new Date(task.createdAt).toLocaleDateString('zh-CN') : '-'}
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onView(task)}
                      className="p-1 text-gray-400 hover:text-purple-600"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEdit(task)}
                      disabled={!EDITABLE_STATUSES.includes(task.status)}
                      className="p-1 text-gray-400 hover:text-purple-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="编辑"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => {
                        onPublish(task.id);
                        // ★ 排班联动：派发成功后副作用（SmartTask 走 farm source；workerId 可能为空，patch 失败由 toast 兜底）
                        void syncAfterDispatch(
                          { source: 'farm', sourceId: task.id },
                          task.assigneeId || '',
                          { taskPlanDate: (task as any).planStart || task.dueDate }
                        );
                      }}
                      disabled={!PUBLISHABLE_STATUSES.includes(task.status)}
                      className="p-1 text-gray-400 hover:text-green-600 disabled:opacity-50 disabled:cursor-not-allowed"
                      title="派发"
                    >
                      <Send className="w-4 h-4" />
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
