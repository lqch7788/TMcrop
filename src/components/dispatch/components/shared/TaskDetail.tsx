/**
 * 任务详情面板组件
 * 显示任务的完整信息，可被各Tab共用
 */

import React from 'react';
import { X, MapPin, Clock, User, CheckCircle2, AlertCircle } from 'lucide-react';
import { TASK_STATUS_CONFIG } from '../../../../hooks/useTasks';
import { RecommendIndicator } from './RecommendIndicator';
import { TaskRecordTimeline } from '../../../../components/common/TaskRecordTimeline';
import type { TaskRecord } from '../../../../types/task';

export interface TaskDetailProps {
  task: {
    id: string;
    taskCode: string;
    title: string;
    description?: string;
    status: string;
    priority?: string;
    dispatchMode?: 'farm' | 'tempTask' | 'smart';
    greenhouseName?: string;
    taskTypeName?: string;
    assigneeName?: string;
    assignerName?: string;
    dueDate?: string;
    estimatedDays?: number;
    estimatedHours?: number;
    progress?: number;
    createdAt?: string;
    updatedAt?: string;
    recommendedExecutorName?: string;
    recommendScore?: number;
  };
  taskRecords?: TaskRecord[]; // 流转记录列表
  onClose?: () => void;
}

/**
 * 优先级标签配置
 */
const PRIORITY_LABELS: Record<string, { label: string; color: string }> = {
  urgent: { label: '紧急', color: 'text-red-600 bg-red-100' },
  high: { label: '高', color: 'text-orange-600 bg-orange-100' },
  normal: { label: '普通', color: 'text-blue-600 bg-blue-100' },
  low: { label: '低', color: 'text-gray-600 bg-gray-100' },
};

/**
 * 派发模式标签配置
 */
const DISPATCH_MODE_LABELS: Record<string, { label: string; color: string }> = {
  farm: { label: '农事任务', color: 'text-blue-600 bg-blue-100' },
  tempTask: { label: '临时任务', color: 'text-orange-600 bg-orange-100' },
  smart: { label: '智能派工', color: 'text-purple-600 bg-purple-100' },
};

/**
 * 任务详情面板组件
 */
