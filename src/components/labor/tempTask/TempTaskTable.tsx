import { AlertTriangle, MapPin, User, Clock, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { TempTask, TEMP_TASK_URGENCY_CONFIG } from '../../../types';

const statusConfig = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-50' },
  pending: { label: '待执行', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
};

interface TempTaskTableProps {
  tasks: TempTask[];
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows: string[];
  onViewTask: (task: TempTask) => void;
  onEditTask: (task: TempTask) => void;
  onStartTask: (task: TempTask) => void;
  onCompleteTask: (task: TempTask) => void;
  onSelectAll?: () => void;
  onSelectRow?: (id: string) => void;
  pagination?: {
    currentPage: number;
    pageSize: number;
    total: number;
    onPageChange: (page: number) => void;
    onPageSizeChange?: (size: number) => void;
  };
}

export function TempTaskTable({
  tasks,
  showCheckbox = false,
  exportMode = false,
  batchEditMode = false,
  batchDeleteMode = false,
  selectedRows = [],
  onViewTask,
  onEditTask,
  onStartTask,
  onCompleteTask,
  onSelectAll,
  onSelectRow,
  pagination,
}: TempTaskTableProps) {
  const currentPage = pagination?.currentPage || 1;
  const pageSize = pagination?.pageSize || 10;
  const totalPages = Math.ceil((pagination?.total || tasks.length) / pageSize) || 1;

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

  const getRowSelectable = (task: TempTask) => {
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
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-blue-500 to-blue-600 text-white">
            <tr>
              {showCheckbox && (
                <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={getAllSelectedForMode()}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务编号</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">任务名称</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">类型</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">工作地点</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">负责人</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">截止日期</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">紧急程度</th>
              <th className="px-4 py-3 text-left text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`hover:bg-blue-100 transition-colors ${task.urgency === 'critical' ? 'bg-red-50' : ''} ${showCheckbox && !getRowSelectable(task) ? 'bg-gray-50' : ''}`}
                onClick={() => onViewTask(task)}
              >
                {showCheckbox && (
                  <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
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
                <td className="px-4 py-3 whitespace-nowrap">
                  <button
                    onClick={() => onViewTask(task)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    title="点击查看详情"
                  >
                    {task.taskCode}
                  </button>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {task.urgency === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span className="font-medium text-gray-900">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600 whitespace-nowrap">{task.tempTaskType}</td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.workLocation}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.assigneeName}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.dueDate}
                  </div>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
                    {statusConfig[task.status].label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${TEMP_TASK_URGENCY_CONFIG[task.urgency].badge}`}>
                    {TEMP_TASK_URGENCY_CONFIG[task.urgency].label}
                  </span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => onEditTask(task)}
                      className="p-1.5 text-gray-400 hover:text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      title="编辑"
                    >
                      <Edit className="w-4 h-4" />
                    </button>
                    {task.status === 'pending' && (
                      <button
                        onClick={() => onStartTask(task)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 hover:bg-blue-50 rounded transition-colors"
                      >
                        开始
                      </button>
                    )}
                    {task.status === 'in_progress' && (
                      <button
                        onClick={() => onCompleteTask(task)}
                        className="px-3 py-1 text-xs font-medium text-green-600 hover:bg-green-50 rounded transition-colors"
                      >
                        完成
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {tasks.length === 0 && (
        <div className="p-8 text-center text-gray-500">
          没有找到符合条件的临时任务
        </div>
      )}

      {/* Selection footer */}
      {showCheckbox && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100 bg-gray-50">
          <div className="flex items-center gap-4">
            <button onClick={onSelectAll} className="text-sm text-emerald-600 hover:text-emerald-700 font-medium">
              {getAllSelectedForMode() ? '全不选' : '全选'}
            </button>
            <span className="text-sm text-gray-500">
              已选择 {selectedRows.length} 项
              {batchEditMode && '（进行中/已完成状态不可编辑）'}
              {batchDeleteMode && '（仅待执行状态可删除）'}
            </span>
          </div>
        </div>
      )}

      {/* Pagination */}
      {pagination && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-gray-100">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">每页</span>
            <select
              value={pageSize}
              onChange={(e) => pagination.onPageSizeChange?.(Number(e.target.value))}
              className="h-8 px-2 border border-gray-200 rounded text-sm focus:outline-none focus:border-emerald-500"
            >
              <option value={10}>10条</option>
              <option value={20}>20条</option>
              <option value={50}>50条</option>
            </select>
          </div>
          <div className="flex items-center gap-2 text-sm text-gray-500">
            <span>共 {pagination.total} 条</span>
            <button
              onClick={() => pagination.onPageChange(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &lt;
            </button>
            <span className="text-sm font-medium text-emerald-600">{currentPage}/{totalPages}</span>
            <button
              onClick={() => pagination.onPageChange(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage >= totalPages}
              className="w-8 h-8 flex items-center justify-center text-gray-500 hover:text-gray-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
            >
              &gt;
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

export default TempTaskTable;