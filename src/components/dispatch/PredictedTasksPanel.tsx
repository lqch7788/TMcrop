/**
 * 预测任务面板组件
 * 显示基于生长周期的预测任务和病虫害预警
 */

import React from 'react';
import { Calendar, AlertTriangle, Clock, Sprout, Bug, AlertCircle } from 'lucide-react';
import type { PredictedTask } from '../../hooks/useCropGrowthEngine';

interface PredictedTasksPanelProps {
  predictedTasks: PredictedTask[];
  overdueTasks: PredictedTask[];
  pestAlerts: PredictedTask[];
  onTaskClick?: (task: PredictedTask) => void;
}

/** 获取状态颜色 */
function getStatusColor(status: PredictedTask['status']): string {
  switch (status) {
    case 'overdue': return 'bg-red-100 text-red-700 border-red-200';
    case 'alert': return 'bg-orange-100 text-orange-700 border-orange-200';
    default: return 'bg-blue-100 text-blue-700 border-blue-200';
  }
}

/** 获取来源图标 */
function getSourceIcon(source: PredictedTask['source']) {
  switch (source) {
    case 'growth_stage': return <Sprout className="w-4 h-4 text-green-500" />;
    case 'overdue': return <AlertCircle className="w-4 h-4 text-red-500" />;
    case 'pest_alert': return <Bug className="w-4 h-4 text-orange-500" />;
    case 'weather_alert': return <AlertTriangle className="w-4 h-4 text-yellow-500" />;
    default: return <Calendar className="w-4 h-4 text-gray-500" />;
  }
}

/** 获取优先级颜色 */
function getPriorityColor(priority: PredictedTask['priority']): string {
  switch (priority) {
    case 'high': return 'bg-red-100 text-red-600';
    case 'medium': return 'bg-yellow-100 text-yellow-600';
    case 'low': return 'bg-gray-100 text-gray-600';
    default: return 'bg-gray-100 text-gray-600';
  }
}

export const PredictedTasksPanel: React.FC<PredictedTasksPanelProps> = ({
  predictedTasks,
  overdueTasks,
  pestAlerts,
  onTaskClick,
}) => {
  const allTasks = [...overdueTasks, ...pestAlerts, ...predictedTasks];

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900 flex items-center gap-2">
          <Calendar className="w-5 h-5 text-purple-500" />
          任务预测
        </h3>
        <p className="text-xs text-gray-500 mt-1">
          基于生长周期和病虫害预警的智能预测
        </p>
      </div>

      <div className="p-3 max-h-96 overflow-y-auto">
        {allTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-8 text-gray-500">
            <Sprout className="w-10 h-10 mb-2 text-gray-300" />
            <p className="text-sm">暂无预测任务</p>
          </div>
        ) : (
          <div className="space-y-2">
            {allTasks.map(task => (
              <div
                key={task.id}
                onClick={() => onTaskClick?.(task)}
                className={`p-3 rounded-lg border cursor-pointer hover:shadow-md transition-shadow ${getStatusColor(task.status)}`}
              >
                {/* 头部：类型和优先级 */}
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2">
                    {getSourceIcon(task.source)}
                    <span className="font-medium text-sm">{task.typeName}</span>
                  </div>
                  <span className={`px-2 py-0.5 rounded text-xs font-medium ${getPriorityColor(task.priority)}`}>
                    {task.priority === 'high' ? '高优' : task.priority === 'medium' ? '中优' : '低优'}
                  </span>
                </div>

                {/* 批次信息 */}
                {task.batchCode && (
                  <div className="text-xs text-gray-600 mb-1">
                    {task.batchCode} - {task.cropName}
                  </div>
                )}

                {/* 温室信息 */}
                {task.greenhouseName && (
                  <div className="text-xs text-gray-500 mb-1">
                    {task.greenhouseName}
                  </div>
                )}

                {/* 预测原因 */}
                <div className="text-xs text-gray-600 mb-2 line-clamp-2">
                  {task.reason}
                </div>

                {/* 底部：日期和工时 */}
                <div className="flex items-center justify-between text-xs">
                  <div className="flex items-center gap-1 text-gray-500">
                    <Clock className="w-3 h-3" />
                    <span>{task.dueDate}</span>
                  </div>
                  <span className="text-gray-500">
                    预计{task.estimatedHours}小时
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* 统计信息 */}
      {allTasks.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-100 flex gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-red-500" />
            超期 {overdueTasks.length}
          </span>
          <span className="flex items-center gap-1">
            <Bug className="w-3 h-3 text-orange-500" />
            病虫预警 {pestAlerts.length}
          </span>
          <span className="flex items-center gap-1">
            <Sprout className="w-3 h-3 text-green-500" />
            预测 {predictedTasks.length}
          </span>
        </div>
      )}
    </div>
  );
};

export default PredictedTasksPanel;
