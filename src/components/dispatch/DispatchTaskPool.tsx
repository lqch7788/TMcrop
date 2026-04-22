/**
 * 统一任务池组件
 * 展示合并后的待派发任务列表
 */

import React from 'react';
import { MapPin, Clock, AlertTriangle, Zap } from 'lucide-react';
import type { UnifiedDispatchTask, DispatchTaskSource } from '../../hooks/useComprehensiveDispatch';

interface DispatchTaskPoolProps {
  tasks: UnifiedDispatchTask[];
  selectedTaskId?: string;
  onSelectTask: (task: UnifiedDispatchTask) => void;
  sourceFilter?: DispatchTaskSource | 'all';
  onSourceFilterChange?: (source: DispatchTaskSource | 'all') => void;
}

/** 优先级颜色映射 */
const PRIORITY_COLORS: Record<UnifiedDispatchTask['priority'], string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

/** 优先级图标映射 */
const PRIORITY_ICONS: Record<UnifiedDispatchTask['priority'], React.ReactNode> = {
  urgent: <Zap className="w-3 h-3" />,
  high: <AlertTriangle className="w-3 h-3" />,
  normal: <Clock className="w-3 h-3" />,
  low: <Clock className="w-3 h-3" />,
};

/** 来源标签映射 */
const SOURCE_LABELS: Record<DispatchTaskSource, { label: string; color: string }> = {
  farm: { label: '农事', color: 'bg-green-100 text-green-700' },
  tempTask: { label: '临时', color: 'bg-purple-100 text-purple-700' },
  inspection: { label: '巡查', color: 'bg-orange-100 text-orange-700' },
};

export const DispatchTaskPool: React.FC<DispatchTaskPoolProps> = ({
  tasks,
  selectedTaskId,
  onSelectTask,
  sourceFilter = 'all',
  onSourceFilterChange,
}) => {
  // 根据筛选过滤任务
  const filteredTasks = sourceFilter === 'all'
    ? tasks
    : tasks.filter(t => t.source === sourceFilter);

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 头部 */}
      <div className="px-4 py-3 border-b border-gray-200">
        <h3 className="font-semibold text-gray-900">待派发任务</h3>
        <p className="text-xs text-gray-500 mt-1">共 {filteredTasks.length} 个任务待派发</p>
      </div>

      {/* 筛选器 */}
      {onSourceFilterChange && (
        <div className="px-4 py-2 border-b border-gray-100 flex gap-2">
          {(['all', 'farm', 'tempTask', 'inspection'] as const).map(source => (
            <button
              key={source}
              onClick={() => onSourceFilterChange(source)}
              className={`px-2 py-1 rounded text-xs font-medium transition-colors ${
                sourceFilter === source
                  ? 'bg-emerald-500 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {source === 'all' ? '全部' : SOURCE_LABELS[source].label}
            </button>
          ))}
        </div>
      )}

      {/* 任务列表 */}
      <div className="p-2 max-h-96 overflow-y-auto">
        {filteredTasks.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <p className="text-sm">暂无待派发任务</p>
          </div>
        ) : (
          filteredTasks.map(task => (
            <div
              key={task.id}
              onClick={() => onSelectTask(task)}
              className={`p-3 mb-2 rounded-lg border-2 cursor-pointer transition-all ${
                selectedTaskId === task.id
                  ? 'border-emerald-500 bg-emerald-50'
                  : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
              }`}
            >
              {/* 顶部：优先级 + 来源标签 */}
              <div className="flex items-center justify-between mb-2">
                <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[task.priority]}`}>
                  {PRIORITY_ICONS[task.priority]}
                  {task.priority === 'urgent' ? '紧急' : task.priority === 'high' ? '高' : task.priority === 'normal' ? '中' : '低'}
                </span>
                <span className={`px-2 py-0.5 rounded text-xs font-medium ${SOURCE_LABELS[task.source].color}`}>
                  {SOURCE_LABELS[task.source].label}
                </span>
              </div>

              {/* 任务编号和标题 */}
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs text-gray-400">{task.taskCode}</span>
              </div>
              <div className="font-medium text-gray-900 text-sm mb-1 line-clamp-1">
                {task.title}
              </div>

              {/* 工作区域和工时 */}
              <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" />
                  {task.workZone || task.greenhouse || '-'}
                </span>
                <span className="flex items-center gap-1">
                  <Clock className="w-3 h-3" />
                  {task.estimatedHours}h
                </span>
              </div>

              {/* 所需技能标签 */}
              {task.requiredSkills.length > 0 && (
                <div className="flex flex-wrap gap-1">
                  {task.requiredSkills.slice(0, 3).map(skill => (
                    <span
                      key={skill}
                      className="px-1.5 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200"
                    >
                      {skill}
                    </span>
                  ))}
                  {task.requiredSkills.length > 3 && (
                    <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                      +{task.requiredSkills.length - 3}
                    </span>
                  )}
                </div>
              )}
            </div>
          ))
        )}
      </div>
    </div>
  );
};

export default DispatchTaskPool;
