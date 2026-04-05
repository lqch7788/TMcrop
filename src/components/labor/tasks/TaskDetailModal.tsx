import { XCircle } from 'lucide-react';
import { Task } from '../../../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskModeBadge } from './TaskModeBadge';

interface TaskDetailModalProps {
  task: Task | null;
  onClose: () => void;
  onConfirmComplete?: (task: Task) => void;
}

export function TaskDetailModal({ task, onClose, onConfirmComplete }: TaskDetailModalProps) {
  if (!task) return null;

  const getModeText = (mode: string) => {
    switch (mode) {
      case 'glass': return '玻璃温室';
      case 'solar': return '日光温室';
      case 'field': return '大田';
      default: return mode;
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white rounded-2xl w-full max-w-2xl max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-gray-100 flex items-center justify-between">
          <h3 className="text-lg font-semibold text-gray-900">任务详情</h3>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <XCircle className="w-5 h-5 text-gray-400" />
          </button>
        </div>

        {/* Body */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-140px)]">
          <div className="grid grid-cols-2 gap-6">
            {/* 任务编号 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">任务编号</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.taskCode}</p>
            </div>

            {/* 任务类型 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">任务类型</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.typeName}</p>
            </div>

            {/* 任务标题 */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">任务标题</label>
              <div className="flex items-center gap-2 mt-1">
                <TaskModeBadge mode={task.mode} />
                <p className="text-sm font-medium text-gray-900">{task.title}</p>
              </div>
            </div>

            {/* 所属批次 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">所属批次</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.batchCode}</p>
            </div>

            {/* 作业区域 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">作业区域</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.greenhouseName}</p>
            </div>

            {/* 执行人 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">执行人</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.assigneeName}</p>
            </div>

            {/* 派单人 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">派单人</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.assignerName}</p>
            </div>

            {/* 截止时间 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">截止时间</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.dueDate}</p>
            </div>

            {/* 预计工时 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">预计工时</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{task.workDuration} 小时</p>
            </div>

            {/* 优先级 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">优先级</label>
              <div className="mt-1">
                <TaskPriorityBadge priority={task.priority} />
              </div>
            </div>

            {/* 状态 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">状态</label>
              <div className="mt-1">
                <TaskStatusBadge status={task.status} />
              </div>
            </div>

            {/* 任务模式 */}
            <div>
              <label className="text-xs text-gray-500 uppercase tracking-wide">任务模式</label>
              <p className="text-sm font-medium text-gray-900 mt-1">{getModeText(task.mode)}</p>
            </div>

            {/* 任务描述 */}
            <div className="col-span-2">
              <label className="text-xs text-gray-500 uppercase tracking-wide">任务描述</label>
              <p className="text-sm text-gray-700 mt-1">{task.description || '-'}</p>
            </div>

            {/* 所需物料 */}
            {task.requiredMaterials && task.requiredMaterials.length > 0 && (
              <div className="col-span-2">
                <label className="text-xs text-gray-500 uppercase tracking-wide">所需物料</label>
                <div className="mt-2 space-y-2">
                  {task.requiredMaterials.map((material, index) => (
                    <div key={index} className="flex items-center justify-between p-2 bg-gray-50 rounded-lg">
                      <span className="text-sm text-gray-700">{material.materialName}</span>
                      <span className="text-sm font-medium text-gray-900">
                        {material.requiredQuantity} {material.unit}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* 已完成状态的额外信息 */}
            {task.status === 'completed' && (
              <>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">实际工作量</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {task.actualWorkload ? `${task.actualWorkload}` : '-'}
                  </p>
                </div>
                <div>
                  <label className="text-xs text-gray-500 uppercase tracking-wide">执行时间</label>
                  <p className="text-sm font-medium text-gray-900 mt-1">
                    {task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : '-'}
                  </p>
                </div>
                {task.notes && (
                  <div className="col-span-2">
                    <label className="text-xs text-gray-500 uppercase tracking-wide">执行备注</label>
                    <p className="text-sm text-gray-700 mt-1">{task.notes}</p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 flex items-center justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
          >
            关闭
          </button>
          {task.status !== 'completed' && onConfirmComplete && (
            <button
              onClick={() => onConfirmComplete(task)}
              className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 transition-colors"
            >
              确认完成
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

export default TaskDetailModal;
