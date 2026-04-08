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
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      {/* 表格标题栏 */}
      <div className="p-4 border-b border-gray-100 flex items-center justify-between">
        <h3 className="text-lg font-semibold text-gray-900">任务列表</h3>
      </div>

      <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务编号</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务标题</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">任务类型</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">类型备注</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作业区域</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">作物备注</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">执行人</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划开始</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">计划结束</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计天数</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">预计小时</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">工作制</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">优先级</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需物资</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">所需工具</th>
              <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {paginatedTasks.map((task) => (
              <tr key={task.id} className="hover:bg-blue-100 transition-colors">
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-900">{task.taskCode}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <TaskModeBadge mode={task.mode} />
                    <div>
                      <p className="font-medium text-gray-900 text-sm">{task.title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{task.typeName}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{(task as any).typeRemarks || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{task.greenhouseName}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700">{(task as any).crop || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-500">{(task as any).cropRemarks || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium">
                      {task.assigneeName.charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700">{task.assigneeName}</span>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{(task as any).planStart || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-3 h-3" />
                    {task.dueDate}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{(task as any).estimatedDays || 0}天</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{(task as any).estimatedHours || task.workDuration}小时</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">{(task as any).workHoursPerDay || 8}时/天</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <TaskPriorityBadge priority={task.priority} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <TaskStatusBadge status={task.status} />
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {(task as any).materials?.length > 0
                      ? (task as any).materials.map((m: any) => m.name).join(', ')
                      : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600">
                    {(task as any).tools?.length > 0
                      ? (task as any).tools.map((t: any) => t.name).join(', ')
                      : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
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

      {/* 分页 */}
      <div className="flex items-center justify-between mt-4 px-4 pb-4">
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>每页</span>
          <select
            value={pageSize}
            onChange={(e) => onPageSizeChange(Number(e.target.value))}
            className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
          >
            <option value={10}>10条</option>
            <option value={20}>20条</option>
            <option value={50}>50条</option>
          </select>
        </div>
        <div className="flex items-center gap-2 text-sm text-gray-500">
          <span>共 {tasks.length} 条</span>
          <button
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &lt;
          </button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <button
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
            className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            &gt;
          </button>
        </div>
      </div>
    </div>
  );
}

export default TasksTable;
