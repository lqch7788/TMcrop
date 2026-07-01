import { Check, X, XCircle } from 'lucide-react';
import { Button } from '@/components/ui';
import { UnifiedModal } from '@/components/ui';
import { Task } from '../../../types';
import { TaskStatusBadge } from './TaskStatusBadge';
import { TaskPriorityBadge } from './TaskPriorityBadge';
import { TaskModeBadge } from './TaskModeBadge';
import { Label } from '@/components/ui';

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

  const content = (
    <div className="grid grid-cols-2 gap-6">
      {/* 任务编号 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">任务编号</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.taskCode}</p>
      </div>

      {/* 任务类型 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">任务类型</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.typeName}</p>
      </div>

      {/* 任务标题 */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 uppercase tracking-wide">任务标题</Label>
        <div className="flex items-center gap-2 mt-1">
          <TaskModeBadge mode={task.mode as any} />
          <p className="text-sm font-medium text-gray-900">{task.title}</p>
        </div>
      </div>

      {/* 所属批次 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">所属批次</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.batchCode}</p>
      </div>

      {/* 作业区域 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">作业区域</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.greenhouseName}</p>
      </div>

      {/* 执行人 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">执行人</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.assigneeName}</p>
      </div>

      {/* 派单人 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">派单人</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.assignerName}</p>
      </div>

      {/* 截止时间 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">截止时间</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.dueDate}</p>
      </div>

      {/* 预计工时 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">预计工时</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{task.workDuration} 小时</p>
      </div>

      {/* 优先级 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">优先级</Label>
        <div className="mt-1">
          <TaskPriorityBadge priority={task.priority} />
        </div>
      </div>

      {/* 状态 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">状态</Label>
        <div className="mt-1">
          <TaskStatusBadge status={task.status} />
        </div>
      </div>

      {/* 任务模式 */}
      <div>
        <Label className="text-xs text-gray-500 uppercase tracking-wide">任务模式</Label>
        <p className="text-sm font-medium text-gray-900 mt-1">{getModeText(task.mode)}</p>
      </div>

      {/* 任务描述 */}
      <div className="col-span-2">
        <Label className="text-xs text-gray-500 uppercase tracking-wide">任务描述</Label>
        <p className="text-sm text-gray-700 mt-1">{task.description || '-'}</p>
      </div>

      {/* 所需物料 */}
      {task.requiredMaterials && task.requiredMaterials.length > 0 && (
        <div className="col-span-2">
          <Label className="text-xs text-gray-500 uppercase tracking-wide">所需物料</Label>
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
            <Label className="text-xs text-gray-500 uppercase tracking-wide">实际工作量</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {task.actualWorkload ? `${task.actualWorkload}` : '-'}
            </p>
          </div>
          <div>
            <Label className="text-xs text-gray-500 uppercase tracking-wide">执行时间</Label>
            <p className="text-sm font-medium text-gray-900 mt-1">
              {task.startTime && task.endTime ? `${task.startTime} - ${task.endTime}` : '-'}
            </p>
          </div>
          {task.notes && (
            <div className="col-span-2">
              <Label className="text-xs text-gray-500 uppercase tracking-wide">执行备注</Label>
              <p className="text-sm text-gray-700 mt-1">{task.notes}</p>
            </div>
          )}
        </>
      )}
    </div>
  );

  const footer = (
    <>
      <Button
        variant="outline"
        onClick={onClose}
      >
        <X className="w-4 h-4" /> 关闭
      </Button>
      {task.status !== 'completed' && onConfirmComplete && (
        <Button
          variant="default"
          onClick={() => onConfirmComplete(task)}
        >
          <Check className="w-4 h-4" /> 确认完成
        </Button>
      )}
    </>
  );

  return (
    <UnifiedModal
      isOpen={true}
      onClose={onClose}
      title="任务详情"
      size="lg"
      showFooter={true}
      headerAction={
        <Button
          variant="ghost"
          size="icon"
          onClick={onClose}
        >
          <XCircle className="w-5 h-5 text-gray-400" />
        </Button>
      }
      footer={footer}
    >
      {content}
    </UnifiedModal>
  );
}

export default TaskDetailModal;
