/**
 * 优化建议弹窗组件
 * 显示当前选择执行人和AI建议执行人的对比
 * 支持"接受AI建议"和"保持原选择"两个按钮
 */

import React from 'react';
import { Sparkles, UserCheck, X, ArrowRight, CheckCircle2, AlertTriangle, TrendingUp } from 'lucide-react';
import type { AIOptimizationSuggestion } from '../../types/dispatch';
import { DraggableDialog } from '../DraggableDialog';
import { Button } from '@/components/ui';

 /** 优化建议弹窗组件Props */
export interface OptimizationSuggestionModalProps {
  /** 是否显示弹窗 */
  isOpen: boolean;
  /** 关闭弹窗回调 */
  onClose: () => void;
  /** 优化建议数据 */
  suggestion: AIOptimizationSuggestion | null;
  /** 接受优化建议回调 */
  onAccept: () => void;
  /** 拒绝优化建议回调 */
  onReject: () => void;
  /** 当前执行人评分 */
  currentWorkerScore?: number;
  /** AI建议执行人评分 */
  suggestedWorkerScore?: number;
}

/**
 * 优化建议弹窗组件
 */
export const OptimizationSuggestionModal: React.FC<OptimizationSuggestionModalProps> = ({
  isOpen,
  onClose,
  suggestion,
  onAccept,
  onReject,
  currentWorkerScore = 0,
  suggestedWorkerScore = 0,
}) => {
  // 如果弹窗不显示或没有建议数据，不渲染
  if (!isOpen || !suggestion) {
    return null;
  }

  // 计算分数提升百分比
  const scoreImprovement = suggestion.originalScore > 0
    ? Math.round((suggestion.scoreDiff / suggestion.originalScore) * 100)
    : 0;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-xl shadow-xl w-[480px] max-h-[90vh] overflow-hidden">
        {/* 标题栏 */}
        <div className="px-6 py-4 bg-gradient-to-r from-purple-500 to-indigo-600 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-white/20 flex items-center justify-center">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-white">AI优化建议</h2>
              <p className="text-xs text-white/80">智能派工系统检测到更优执行方案</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1 rounded hover:bg-white/20 transition-colors"
          >
            <X className="w-5 h-5 text-white" />
          </button>
        </div>

        {/* 内容区域 */}
        <div className="p-6 space-y-4">
          {/* 任务信息 */}
          <div className="bg-gray-50 rounded-lg p-3">
            <p className="text-sm text-gray-600">任务ID</p>
            <p className="text-sm font-medium text-gray-900">{suggestion.taskId}</p>
          </div>

          {/* 执行人对比 */}
          <div className="space-y-3">
            <h3 className="text-sm font-medium text-gray-700 flex items-center gap-2">
              <TrendingUp className="w-4 h-4 text-purple-500" />
              执行人对比
            </h3>

            {/* 原执行人 */}
            <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="w-10 h-10 rounded-full bg-gray-300 flex items-center justify-center">
                <span className="text-sm font-medium text-gray-600">
                  {suggestion.originalWorkerName.charAt(0)}
                </span>
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{suggestion.originalWorkerName}</span>
                  <span className="text-xs text-gray-500 bg-gray-200 px-1.5 py-0.5 rounded">当前选择</span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">评分</span>
                  <span className="text-sm font-medium text-gray-700">{suggestion.originalScore}分</span>
                </div>
              </div>
            </div>

            {/* 箭头指示 */}
            <div className="flex justify-center">
              <ArrowRight className="w-5 h-5 text-purple-500" />
            </div>

            {/* AI建议执行人 */}
            <div className="flex items-center gap-3 p-3 rounded-lg border-2 border-emerald-500 bg-emerald-50">
              <div className="w-10 h-10 rounded-full bg-emerald-500 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-white" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <span className="font-medium text-gray-900">{suggestion.suggestedWorkerName}</span>
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded flex items-center gap-1">
                    <Sparkles className="w-3 h-3" />
                    AI推荐
                  </span>
                </div>
                <div className="flex items-center gap-2 mt-1">
                  <span className="text-xs text-gray-500">评分</span>
                  <span className="text-sm font-medium text-emerald-600">{suggestion.suggestedScore}分</span>
                  <span className="text-xs text-emerald-600 bg-emerald-100 px-1.5 py-0.5 rounded">
                    +{suggestion.scoreDiff}分
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* 置信度与理由 */}
          <div className="space-y-2">
            {/* 置信度 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-purple-50 border border-purple-100">
              <div className="flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 text-purple-500" />
                <span className="text-sm text-purple-700">AI置信度</span>
              </div>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 bg-purple-200 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-purple-500 rounded-full transition-all"
                    style={{ width: `${suggestion.confidenceScore}%` }}
                  />
                </div>
                <span className="text-sm font-medium text-purple-700">{suggestion.confidenceScore}%</span>
              </div>
            </div>

            {/* 分数提升 */}
            <div className="flex items-center justify-between p-3 rounded-lg bg-emerald-50 border border-emerald-100">
              <div className="flex items-center gap-2">
                <TrendingUp className="w-4 h-4 text-emerald-500" />
                <span className="text-sm text-emerald-700">预计提升</span>
              </div>
              <span className="text-sm font-medium text-emerald-700">
                {scoreImprovement > 0 ? `+${scoreImprovement}%` : '+0%'}
              </span>
            </div>

            {/* 优化理由 */}
            <div className="p-3 rounded-lg bg-blue-50 border border-blue-100">
              <div className="flex items-center gap-2 mb-2">
                <AlertTriangle className="w-4 h-4 text-blue-500" />
                <span className="text-sm font-medium text-blue-700">优化理由</span>
              </div>
              <p className="text-sm text-blue-600">{suggestion.reason}</p>
            </div>
          </div>
        </div>

        {/* 操作按钮 */}
        <div className="px-6 py-4 bg-gray-50 border-t border-gray-200 flex items-center gap-3">
          <Button variant="secondary" size="sm" onClick={onReject} className="flex-1 h-10">
            <X className="w-4 h-4" />
            保持原选择
          </Button>
          <Button variant="purple" size="sm" onClick={onAccept} className="flex-1 h-10">
            <Sparkles className="w-4 h-4" />
            接受AI建议
          </Button>
        </div>
      </div>
    </div>
  );
};

export default OptimizationSuggestionModal;
