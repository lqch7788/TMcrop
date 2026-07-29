/**
 * AI推荐面板组件
 * 显示AI推荐结果列表（Top3），支持重新推荐和手动选择
 * 默认选中第一名
 */

import React, { useState, useEffect, useMemo } from 'react';
import { Sparkles, MapPin, Zap, RefreshCw, UserPlus, CheckCircle2, AlertTriangle, AlertCircle, ChevronDown, ChevronRight } from 'lucide-react';
import type { AIRecommendConfig, UnifiedTaskInput } from '../../types/dispatch';
import type { WorkerRecommendation } from '../../hooks/useComprehensiveDispatch';
import { DEFAULT_AI_RECOMMEND_CONFIG } from '../../types/dispatch';
import { Button } from '@/components/ui';

 /** AI推荐面板组件Props */
export interface AIRecommendationPanelProps {
  /** 任务信息 */
  taskInfo: Partial<UnifiedTaskInput>;
  /** 推荐结果列表 */
  recommendations: WorkerRecommendation[];
  /** 选中执行人回调 */
  onWorkerSelect: (workerId: string, score: number) => void;
  /** 重新推荐回调 */
  onReRecommend?: () => void;
  /** 手动选择回调 */
  onManualSelect?: () => void;
  /** AI推荐配置 */
  config?: AIRecommendConfig;
  /** 当前选中的执行人ID */
  selectedWorkerId?: string;
}

/** 优先级颜色映射 */
const PRIORITY_COLORS: Record<string, string> = {
  urgent: 'bg-red-100 text-red-700',
  high: 'bg-amber-100 text-amber-700',
  normal: 'bg-blue-100 text-blue-700',
  low: 'bg-gray-100 text-gray-700',
};

/**
 * AI推荐面板组件
 */
