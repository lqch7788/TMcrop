/**
 * 生产任务表格行组件
 */

import { CheckCircle, XCircle, Play, Eye, Edit, FileText } from 'lucide-react';
import { TaskWithExtras, TaskDispatchTask } from './types';
import { STATUS_MAP, PRIORITY_MAP, getTypeColor, getTypeLabel } from './constants';

interface ProductionTaskTableRowProps {
  task: TaskDispatchTask | Task;
  onAccept: (task: TaskDispatchTask) => void;
  onReject: (task: TaskDispatchTask) => void;
  onContinueExecution: (task: TaskDispatchTask) => void;
  onOpenFeedbackModal: (task: TaskDispatchTask) => void;
  onOpenDetailModal: (task: TaskDispatchTask) => void;
  onOpenSopModal: (task: TaskDispatchTask, e: React.MouseEvent) => void;
}

/**
 * 渲染任务类型单元格
 */
const renderTypeCell = (task: TaskDispatchTask | Task) => {
  const types = task.types || [];
  return (
    <div className="flex flex-wrap gap-1 items-center">
      {types.slice(0, 2).map((typeValue: string, idx: number) => {
        const typeLabel = getTypeLabel(typeValue);
        return typeLabel === '其他' ? (
          <span key={idx} className="text-orange-500 text-xs">其他</span>
        ) : (
          <span key={idx} className={`inline-flex px-2 py-0.5 rounded text-xs text-white ${getTypeColor(typeValue)}`}>
            {typeLabel}
          </span>
        );
      })}
      {types.length > 2 && (
        <span className="text-xs text-gray-500">+{types.length - 2}</span>
      )}
    </div>
  );
};

/**
 * 生产任务表格行组件
 */
export function ProductionTaskTableRow({
  task,
  onAccept,
  onReject,
  onContinueExecution,
  onOpenFeedbackModal,
  onOpenDetailModal,
  onOpenSopModal,
}: ProductionTaskTableRowProps) {
  const taskWithExtras = task as TaskWithExtras;
  const types = task.types || [];

  return (
    <>
      {/* 任务ID */}
      <td className="px-3 py-3 text-sm font-medium whitespace-nowrap">
        <button
          onClick={() => onOpenDetailModal(task)}
          className="text-blue-600 hover:text-blue-800 hover:underline font-medium"
          title="点击查看详情"
        >
          {task.id}
        </button>
      </td>
      {/* 任务类型 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {renderTypeCell(task)}
      </td>
      {/* 任务区域 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.field || '-'}
      </td>
      {/* 作物 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.crop || '-'}
      </td>
      {/* 负责人 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className="text-sm text-gray-700">{task.assigneeName || '-'}</span>
      </td>
      {/* 计划开始 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planStart?.split(' ')[0] || '-'}
      </td>
      {/* 计划结束 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {task.planEnd || '-'}
      </td>
      {/* 任务工时 */}
      <td className="px-3 py-3 text-sm text-gray-600 whitespace-nowrap">
        {((task.estimatedDays || 0) * 8 + (task.estimatedHours || 0)) || 0}小时
      </td>
      {/* 进度 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <div className="flex items-center gap-2">
          <div className="w-16 bg-gray-200 rounded-full h-2 overflow-hidden">
            <div
              className={`h-full rounded-full ${task.progress === 100 ? 'bg-green-500' : (task.progress || 0) > 0 ? 'bg-blue-500' : 'bg-gray-300'}`}
              style={{ width: `${task.progress || 0}%` }}
            />
          </div>
          <span className="text-xs text-gray-500">{task.progress || 0}%</span>
        </div>
      </td>
      {/* 优先级 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`text-xs font-medium ${PRIORITY_MAP[task.priority]?.color || 'text-gray-500'}`}>
          {PRIORITY_MAP[task.priority]?.label || task.priority}
        </span>
      </td>
      {/* 状态 */}
      <td className="px-3 py-3 whitespace-nowrap">
        <span className={`px-2 py-1 rounded-full text-xs font-medium ${STATUS_MAP[task.status]?.bg || 'bg-gray-100'} ${STATUS_MAP[task.status]?.color || 'text-gray-600'}`}>
          {STATUS_MAP[task.status]?.label || task.status}
        </span>
      </td>
      {/* 备注 */}
      <td className="px-3 py-3 text-sm text-gray-600 max-w-[150px] truncate" title={task.typeLabel || '-'}>
        {task.typeLabel || '-'}
      </td>
      {/* 作业标准 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {types.length >= 2 && task.sopContent ? (
          <button
            onClick={(e) => onOpenSopModal(task, e)}
            className="text-blue-600 hover:text-blue-800 underline text-xs flex items-center gap-1"
          >
            <FileText className="w-3 h-3" />
            SOP文件
          </button>
        ) : (
          <span className="text-gray-400 text-xs">-</span>
        )}
      </td>
      {/* 操作 */}
      <td className="px-3 py-3 whitespace-nowrap">
        {task.status === 'pending' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onAccept(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-green-500 hover:bg-green-600 rounded-lg text-xs font-medium transition-colors"
              title="接受任务"
            >
              <CheckCircle className="w-3 h-3" />
              接受
            </button>
            <button
              onClick={() => onReject(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-red-500 hover:bg-red-600 rounded-lg text-xs font-medium transition-colors"
              title="拒绝任务"
            >
              <XCircle className="w-3 h-3" />
              拒绝
            </button>
          </div>
        )}
        {(task.status === 'accepted' || task.status === 'in_progress') && (
          <button
            onClick={() => onOpenFeedbackModal(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-white bg-blue-500 hover:bg-blue-600 rounded-lg text-sm font-medium transition-colors"
            title="点击提交进度"
          >
            <Edit className="w-4 h-4" />
            提交进度
          </button>
        )}
        {task.status === 'rejected' && (
          <div className="flex items-center gap-1">
            <button
              onClick={() => onContinueExecution(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-white bg-orange-500 hover:bg-orange-600 rounded-lg text-xs font-medium transition-colors"
              title="点击继续执行"
            >
              <Play className="w-3 h-3" />
              继续执行
            </button>
            <button
              onClick={() => onOpenDetailModal(task)}
              className="flex items-center gap-1 px-2 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-xs font-medium transition-colors"
              title="点击查看详情"
            >
              <Eye className="w-3 h-3" />
              查看
            </button>
          </div>
        )}
        {(task.status === 'waiting_acceptance' || task.status === 'completed') && (
          <button
            onClick={() => onOpenDetailModal(task)}
            className="flex items-center gap-1.5 px-3 py-1.5 text-gray-600 hover:text-white bg-gray-100 hover:bg-gray-500 rounded-lg text-sm font-medium transition-colors"
            title="点击查看详情"
          >
            <Eye className="w-4 h-4" />
            查看
          </button>
        )}
      </td>
    </>
  );
}

export default ProductionTaskTableRow;
