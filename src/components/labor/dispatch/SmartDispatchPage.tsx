import React, { useState } from 'react';
import { Sparkles, MapPin, Clock, AlertTriangle, CheckCircle2, Zap } from 'lucide-react';
import { useSmartDispatch } from './hooks/useSmartDispatch';
import { WorkerMatchList } from './WorkerMatchList';
import { DispatchRecommend } from './DispatchRecommend';
import type { DispatchTask } from './types';
import { DISPATCH_WEIGHTS } from './types';

export const SmartDispatchPage: React.FC = () => {
  const {
    tasks,
    selectedTask,
    recommendations,
    filters,
    updateFilters,
    selectTask,
  } = useSmartDispatch();

  const [showDetails, setShowDetails] = useState(false);

  // 优先级颜色
  const priorityColors: Record<DispatchTask['priority'], string> = {
    '紧急': 'bg-red-100 text-red-700',
    '高': 'bg-amber-100 text-amber-700',
    '中': 'bg-blue-100 text-blue-700',
    '低': 'bg-gray-100 text-gray-700',
  };

  // 优先级图标
  const priorityIcons: Record<DispatchTask['priority'], React.ReactNode> = {
    '紧急': <Zap className="w-4 h-4" />,
    '高': <AlertTriangle className="w-4 h-4" />,
    '中': <Clock className="w-4 h-4" />,
    '低': <Clock className="w-4 h-4" />,
  };

  return (
    <div className="space-y-4">
      {/* 页面标题 */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">智能派工建议</h1>
          <p className="text-sm text-gray-500 mt-1">基于技能、位置、负荷的智能推荐算法</p>
        </div>
      </div>

      {/* 决策因素说明 */}
      <div className="bg-gradient-to-r from-emerald-50 to-blue-50 p-4 rounded-lg border border-emerald-200">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="w-5 h-5 text-emerald-600" />
          <span className="font-semibold text-gray-900">派工决策因素与权重</span>
        </div>
        <div className="grid grid-cols-5 gap-4">
          <div className="text-center">
            <div className="text-2xl font-bold text-emerald-600">{DISPATCH_WEIGHTS.skillMatch * 100}%</div>
            <div className="text-xs text-gray-600 mt-1">技能匹配度</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-blue-600">{DISPATCH_WEIGHTS.location * 100}%</div>
            <div className="text-xs text-gray-600 mt-1">地理位置</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-amber-600">{DISPATCH_WEIGHTS.currentLoad * 100}%</div>
            <div className="text-xs text-gray-600 mt-1">当前负荷</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-purple-600">{DISPATCH_WEIGHTS.historicalPerformance * 100}%</div>
            <div className="text-xs text-gray-600 mt-1">历史表现</div>
          </div>
          <div className="text-center">
            <div className="text-2xl font-bold text-red-600">{DISPATCH_WEIGHTS.urgency * 100}%</div>
            <div className="text-xs text-gray-600 mt-1">紧急程度</div>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-4">
        {/* 左侧：待派工任务列表 */}
        <div className="col-span-1 space-y-3">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">待派工任务</h3>
            </div>
            <div className="p-2 max-h-96 overflow-y-auto">
              {tasks.map((task) => (
                <div
                  key={task.id}
                  onClick={() => selectTask(task)}
                  className={`p-3 mb-2 rounded-lg border-2 cursor-pointer transition-all ${
                    selectedTask?.id === task.id
                      ? 'border-emerald-500 bg-emerald-50'
                      : 'border-gray-200 hover:border-gray-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex items-center justify-between mb-2">
                    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${priorityColors[task.priority]}`}>
                      {priorityIcons[task.priority]}
                      {task.priority}
                    </span>
                    <span className="text-xs text-gray-400">{task.taskCode}</span>
                  </div>
                  <div className="font-medium text-gray-900 text-sm mb-1">{task.taskName}</div>
                  <div className="flex items-center gap-3 text-xs text-gray-500">
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {task.workZone}
                    </span>
                    <span className="flex items-center gap-1">
                      <Clock className="w-3 h-3" />
                      {task.estimatedHours}h
                    </span>
                  </div>
                  <div className="flex flex-wrap gap-1 mt-2">
                    {task.requiredSkills.slice(0, 3).map((skill) => (
                      <span key={skill} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        {skill}
                      </span>
                    ))}
                    {task.requiredSkills.length > 3 && (
                      <span className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                        +{task.requiredSkills.length - 3}
                      </span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* 中间：推荐结果 */}
        <div className="col-span-1 space-y-3">
          <div className="bg-white rounded-lg border border-gray-200">
            <div className="px-4 py-3 border-b border-gray-200">
              <h3 className="font-semibold text-gray-900">智能推荐</h3>
              {selectedTask && (
                <p className="text-xs text-gray-500 mt-1">
                  为 <span className="font-medium">{selectedTask.taskName}</span> 推荐的员工
                </p>
              )}
            </div>
            <div className="p-3 max-h-96 overflow-y-auto">
              {!selectedTask ? (
                <div className="flex flex-col items-center justify-center py-12 text-gray-500">
                  <CheckCircle2 className="w-12 h-12 mb-3 text-gray-300" />
                  <p>请选择左侧任务</p>
                  <p className="text-xs text-gray-400 mt-1">系统将自动生成推荐</p>
                </div>
              ) : recommendations ? (
                <WorkerMatchList recommendations={recommendations.recommendations} />
              ) : null}
            </div>
          </div>
        </div>

        {/* 右侧：任务详情与推荐理由 */}
        <div className="col-span-1 space-y-3">
          {/* 任务详情 */}
          {selectedTask && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">任务详情</h3>
              </div>
              <div className="p-4 space-y-3">
                <DetailItem label="任务编号" value={selectedTask.taskCode} />
                <DetailItem label="任务名称" value={selectedTask.taskName} />
                <DetailItem label="任务类型" value={selectedTask.taskType} />
                <div className="flex items-center justify-between">
                  <span className="text-sm text-gray-500">优先级</span>
                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium ${priorityColors[selectedTask.priority]}`}>
                    {priorityIcons[selectedTask.priority]}
                    {selectedTask.priority}
                  </span>
                </div>
                <DetailItem label="工作区域" value={selectedTask.workZone} />
                <DetailItem label="预计工时" value={`${selectedTask.estimatedHours}小时`} />
                <DetailItem label="截止日期" value={selectedTask.dueDate} />
                {selectedTask.description && (
                  <DetailItem label="任务描述" value={selectedTask.description} />
                )}
                <div>
                  <span className="text-sm text-gray-500">所需技能</span>
                  <div className="flex flex-wrap gap-1 mt-1">
                    {selectedTask.requiredSkills.map((skill) => (
                      <span key={skill} className="px-2 py-0.5 rounded text-xs bg-blue-50 text-blue-700 border border-blue-200">
                        {skill}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* 推荐理由说明 */}
          {recommendations && recommendations.recommendations.length > 0 && (
            <div className="bg-white rounded-lg border border-gray-200">
              <div className="px-4 py-3 border-b border-gray-200">
                <h3 className="font-semibold text-gray-900">推荐理由说明</h3>
              </div>
              <div className="p-4 space-y-3">
                <div className="flex items-start gap-2">
                  <CheckCircle2 className="w-5 h-5 text-emerald-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">技能匹配度 (30%)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      根据任务所需技能与员工持有技能的匹配程度计算，匹配度越高分数越高
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <MapPin className="w-5 h-5 text-blue-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">地理位置 (25%)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      根据员工当前位置与任务工作区域的距离计算，距离越近分数越高
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Zap className="w-5 h-5 text-amber-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">当前负荷 (20%)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      根据员工当前任务负荷情况计算，负荷越低分数越高
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <Sparkles className="w-5 h-5 text-purple-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">历史表现 (15%)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      根据员工近30天的任务完成情况、考勤记录等综合评分
                    </div>
                  </div>
                </div>
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-5 h-5 text-red-500 mt-0.5" />
                  <div>
                    <div className="font-medium text-gray-900">紧急程度 (10%)</div>
                    <div className="text-xs text-gray-500 mt-0.5">
                      根据任务优先级计算，紧急任务会优先分配给效率高的员工
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// 详情项组件
const DetailItem: React.FC<{ label: string; value: string }> = ({ label, value }) => (
  <div className="flex justify-between text-sm">
    <span className="text-gray-500">{label}</span>
    <span className="text-gray-900 font-medium">{value}</span>
  </div>
);

export default SmartDispatchPage;