export const TaskDetail: React.FC<TaskDetailProps> = ({ task, taskRecords, onClose }) => {
  const statusConfig = TASK_STATUS_CONFIG[task.status as keyof typeof TASK_STATUS_CONFIG] || {
    label: task.status,
    bg: 'bg-gray-100',
    color: 'text-gray-600',
  };

  const priorityConfig = task.priority
    ? PRIORITY_LABELS[task.priority] || { label: task.priority, color: 'text-gray-600 bg-gray-100' }
    : null;

  const modeConfig = task.dispatchMode
    ? DISPATCH_MODE_LABELS[task.dispatchMode] || { label: task.dispatchMode, color: 'text-gray-600 bg-gray-100' }
    : null;

  return (
    <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
      {/* 头部 */}
      <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between bg-gray-50">
        <div>
          <h3 className="text-lg font-semibold text-gray-900">任务详情</h3>
          <p className="text-sm text-gray-500 mt-0.5">{task.taskCode}</p>
        </div>
        {onClose && (
          <button
            onClick={onClose}
            className="p-1 text-gray-400 hover:text-gray-600"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* 内容 */}
      <div className="p-6 space-y-6">
        {/* 标题和标签 */}
        <div>
          <h4 className="text-xl font-bold text-gray-900 mb-3">{task.title}</h4>
          <div className="flex flex-wrap gap-2">
            {/* 状态标签 */}
            <span
              className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${statusConfig.bg} ${statusConfig.color}`}
            >
              {statusConfig.label}
            </span>
            {/* 优先级标签 */}
            {priorityConfig && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${priorityConfig.color}`}
              >
                {priorityConfig.label}
              </span>
            )}
            {/* 派发模式标签 */}
            {modeConfig && (
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium ${modeConfig.color}`}
              >
                {modeConfig.label}
              </span>
            )}
          </div>
        </div>

        {/* 智能派工信息 */}
        {task.dispatchMode === 'smart' && task.recommendedExecutorName && (
          <div className="p-4 bg-purple-50 rounded-lg border border-purple-200">
            <div className="flex items-center gap-2 mb-2">
              <CheckCircle2 className="w-5 h-5 text-purple-600" />
              <span className="font-medium text-purple-900">智能推荐执行人</span>
            </div>
            <div className="flex items-center justify-between">
              <span className="text-purple-700 font-medium">{task.recommendedExecutorName}</span>
              {task.recommendScore !== undefined && (
                <RecommendIndicator score={task.recommendScore} showLabel size="sm" />
              )}
            </div>
          </div>
        )}

        {/* 基本信息 */}
        <div className="grid grid-cols-2 gap-4">
          {/* 温室 */}
          {task.greenhouseName && (
            <div className="flex items-start gap-3">
              <MapPin className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">作业地点</div>
                <div className="text-sm font-medium text-gray-900">{task.greenhouseName}</div>
              </div>
            </div>
          )}

          {/* 农事类型 */}
          {task.taskTypeName && (
            <div className="flex items-start gap-3">
              <CheckCircle2 className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">任务类型</div>
                <div className="text-sm font-medium text-gray-900">{task.taskTypeName}</div>
              </div>
            </div>
          )}

          {/* 执行人 */}
          {task.assigneeName && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">执行人</div>
                <div className="text-sm font-medium text-gray-900">{task.assigneeName}</div>
              </div>
            </div>
          )}

          {/* 派发人 */}
          {task.assignerName && (
            <div className="flex items-start gap-3">
              <User className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">派发人</div>
                <div className="text-sm font-medium text-gray-900">{task.assignerName}</div>
              </div>
            </div>
          )}

          {/* 截止日期 */}
          {task.dueDate && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">截止日期</div>
                <div className="text-sm font-medium text-gray-900">{task.dueDate}</div>
              </div>
            </div>
          )}

          {/* 预计时间 */}
          {(task.estimatedDays || task.estimatedHours) && (
            <div className="flex items-start gap-3">
              <Clock className="w-5 h-5 text-gray-400 mt-0.5" />
              <div>
                <div className="text-xs text-gray-500">预计时间</div>
                <div className="text-sm font-medium text-gray-900">
                  {task.estimatedDays ? `${task.estimatedDays}天` : ''}
                  {task.estimatedHours ? `${task.estimatedHours}小时` : ''}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* 进度 */}
        {task.progress !== undefined && (
          <div>
            <div className="flex items-center justify-between mb-2">
              <span className="text-sm text-gray-500">完成进度</span>
              <span className="text-sm font-medium text-gray-900">{task.progress}%</span>
            </div>
            <div className="w-full h-2 bg-gray-200 rounded-full overflow-hidden">
              <div
                className="h-full bg-blue-600 rounded-full transition-all"
                style={{ width: `${task.progress}%` }}
              />
            </div>
          </div>
        )}

        {/* 任务描述 */}
        {task.description && (
          <div>
            <div className="text-sm text-gray-500 mb-2">任务描述</div>
            <div className="text-sm text-gray-700 bg-gray-50 rounded-lg p-3">
              {task.description}
            </div>
          </div>
        )}

        {/* 所需物资 */}
        {task.materials && task.materials.length > 0 && (
          <div>
            <div className="text-sm text-gray-500 mb-2">所需物资</div>
            <div className="bg-gray-50 rounded-lg p-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="text-left text-gray-500">
                    <th className="pb-1">物资名称</th>
                    <th className="pb-1 w-20">数量</th>
                    <th className="pb-1 w-16">单位</th>
                  </tr>
                </thead>
                <tbody className="text-gray-700">
                  {task.materials.map((m, idx) => (
                    <tr key={idx}>
                      <td className="py-1">{m.name}</td>
                      <td>{m.qty}</td>
                      <td>{m.unit}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* 流转记录 */}
        {taskRecords && taskRecords.length > 0 && (
          <div className="pt-4 border-t border-gray-200">
            <TaskRecordTimeline records={taskRecords} showFeedback />
          </div>
        )}

        {/* 时间信息 */}
        <div className="pt-4 border-t border-gray-200">
          <div className="grid grid-cols-2 gap-4 text-xs text-gray-500">
            <div>
              <span className="font-medium">创建时间：</span>
              {task.createdAt ? new Date(task.createdAt).toLocaleString('zh-CN') : '-'}
            </div>
            <div>
              <span className="font-medium">更新时间：</span>
              {task.updatedAt ? new Date(task.updatedAt).toLocaleString('zh-CN') : '-'}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
