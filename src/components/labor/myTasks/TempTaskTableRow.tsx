/**
 * 临时任务表格行组件
 */

import { AlertTriangle, MapPin, User, Clock, CheckCircle, XCircle, Play, Eye, Edit2 } from 'lucide-react';
import { Button } from '@/components/ui';
import { TaskWithExtras, TaskDispatchTask } from './types';
import { STATUS_MAP, formatDateShort, formatExpectedEndDate } from './constants';
import { TEMP_TASK_URGENCY_CONFIG } from '../../../types';

interface TempTaskTableRowProps {
  task: TaskDispatchTask | Task;
  onAccept: (task: TaskDispatchTask) => void;
  onReject: (task: TaskDispatchTask) => void;
  onContinueExecution: (task: TaskDispatchTask) => void;
  onOpenFeedbackModal: (task: TaskDispatchTask) => void;
  onOpenDetailModal: (task: TaskDispatchTask) => void;
}

/**
 * 临时任务表格行组件
 */
export function TempTaskTableRow({
  task,
  onAccept,
  onReject,
  onContinueExecution,
  onOpenFeedbackModal,
  onOpenDetailModal,
}: TempTaskTableRowProps) {
  const taskWithExtras = task as TaskWithExtras;
  const isTempTask = taskWithExtras.sourceType === 'tempTask';
  const totalHours = ((task.estimatedDays || 0) * 8 + (task.estimatedHours || 0)) * (taskWithExtras.workerCount || 1);

  return (
    <>
      {/* 任务编号 */}
      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
        <Button
          variant="link"
          size="sm"
          onClick={() => onOpenDetailModal(task)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          title="点击查看详情"
        >
          {task.taskCode}
        </Button>
      </td>
      {/* 任务名称 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          {isTempTask && taskWithExtras.urgency === 'critical' && <AlertTriangle className="w-4 h-4 text-red-500 flex-shrink-0" />}
          <span className="font-medium text-gray-900 text-sm">{task.title}</span>
        </div>
      </td>
      {/* 类型 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">{taskWithExtras.typeName || '-'}</td>
      {/* 工作地点 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <MapPin className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {task.field || '-'}
        </div>
      </td>
      {/* 负责人 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <User className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {task.assigneeName || '-'}
        </div>
      </td>
      {/* 开始时间 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-gray-600">
          <Clock className="w-4 h-4 text-gray-400 flex-shrink-0" />
          {taskWithExtras.startDate ? formatDateShort(taskWithExtras.startDate) : '-'}
        </div>
      </td>
      {/* 预计结束 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-1 text-sm text-emerald-600">
          <Clock className="w-4 h-4 text-emerald-400 flex-shrink-0" />
          {formatExpectedEndDate(taskWithExtras.startDate, taskWithExtras.estimatedDays, taskWithExtras.estimatedHours)}
        </div>
      </td>
      {/* 人工 */}
      <td className="px-3 py-3 text-center text-sm text-gray-600">{taskWithExtras.workerCount || 1}人</td>
      {/* 总工时 */}
      <td className="px-3 py-3 text-center text-sm font-medium text-emerald-600">{totalHours}h</td>
      {/* 状态 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[task.status]?.bg || 'bg-gray-100'} ${STATUS_MAP[task.status]?.color || 'text-gray-600'}`}>
          {STATUS_MAP[task.status]?.label || task.status}
        </span>
      </td>
      {/* 紧急程度 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${TEMP_TASK_URGENCY_CONFIG[taskWithExtras.urgency]?.badge || 'bg-gray-100 text-gray-600'}`}>
          {TEMP_TASK_URGENCY_CONFIG[taskWithExtras.urgency]?.label || taskWithExtras.urgency || '-'}
        </span>
      </td>
      {/* 超时 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {/* 超时状态由执行人端判断，暂不显示 */}
        <span className="text-xs text-gray-400">-</span>
      </td>
      {/* 操作 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.status === 'pending' && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="default"
              onClick={() => onAccept(task)}
              title="接受任务"
            >
              <CheckCircle className="w-4 h-4" />
              接受
            </Button>
            <Button
              size="sm"
              variant="destructive"
              onClick={() => onReject(task)}
              title="拒绝任务"
            >
              <XCircle className="w-4 h-4" />
              拒绝
            </Button>
          </div>
        )}
        {(task.status === 'accepted' || task.status === 'in_progress') && (
          <Button
            size="sm"
            variant="blue"
            onClick={() => onOpenFeedbackModal(task)}
            title="点击提交进度"
          >
            <Edit2 className="w-4 h-4" />
            提交进度
          </Button>
        )}
        {task.status === 'rejected' && (
          <div className="flex items-center gap-1">
            <Button
              size="sm"
              variant="warning"
              onClick={() => onContinueExecution(task)}
              title="点击继续执行"
            >
              <Play className="w-4 h-4" />
              继续执行
            </Button>
            <Button
              size="sm"
              variant="secondary"
              onClick={() => onOpenDetailModal(task)}
              title="点击查看详情"
            >
              <Eye className="w-4 h-4" />
              查看
            </Button>
          </div>
        )}
        {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
          <Button
            size="sm"
            variant="secondary"
            onClick={() => onOpenDetailModal(task)}
            title="点击查看详情"
          >
            <Eye className="w-4 h-4" />
            查看
          </Button>
        )}
      </td>
    </>
  );
}

export default TempTaskTableRow;
