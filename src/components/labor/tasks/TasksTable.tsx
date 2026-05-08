import { Calendar, Eye, Edit, Trash2, ChevronLeft, ChevronRight } from 'lucide-react';
import { Task } from '../../../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskModeBadge } from './TaskModeBadge';
import { Button } from '@/components/ui/button';

interface TasksTableProps {
  tasks: Task[];
  currentPage: number;
  pageSize: number;
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows: string[];
  onPageChange: (page: number) => void;
  onPageSizeChange: (size: number) => void;
  onViewTask: (task: Task) => void;
  onEditTask: (task: Task) => void;
  onDeleteTask: (task: Task) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
}

export function TasksTable({
  tasks,
  currentPage,
  pageSize,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onPageChange,
  onPageSizeChange,
  onViewTask,
  onEditTask,
  onDeleteTask,
  onSelectAll,
  onSelectRow,
}: TasksTableProps) {
  const totalPages = Math.ceil(tasks.length / pageSize) || 1;
  const startIndex = (currentPage - 1) * pageSize;
  const endIndex = Math.min(startIndex + pageSize, tasks.length);
  const paginatedTasks = tasks.slice(startIndex, endIndex);

  const allSelected = selectedRows.length === tasks.length && tasks.length > 0;

  // Get selectable rows count based on mode
  const getSelectableCount = () => {
    if (batchEditMode) {
      return tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled').length;
    }
    if (batchDeleteMode) {
      return tasks.filter(t => t.status === 'pending').length;
    }
    return tasks.length;
  };

  const getAllSelectedForMode = () => {
    if (batchEditMode) {
      const selectable = tasks.filter(t => t.status !== 'completed' && t.status !== 'cancelled');
      return selectedRows.length === selectable.length && selectable.length > 0;
    }
    if (batchDeleteMode) {
      const selectable = tasks.filter(t => t.status === 'pending');
      return selectedRows.length === selectable.length && selectable.length > 0;
    }
    return allSelected;
  };

  const getRowSelectable = (task: Task) => {
    if (batchEditMode) {
      return task.status !== 'completed' && task.status !== 'cancelled';
    }
    if (batchDeleteMode) {
      return task.status === 'pending';
    }
    return true;
  };

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <div className="overflow-x-auto overflow-y-auto max-h-[65vh]">
        <table className="w-full min-w-[1400px]">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white sticky top-0 z-10">
            <tr>
              {showCheckbox && (
                <th className="px-3 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={getAllSelectedForMode()}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
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
              <tr
                key={task.id}
                className={`hover:bg-blue-100 transition-colors ${showCheckbox && !getRowSelectable(task) ? 'bg-gray-50' : ''}`}
              >
                {showCheckbox && (
                  <td className="px-3 py-3" onClick={e => e.stopPropagation()}>
                    <input
                      type="checkbox"
                      checked={selectedRows.includes(task.id)}
                      onChange={() => {
                        if (getRowSelectable(task)) {
                          onSelectRow?.(task.id);
                        }
                      }}
                      disabled={!getRowSelectable(task)}
                      className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500 disabled:cursor-not-allowed"
                    />
                  </td>
                )}
                <td className="px-3 py-3 whitespace-nowrap">
                  <button
                    onClick={() => onViewTask(task)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    title="点击查看详情"
                  >
                    {task.taskCode}
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-start gap-2">
                    <TaskModeBadge mode={task.mode} />
                    <div className="max-w-[150px]">
                      <p className="font-medium text-gray-900 text-sm truncate" title={task.title}>{task.title}</p>
                    </div>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700 truncate max-w-[80px] block" title={task.typeName}>{task.typeName}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-500 truncate max-w-[100px] block" title={(task as any).typeRemarks || '-'}>{(task as any).typeRemarks || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700 truncate max-w-[80px] block" title={task.greenhouseName}>{task.greenhouseName}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-700 truncate max-w-[80px] block" title={(task as any).crop || '-'}>{((task as any).crop as string) || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-500 truncate max-w-[100px] block" title={(task as any).cropRemarks || '-'}>{((task as any).cropRemarks as string) || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    <div className="w-6 h-6 rounded-full bg-emerald-100 flex items-center justify-center text-emerald-700 text-xs font-medium flex-shrink-0">
                      {(task.assigneeName || task.assignee || '-').charAt(0)}
                    </div>
                    <span className="text-sm text-gray-700 truncate max-w-[80px] block" title={task.assigneeName || task.assignee || '-'}>{task.assigneeName || task.assignee || '-'}</span>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600 truncate max-w-[90px] block" title={(task as any).planStart || '-'}>{((task as any).planStart as string) || '-'}</span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Calendar className="w-3 h-3 flex-shrink-0" />
                    <span className="truncate max-w-[90px] block" title={task.dueDate}>{task.dueDate}</span>
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
                  <span className="text-sm text-gray-600 truncate max-w-[120px] block" title={(task as any).materials?.length > 0 ? (task as any).materials.map((m: any) => m.name).join(', ') : '-'}>
                    {(task as any).materials?.length > 0 ? (task as any).materials.map((m: any) => m.name).join(', ') : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className="text-sm text-gray-600 truncate max-w-[120px] block" title={(task as any).tools?.length > 0 ? (task as any).tools.map((t: any) => t.name).join(', ') : '-'}>
                    {(task as any).tools?.length > 0 ? (task as any).tools.map((t: any) => t.name).join(', ') : '-'}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onEditTask(task)}
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => onDeleteTask(task)}
                      title="删除"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 空状态 */}
      {tasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          没有找到符合条件的任务
        </div>
      )}

      {/* Selection footer */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <Button variant="ghost" size="sm" onClick={onSelectAll}>
              {getAllSelectedForMode() ? '全不选' : '全选'}
            </Button>
            <span className="text-sm text-gray-500">
              已选择 {selectedRows.length} 项
              {batchEditMode && '（进行中/已完成状态不可编辑）'}
              {batchDeleteMode && '（仅待执行状态可删除）'}
            </span>
          </div>
        </div>
      )}

      {/* 分页 */}
      <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
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
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.max(1, currentPage - 1))}
            disabled={currentPage === 1}
          >
            &lt;
          </Button>
          <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
          <Button
            variant="ghost"
            size="icon"
            onClick={() => onPageChange(Math.min(totalPages, currentPage + 1))}
            disabled={currentPage >= totalPages}
          >
            &gt;
          </Button>
        </div>
      </div>
    </div>
  );
}

export default TasksTable;