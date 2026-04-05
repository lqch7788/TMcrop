import { X, MapPin, User, Clock, AlertTriangle } from 'lucide-react';
import { TempTask, TEMP_TASK_URGENCY_CONFIG } from '../../../types';

const statusConfig = {
  pending: { label: '待执行', color: 'text-amber-600', bg: 'bg-amber-50' },
  in_progress: { label: '进行中', color: 'text-blue-600', bg: 'bg-blue-50' },
  completed: { label: '已完成', color: 'text-green-600', bg: 'bg-green-50' },
  cancelled: { label: '已取消', color: 'text-gray-600', bg: 'bg-gray-50' },
};

interface TempTaskDetailModalProps {
  task: TempTask | null;
  onClose: () => void;
  onStartTask: (task: TempTask) => void;
  onCompleteTask: (task: TempTask) => void;
}

export function TempTaskDetailModal({
  task,
  onClose,
  onStartTask,
  onCompleteTask,
}: TempTaskDetailModalProps) {
  if (!task) return null;

  return (
    <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
      <div className="bg-white rounded-xl w-full max-w-lg max-h-[80vh] overflow-y-auto" onClick={e => e.stopPropagation()}>
        {/* 头部 */}
        <div className="p-6 border-b">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold text-gray-900">任务详情</h2>
            <button onClick={onClose} className="p-1 hover:bg-gray-100 rounded">
              <X className="w-5 h-5 text-gray-500" />
            </button>
          </div>
        </div>

        {/* 内容 */}
        <div className="p-6 space-y-4">
          {/* 标签 */}
          <div className="flex items-center gap-2">
            <span className={`px-2 py-1 rounded-full text-sm font-medium ${TEMP_TASK_URGENCY_CONFIG[task.urgency].badge}`}>
              {TEMP_TASK_URGENCY_CONFIG[task.urgency].label}
            </span>
            <span className={`px-2 py-1 rounded-full text-xs font-medium ${statusConfig[task.status].bg} ${statusConfig[task.status].color}`}>
              {statusConfig[task.status].label}
            </span>
          </div>

          {/* 标题 */}
          <div>
            <h3 className="text-xl font-bold text-gray-900">{task.title}</h3>
            <p className="text-sm text-gray-500 mt-1">{task.taskCode}</p>
          </div>

          {/* 信息卡片 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">任务类型</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.tempTaskType}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">工作地点</p>
              <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" />
                {task.workLocation}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">负责人</p>
              <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
                <User className="w-3 h-3" />
                {task.assigneeName}
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">预估时长</p>
              <p className="text-sm font-medium text-gray-900 mt-1 flex items-center gap-1">
                <Clock className="w-3 h-3" />
                {task.estimatedHours}小时
              </p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">截止日期</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.dueDate}</p>
            </div>
            <div className="p-3 bg-gray-50 rounded-lg">
              <p className="text-xs text-gray-500">发布人</p>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.assignerName}</p>
            </div>
          </div>

          {/* 任务描述 */}
          {task.description && (
            <div>
              <p className="text-sm text-gray-500">任务描述</p>
              <p className="text-sm text-gray-900 mt-1">{task.description}</p>
            </div>
          )}

          {/* 备注 */}
          {task.notes && (
            <div>
              <p className="text-sm text-gray-500">备注</p>
              <p className="text-sm text-gray-900 mt-1">{task.notes}</p>
            </div>
          )}

          {/* 紧急说明 */}
          {task.urgency === 'critical' && (
            <div className="p-3 bg-red-50 rounded-lg flex items-start gap-2">
              <AlertTriangle className="w-5 h-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-red-700">非常紧急任务</p>
                <p className="text-xs text-red-600 mt-1">此任务需要立即处理，请相关人员尽快响应</p>
              </div>
            </div>
          )}
        </div>

        {/* 底部按钮 */}
        <div className="p-4 border-t flex justify-end gap-2">
          {task.status === 'pending' && (
            <button
              onClick={() => onStartTask(task)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              开始执行
            </button>
          )}
          {task.status === 'in_progress' && (
            <button
              onClick={() => onCompleteTask(task)}
              className="px-4 py-2 bg-green-600 text-white rounded-lg hover:bg-green-700"
            >
              标记完成
            </button>
          )}
          <button
            onClick={onClose}
            className="px-4 py-2 bg-gray-100 text-gray-700 rounded-lg hover:bg-gray-200"
          >
            关闭
          </button>
        </div>
      </div>
    </div>
  );
}

export default TempTaskDetailModal;
