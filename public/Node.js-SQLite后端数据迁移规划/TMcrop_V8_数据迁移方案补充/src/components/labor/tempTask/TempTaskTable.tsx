import { AlertTriangle, MapPin, User, Clock, Eye, Edit, ChevronLeft, ChevronRight } from 'lucide-react';
import { TempTask, TEMP_TASK_URGENCY_CONFIG } from '../../../types';
import { getTaskOverdueStatus, getTaskOverdueDesc } from '../../../hooks/useTempTasks';

const statusConfig = {
  draft: { label: '草稿', color: 'text-gray-600', bg: 'bg-gray-50' },
  pending: { label: '待执行', color: 'text-amber-600', bg: 'bg-amber-50' },
  accepted: { label: '已接受', color: 'text-teal-600', bg: 'bg-teal-50' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50' },
  waiting_acceptance: { label: '待验收', color: 'text-orange-600', bg: 'bg-orange-50' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
  rejected: { label: '已驳回', color: 'text-red-600', bg: 'bg-red-50' },
  pending_reassign: { label: '待重新派发', color: 'text-purple-600', bg: 'bg-purple-50' },
};

// 必填反馈配置
const FEEDBACK_CONFIG: Record<string, { label: string; icon: string }> = {
  workload_confirm: { label: '工作量', icon: '📊' },
  gps: { label: '位置', icon: '📍' },
  material: { label: '物资', icon: '📦' },
  photo_before: { label: '前照', icon: '📷' },
  photo_after: { label: '后照', icon: '📷' },
  voice: { label: '语音', icon: '🎤' },
};

// 渲染必填反馈标签
function renderFeedbackTags(feedbacks: string[] = []) {
  if (feedbacks.length === 0) {
    return <span className="text-gray-400 text-xs">无</span>;
  }
  return (
    <div className="flex flex-wrap gap-1 justify-center">
      {feedbacks.map(fb => {
        const config = FEEDBACK_CONFIG[fb];
        return config ? (
          <span
            key={fb}
            className="px-1.5 py-0.5 bg-emerald-100 text-emerald-700 text-xs rounded flex items-center gap-0.5"
            title={config.label}
          >
            {config.icon} {config.label}
          </span>
        ) : null;
      })}
    </div>
  );
}

interface TempTaskTableProps {
  tasks: TempTask[];
  showCheckbox?: boolean;
  exportMode?: boolean;
  batchEditMode?: boolean;
  batchDeleteMode?: boolean;
  selectedRows: string[];
  onViewTask: (task: TempTask) => void;
  onEditTask: (task: TempTask) => void;
  onStartTask?: (task: TempTask) => void;
  onSubmitComplete?: (task: TempTask) => void;
  onAccept?: (task: TempTask) => void;
  onWithdraw?: (task: TempTask) => void;
  onCancel?: (task: TempTask) => void;
  onReassign?: (task: TempTask) => void;
  onAcceptComplete?: (task: TempTask) => void;
  onRejectComplete?: (task: TempTask, reason: string) => void;
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
  onSubmitComplete,
  onAccept,
  onWithdraw,
  onCancel,
  onReassign,
  onAcceptComplete,
  onRejectComplete,
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
                <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap w-12">
                  <input
                    type="checkbox"
                    checked={getAllSelectedForMode()}
                    onChange={onSelectAll}
                    className="w-4 h-4 rounded border-gray-300 text-emerald-600 focus:ring-emerald-500"
                  />
                </th>
              )}
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务编号</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">任务名称</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">类型</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">工作地点</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">发布人</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">执行人</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">截止日期</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">预计天数</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">人工</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">总工时</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">状态</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">进度</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">紧急程度</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">超时</th>
              <th className="px-4 py-3 text-center text-sm font-semibold whitespace-nowrap">操作</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-300">
            {tasks.map((task) => {
              const overdueStatus = getTaskOverdueStatus(task);
              return (
              <tr
                key={task.id}
                className={`hover:bg-blue-100 transition-colors ${task.urgency === 'critical' ? 'bg-red-50' : ''} ${showCheckbox && !getRowSelectable(task) ? 'bg-gray-50' : ''} ${overdueStatus === 'overdue' ? 'bg-red-50' : ''} ${overdueStatus === 'warning' ? 'bg-orange-50' : ''}`}
              >
                {showCheckbox && (
                  <td className="px-3 py-3 text-center" onClick={e => e.stopPropagation()}>
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
                <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
                  <button
                    onClick={() => onViewTask(task)}
                    className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
                    title="点击查看详情"
                  >
                    {task.taskCode}
                  </button>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-2">
                    {task.urgency === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span className="font-medium text-gray-900 text-sm">{task.title}</span>
                  </div>
                </td>
                <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{task.typeName || task.type}</td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.location || task.workLocation || task.greenhouseName}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.assignerName || task.assigneeName}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.assigneeName}
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.dueDate}
                  </div>
                </td>
                <td className="px-3 py-3 text-center text-sm text-gray-600">
                  {(task as any).estimatedDays || 0}天
                </td>
                <td className="px-3 py-3 text-center text-sm text-gray-600">
                  {(task as any).workerCount || 1}人
                </td>
                <td className="px-3 py-3 text-center text-sm font-medium text-emerald-600">
                  {((task as any).estimatedDays * 8 + task.estimatedHours) * ((task as any).workerCount || 1)}h
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
                    {statusConfig[task.status].label}
                  </span>
                </td>
                <td className="px-3 py-3 text-center">
                  <div className="flex items-center justify-center gap-2">
                    <div className="w-16 h-2 bg-gray-200 rounded-full overflow-hidden">
                      <div
                        className={`h-full rounded-full transition-all ${
                          (task.progress || 0) === 100 ? 'bg-green-500' : 'bg-emerald-500'
                        }`}
                        style={{ width: `${task.progress || 0}%` }}
                      />
                    </div>
                    <span className="text-xs font-medium text-gray-600 w-8">
                      {task.progress || 0}%
                    </span>
                  </div>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${TEMP_TASK_URGENCY_CONFIG[task.urgency]?.badge || 'bg-gray-100 text-gray-600'}`}>
                    {TEMP_TASK_URGENCY_CONFIG[task.urgency]?.label || task.urgency}
                  </span>
                </td>
                <td className="px-3 py-3 whitespace-nowrap">
                  {overdueStatus === 'overdue' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-red-100 text-red-700 flex items-center gap-1">
                      <AlertTriangle className="w-3 h-3" />
                      {getTaskOverdueDesc(task)}
                    </span>
                  )}
                  {overdueStatus === 'warning' && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-700">
                      即将到期
                    </span>
                  )}
  
                </td>
                <td className="px-3 py-3 whitespace-nowrap" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-1 flex-wrap">
                    {/* 待验收 或 进度100% - 验收按钮 */}
                    {(task.status === 'waiting_acceptance' || task.progress === 100) && onAccept && (
                      <button
                        onClick={() => onAccept(task)}
                        className="px-2 py-1 bg-green-600 text-white text-xs rounded hover:bg-green-700 transition-colors"
                      >
                        验收
                      </button>
                    )}

                    {/* pending 且进度未100% - 撤回按钮 */}
                    {task.status === 'pending' && task.progress !== 100 && onWithdraw && (
                      <button
                        onClick={() => onWithdraw(task)}
                        className="px-2 py-1 bg-orange-500 text-white text-xs rounded hover:bg-orange-600 transition-colors"
                      >
                        撤回
                      </button>
                    )}

                    {/* in_progress - 取消按钮 */}
                    {task.status === 'in_progress' && onCancel && (
                      <button
                        onClick={() => onCancel(task)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        取消
                      </button>
                    )}

                    {/* rejected/pending_reassign - 重新派发按钮 */}
                    {(task.status === 'rejected' || task.status === 'pending_reassign') && onReassign && (
                      <button
                        onClick={() => onReassign(task)}
                        className="px-2 py-1 bg-indigo-500 text-white text-xs rounded hover:bg-indigo-600 transition-colors"
                      >
                        重新派发
                      </button>
                    )}

                    {/* pending 但没有执行人 - 选择执行人按钮 */}
                    {task.status === 'pending' && !task.assigneeId && onReassign && (
                      <button
                        onClick={() => onReassign(task)}
                        className="px-2 py-1 bg-red-500 text-white text-xs rounded hover:bg-red-600 transition-colors"
                      >
                        选择执行人
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