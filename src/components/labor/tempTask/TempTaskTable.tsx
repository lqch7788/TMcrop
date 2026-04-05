import { AlertTriangle, MapPin, User, Clock, Eye, Edit } from 'lucide-react';
import { TempTask, TEMP_TASK_URGENCY_CONFIG } from '../../../types';

const statusConfig = {
  pending: { label: '待执行', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
};

interface TempTaskTableProps {
  tasks: TempTask[];
  onViewTask: (task: TempTask) => void;
  onEditTask: (task: TempTask) => void;
  onStartTask: (task: TempTask) => void;
  onCompleteTask: (task: TempTask) => void;
}

export function TempTaskTable({
  tasks,
  onViewTask,
  onEditTask,
  onStartTask,
  onCompleteTask,
}: TempTaskTableProps) {
  return (
    <div className="bg-white rounded-xl shadow-sm overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="bg-gray-50 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
              <th className="px-4 py-3">紧急程度</th>
              <th className="px-4 py-3">任务编号</th>
              <th className="px-4 py-3">任务名称</th>
              <th className="px-4 py-3">类型</th>
              <th className="px-4 py-3">工作地点</th>
              <th className="px-4 py-3">负责人</th>
              <th className="px-4 py-3">截止日期</th>
              <th className="px-4 py-3">状态</th>
              <th className="px-4 py-3">操作</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {tasks.map((task) => (
              <tr
                key={task.id}
                className={`hover:bg-gray-50 cursor-pointer transition-colors ${task.urgency === 'critical' ? 'bg-red-50' : ''}`}
                onClick={() => onViewTask(task)}
              >
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${TEMP_TASK_URGENCY_CONFIG[task.urgency].badge}`}>
                    {TEMP_TASK_URGENCY_CONFIG[task.urgency].label}
                  </span>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{task.taskCode}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-2">
                    {task.urgency === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
                    <span className="font-medium text-gray-900">{task.title}</span>
                  </div>
                </td>
                <td className="px-4 py-3 text-sm text-gray-600">{task.tempTaskType}</td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.workLocation}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.assigneeName}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center gap-1 text-sm text-gray-600">
                    <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
                    {task.dueDate}
                  </div>
                </td>
                <td className="px-4 py-3">
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
                    {statusConfig[task.status].label}
                  </span>
                </td>
                <td className="px-4 py-3" onClick={e => e.stopPropagation()}>
                  <div className="flex items-center gap-2">
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
        {tasks.length === 0 && (
          <div className="p-8 text-center text-gray-500">
            没有找到符合条件的临时任务
          </div>
        )}
      </div>
    </div>
  );
}

export default TempTaskTable;