export const AIRecommendationPanel: React.FC<AIRecommendationPanelProps> = ({
  taskInfo,
  recommendations,
  onWorkerSelect,
  onReRecommend,
  onManualSelect,
  config = DEFAULT_AI_RECOMMEND_CONFIG,
  selectedWorkerId,
}) => {
  // 本地选中状态
  const [localSelectedWorkerId, setLocalSelectedWorkerId] = useState<string | null>(null);

  // 展开状态
  const [expandedReasons, setExpandedReasons] = useState<Set<string>>(new Set());

  // 根据配置决定是否默认选中Top1
  useEffect(() => {
    if (config.defaultSelectTop && recommendations.length > 0 && !localSelectedWorkerId && !selectedWorkerId) {
      const topWorker = recommendations[0];
      setLocalSelectedWorkerId(topWorker.worker.id);
      onWorkerSelect(topWorker.worker.id, topWorker.matchScore);
    }
  }, [config.defaultSelectTop, recommendations, localSelectedWorkerId, selectedWorkerId, onWorkerSelect]);

  // 处理选中执行人
  const handleSelectWorker = (worker: WorkerRecommendation) => {
    setLocalSelectedWorkerId(worker.worker.id);
    onWorkerSelect(worker.worker.id, worker.matchScore);
  };

  // 切换理由展开状态
  const toggleReasonsExpand = (workerId: string) => {
    setExpandedReasons(prev => {
      const newSet = new Set(prev);
      if (newSet.has(workerId)) {
        newSet.delete(workerId);
      } else {
        newSet.add(workerId);
      }
      return newSet;
    });
  };

  // 渲染单个推荐项
  const renderRecommendationItem = (rec: WorkerRecommendation, index: number) => {
    const isSelected = (localSelectedWorkerId || selectedWorkerId) === rec.worker.id;
    const isTop1 = index === 0;
    const isExpanded = expandedReasons.has(rec.worker.id);

    return (
      <div
        key={rec.worker.id}
        className={`rounded-lg border-2 transition-all cursor-pointer overflow-hidden ${
          isSelected
            ? 'border-blue-500 bg-blue-50 ring-2 ring-blue-200'
            : isTop1
            ? 'border-emerald-500 bg-emerald-50 hover:border-emerald-600'
            : 'border-gray-200 hover:border-gray-400'
        }`}
        onClick={() => handleSelectWorker(rec)}
      >
        {/* ★ Batch 4 B4.1：排班警告条（off_duty / no_schedule） */}
        {rec.scheduleStatus === 'off_duty' && (
          <div className="px-3 py-2 bg-red-50 border-b border-red-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-red-500 flex-shrink-0" />
            <span className="text-xs text-red-700">
              该员工今日未排班，确认派发将占用额外劳动力资源
            </span>
          </div>
        )}
        {rec.scheduleStatus === 'no_schedule' && (
          <div className="px-3 py-2 bg-amber-50 border-b border-amber-200 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-amber-500 flex-shrink-0" />
            <span className="text-xs text-amber-700">该员工无排班记录</span>
          </div>
        )}

        <div className="p-3">
        {/* 头部：排名、名字、分数 */}
        <div className="flex items-center justify-between mb-2">
          <div className="flex items-center gap-2">
            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
              isTop1 ? 'bg-emerald-500 text-white' : 'bg-gray-200 text-gray-600'
            }`}>
              {index + 1}
            </span>
            <span className="font-medium text-gray-900">{rec.worker.name}</span>
            {isSelected && <CheckCircle2 className="w-4 h-4 text-blue-500" />}
          </div>
          <div className="flex items-center gap-2">
            <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${
              rec.confidenceLevel === 'high' ? 'bg-green-100 text-green-700' :
              rec.confidenceLevel === 'medium' ? 'bg-yellow-100 text-yellow-700' :
              'bg-gray-100 text-gray-600'
            }`}>
              {rec.confidenceLevel === 'high' ? '高置信' :
               rec.confidenceLevel === 'medium' ? '中置信' : '低置信'}
            </span>
            <span className="text-sm font-bold text-emerald-600">{rec.matchScore}分</span>
          </div>
        </div>

        {/* 基本信息 */}
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-2">
          <span>{rec.worker.workerType}</span>
          <span>|</span>
          <span className="flex items-center gap-1">
            <MapPin className="w-3 h-3" />
            {rec.worker.workZone}
          </span>
          <span>|</span>
          <span>负荷{rec.worker.currentLoad}%</span>
          <span>|</span>
          <span>剩余{Math.round(rec.worker.availableHoursToday)}小时</span>
        </div>

        {/* 推荐理由 - 正面 */}
        {rec.reasonsDetail.positive.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {rec.reasonsDetail.positive.map((reason, i) => (
              <span key={`pos-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-green-50 text-green-700 border border-green-200 flex items-center gap-1">
                <Sparkles className="w-3 h-3" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* 推荐理由 - 警告 */}
        {rec.reasonsDetail.warning.length > 0 && (
          <div className="flex flex-wrap gap-1 mb-2">
            {rec.reasonsDetail.warning.map((reason, i) => (
              <span key={`warn-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-amber-50 text-amber-700 border border-amber-200 flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* 技能匹配详情 - 可折叠 */}
        {rec.worker.skills && rec.worker.skills.length > 0 && (
          <div className="mb-2">
            <button
              onClick={(e) => {
                e.stopPropagation();
                toggleReasonsExpand(rec.worker.id);
              }}
              className="flex items-center gap-1 text-xs text-gray-500 hover:text-gray-700"
            >
              {isExpanded ? <ChevronDown className="w-3 h-3" /> : <ChevronRight className="w-3 h-3" />}
              技能标签
            </button>
            {isExpanded && (
              <div className="flex flex-wrap gap-1 mt-1 pl-4">
                {rec.worker.skills.map((skill, i) => (
                  <span key={`skill-${i}`} className="px-1.5 py-0.5 rounded text-xs bg-gray-100 text-gray-600">
                    {skill}
                  </span>
                ))}
              </div>
            )}
          </div>
        )}

        {/* 建议动作 */}
        <div className="text-xs">
          <span className={`px-2 py-0.5 rounded font-medium ${
            rec.suggestedAction === 'dispatch' ? 'bg-emerald-100 text-emerald-700' :
            rec.suggestedAction === 'manual' ? 'bg-yellow-100 text-yellow-700' :
            rec.suggestedAction === 'split' ? 'bg-blue-100 text-blue-700' :
            'bg-gray-100 text-gray-700'
          }`}>
            {rec.suggestedAction === 'dispatch' ? '✓ 可直接派发' :
             rec.suggestedAction === 'manual' ? '⚠ 需人工确认' :
             rec.suggestedAction === 'split' ? '○ 建议拆分' : '○ 建议延后'}
          </span>
        </div>
        </div>
      </div>
    );
  };

  // 任务信息为空时显示空状态
  if (!taskInfo.id) {
    return (
      <div className="bg-white rounded-lg border border-gray-200">
        <div className="px-4 py-3 border-b border-gray-200">
          <h3 className="font-semibold text-gray-900">智能推荐</h3>
        </div>
        <div className="p-6 flex flex-col items-center justify-center text-gray-500">
          <Sparkles className="w-12 h-12 mb-3 text-gray-300" />
          <p>请选择任务</p>
          <p className="text-xs text-gray-400 mt-1">系统将自动生成推荐</p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border border-gray-200">
      {/* 标题栏 */}
      <div className="px-4 py-3 border-b border-gray-200 flex items-center justify-between">
        <div>
          <h3 className="font-semibold text-gray-900">智能推荐</h3>
          {taskInfo.title && (
            <p className="text-xs text-gray-500 mt-1">
              为 <span className="font-medium">{taskInfo.title}</span> 推荐的员工
            </p>
          )}
        </div>
        <div className="flex items-center gap-2">
          {/* 重新推荐按钮 */}
          {config.enableReRecommend && onReRecommend && (
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              onReRecommend();
            }} className="text-purple-600 hover:bg-purple-50" title="重新推荐">
              <RefreshCw className="w-4 h-4" />
              重新推荐
            </Button>
          )}
          {/* 手动选择按钮 */}
          {config.enableManualSelect && onManualSelect && (
            <Button variant="ghost" size="sm" onClick={(e) => {
              e.stopPropagation();
              onManualSelect();
            }} className="text-blue-600 hover:bg-blue-50" title="手动选择">
              <UserPlus className="w-4 h-4" />
              手动选择
            </Button>
          )}
        </div>
      </div>

      {/* 任务基本信息 */}
      {taskInfo.id && (
        <div className="px-4 py-2 bg-gray-50 border-b border-gray-200">
          <div className="flex items-center gap-3 text-xs text-gray-600">
            {taskInfo.taskCode && <span>编号：{taskInfo.taskCode}</span>}
            {taskInfo.typeName && <span>|</span>}
            {taskInfo.typeName && <span>{taskInfo.typeName}</span>}
            {taskInfo.priority && (
              <>
                <span>|</span>
                <span className={`px-1.5 py-0.5 rounded text-xs font-medium ${PRIORITY_COLORS[taskInfo.priority]}`}>
                  {taskInfo.priority === 'urgent' ? '紧急' :
                   taskInfo.priority === 'high' ? '高' :
                   taskInfo.priority === 'normal' ? '中' : '低'}
                </span>
              </>
            )}
            {taskInfo.workZone && (
              <>
                <span>|</span>
                <span>{taskInfo.workZone}</span>
              </>
            )}
          </div>
        </div>
      )}

      {/* 推荐列表 */}
      <div className="p-3 max-h-96 overflow-y-auto">
        {recommendations.length > 0 ? (
          <div className="space-y-2">
            {recommendations.slice(0, config.showTopN).map((rec, index) => (
              renderRecommendationItem(rec, index)
            ))}
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-12 text-gray-500">
            <AlertTriangle className="w-12 h-12 mb-3 text-gray-300" />
            <p>暂无可用员工</p>
            <p className="text-xs text-gray-400 mt-1">请检查任务配置或等待员工可用</p>
          </div>
        )}
      </div>

      {/* 底部提示 */}
      {recommendations.length > 0 && (
        <div className="px-4 py-2 border-t border-gray-200 bg-gray-50">
          <p className="text-xs text-gray-500 flex items-center gap-1">
            <Zap className="w-3 h-3 text-purple-500" />
            AI综合评分 · 技能匹配 · 地理位置 · 历史表现
          </p>
        </div>
      )}
    </div>
  );
};

export default AIRecommendationPanel;
