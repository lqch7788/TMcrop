import { Calendar, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskModeBadge } from './TaskModeBadge';

interface TasksTableProps {
  tasks: Task[];
  currentPage: number;
  pageSize: number;
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
}

export function TasksTable({
  tasks,
  currentPage,
  pageSize,
  onPageChange,
  onPageSizeChange,
  onViewTask,
  onEditTask,
  onDeleteTask,
}: TasksTableProps) {
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, tasks.length);
  const paginatedTasks = tasks.slice(startIndex, endIndex);

  return (
    <div className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
        <table className="w-full min-w-[1400px]">
          <thead className="sticky top-0 z-10">
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-3 py-3">任务编号</th>
              <th className="px-3 py-3">任务标题</th>
              <th className="px-3 py-3">任务类型</th>
              <th className="px-3 py-3">类型备注</th>
              <th className="px-3 py-3">作业区域</th>
              <th className="px-3 py-3">作物</th>
              <th className="px-3 py-3">作物备注</th>
              <th className="px-3 py-3">执行人</th>
              <th className="px-3 py-3">计划开始</th>
              <th className="px-3 py-3">计划结束</th>
              <th className="px-3 py-3">预计天数</th>
              <th className="px-3 py-3">预计小时</th>
              <th className="px-3 py-3">工作制</th>
              <th className="px-3 py-3">优先级</th>
              <th className="px-3 py-3">状态</th>
              <th className="px-3 py-3">所需物资</th>
              <th className="px-3 py-3">所需工具</th>
              <th className="px-3 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {paginatedTasks.map((task) => (
              <tr key={task.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-900">{task.taskCode}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-start gap-2">
                    <TaskModeBadge mode={task.mode} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-700">{task.typeName}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-500">{(task as any).typeRemarks || '-'}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-700">{task.greenhouseName}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-700">{(task as any).crop || '-'}</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-500">{(task as any).cropRemarks || '-'}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                      {task.assigneeName.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{task.assigneeName}</span>
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">{(task as any).planStart || '-'}</span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate}
                  </div>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">{(task as any).estimatedDays || 0}天</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">{(task as any).estimatedHours || task.workDuration}小时</span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">{(task as any).workHoursPerDay || 8}时/天</span>
                </td>
                <td className="px-3 py-3">
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td className="px-3 py-3">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">
                    {(task as any).materials?.length > 0
                      ? (task as any).materials.map((m: any) => m.name).join(', ')
                      : '-'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <span className="text-sm text-gray-600">
                    {(task as any).tools?.length > 0
                      ? (task as any).tools.map((t: any) => t.name).join(', ')
                      : '-'}
                  </span>
                </td>
                <td className="px-3 py-3">
                  <div className="flex items-center gap-1">
                    <button
                      onClick={() => onViewTask(task)}
                      className="p-1.5 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded transition-colors"
                      title="查看详情"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => onDeleteTask(task)}
                      className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded transition-colors"
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* Pagination */}
      <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">每页</span>
          <select
            value={pageSize}
            onChange={(e) => { onPageSizeChange(Number(e.target.value)); onPageChange(1); }}
            className="px-2 py-1 border border-gray-200 rounded text-sm"
          >
            <option value={10}>10</option>
            <option value={20}>20</option>
            <option value={50}>50</option>
          </select>
          <span className="text-sm text-gray-500">条</span>
        </div>
        <div className="flex items-center gap-2">
          <span className="text-sm text-gray-500">共 {tasks.length} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm">{currentPage} / {totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="p-1.5 rounded hover:bg-gray-100 disabled:opacity-50"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
}

export default TasksTable;
